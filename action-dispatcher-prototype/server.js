import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { randomUUID } from 'crypto';
import { Feed, PostCard } from './tags.js';

const registry = { PostCard, Feed };
const clientMeta = {
  PostCard: { actions: PostCard.__meta.actions },
  Feed: { actions: Feed.__meta.actions }
};

// ==========================================
// 2. GENERIC SERVER-SIDE RENDERER
// ==========================================

function renderHtml(instance) {
  const ref = randomUUID();
  const compName = instance.constructor.name;
  
  // Capture serializable state
  const state = {};
  for (let k of Object.keys(instance)) {
    if (typeof instance[k] !== 'function') state[k] = instance[k];
  }

  // Capture prop mappings (function name only)
  const propsMeta = {};
  for (let k of Object.keys(instance)) {
    if (typeof instance[k] === 'function') {
      propsMeta[k] = instance[k].name; // e.g., 'registerLike'
    }
  }

  const tree = instance.render();
  let attrs = `data-ref="${ref}" data-component="${compName}"`;
  attrs += ` data-state='${JSON.stringify(state)}'`;
  if (Object.keys(propsMeta).length > 0) {
    attrs += ` data-props='${JSON.stringify(propsMeta)}'`;
  }

  let html = `<${tree.tag} ${attrs}`;
  if (tree.style) html += ` style="${tree.style}"`;
  html += `>`;

  for (let child of tree.children) {
    if (typeof child === 'string') {
      html += child;
    } else if (typeof child.tag === 'function') {
      html += renderHtml(new child.tag(child.props));
    } else {
      let cAttrs = '';
      if (child.onClick) cAttrs += ` data-action="${child.onClick}"`;
      if (child.bind) cAttrs += ` data-bind="${child.bind}"`;
      if (child.style) cAttrs += ` style="${child.style}"`;
      html += `<${child.tag}${cAttrs}>${child.children ? child.children.join('') : ''}</${child.tag}>`;
    }
  }

  return html + `</${tree.tag}>`;
}

// ==========================================
// 3. HONO SERVER & GENERIC RPC ENGINE
// ==========================================

const app = new Hono();

app.get('/', (c) => {
  const html = renderHtml(new Feed());
  
  const clientScript = `
    <script>
      window.__COMPONENTS__ = ${JSON.stringify(clientMeta)};
      
      function readState(el) { return JSON.parse(el.getAttribute('data-state')); }
      function writeState(el, newState) { 
        let current = readState(el);
        current = { ...current, ...newState };
        el.setAttribute('data-state', JSON.stringify(current));
        
        el.querySelectorAll('[data-bind]').forEach(bindEl => {
          const key = bindEl.getAttribute('data-bind');
          if (current[key] !== undefined) {
            // Generic DOM text update
            let suffix = bindEl.getAttribute('data-suffix') || '';
            bindEl.textContent = current[key] + suffix;
          }
        });
      }

      document.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        
        const selfEl = btn.closest('[data-ref]');
        const action = btn.getAttribute('data-action');
        const compName = selfEl.getAttribute('data-component');
        const meta = window.__COMPONENTS__[compName].actions[action];
        
        if (!meta) return console.error('No meta for action:', action);
        
        // 1. Gather reads for self
        const selfState = readState(selfEl);
        const reads = {};
        meta.reads.forEach(k => reads[k] = selfState[k]);
        
        // 2. GENERIC Runtime Tree Tracing for Props
        const context = {};
        if (meta.calls) {
          const props = JSON.parse(selfEl.getAttribute('data-props') || '{}');
          
          for (const propName in meta.calls) {
            const propMethodName = props[propName]; // e.g., 'registerLike'
            if (!propMethodName) continue;
            
            let parentEl = selfEl.parentElement.closest('[data-ref]');
            while(parentEl) {
              const parentComp = parentEl.getAttribute('data-component');
              const parentMeta = window.__COMPONENTS__[parentComp];
              
              if (parentMeta && parentMeta.actions[propMethodName]) {
                const parentState = readState(parentEl);
                const parentReads = {};
                parentMeta.actions[propMethodName].reads.forEach(k => parentReads[k] = parentState[k]);
                
                context[propName] = {
                  component: parentComp,
                  ref: parentEl.getAttribute('data-ref'),
                  action: propMethodName,
                  reads: parentReads
                };
                break;
              }
              parentEl = parentEl.parentElement.closest('[data-ref]');
            }
          }
        }
        
        const res = await fetch('/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action, 
            self: { ref: selfEl.getAttribute('data-ref'), component: compName },
            reads, 
            context
          })
        });
        
        const { writes } = await res.json();
        for (let ref in writes) {
          const el = document.querySelector('[data-ref="' + ref + '"]');
          if (el) writeState(el, writes[ref]);
        }
      });
    </script>
  `;

  return c.html(`
    <!DOCTYPE html><html><head><title>Prototype</title></head><body>
      <div id="app">${html}</div>
      ${clientScript}
    </body></html>
  `);
});

app.post('/rpc', async (c) => {
  const { action, self, reads, context } = await c.req.json();
  const writes = {};

  // 1. GENERIC Reconstruct Parents (Contexts)
  const parentInstances = {};
  if (context) {
    for (const propName in context) {
      const ctxData = context[propName];
      const ParentClass = registry[ctxData.component];
      if (!ParentClass) continue;
      
      const parentInst = new ParentClass({});
      Object.assign(parentInst, ctxData.reads); // Apply state
      
      parentInstances[propName] = {
        instance: parentInst,
        ref: ctxData.ref,
        reads: ctxData.reads,
        action: ctxData.action
      };
    }
  }

  // 2. Reconstruct Self
  const SelfClass = registry[self.component];
  if (!SelfClass) return c.json({ error: "Component not found" }, 400);
  
  // Instantiate self. Props don't matter here, state is overwritten.
  const instance = new SelfClass({});
  Object.assign(instance, reads); 

  // 3. GENERIC Wire up prop calls
  const meta = SelfClass.__meta.actions[action];
  if (meta.calls) {
    for (const propName in meta.calls) {
      const parentData = parentInstances[propName];
      if (parentData) {
        // Bind the parent's real method to the instance prop
        instance[propName] = (...args) => {
          parentData.instance[parentData.action](...args);
        };
      }
    }
  }

  // 4. Execute ACTUAL user method
  instance[action]();

  // 5. GENERIC Extract writes
  const selfWrites = {};
  Object.keys(reads).forEach(k => selfWrites[k] = instance[k]);
  writes[self.ref] = selfWrites;

  for (const propName in parentInstances) {
    const pData = parentInstances[propName];
    const parentWrites = {};
    Object.keys(pData.reads).forEach(k => parentWrites[k] = pData.instance[k]);
    writes[pData.ref] = parentWrites;
  }
  
  return c.json({ writes });
});

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(`Running at http://localhost:${info.port}`);
});