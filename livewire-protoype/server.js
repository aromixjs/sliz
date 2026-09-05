// server.js — generic View base + Hono transport.
// Snapshots live in <head> meta tags; DOM elements carry wire:id/wire:name markers.
// Nothing below the demo components at the bottom knows a component's name,
// its props, or its methods — swap them for anything and it still works.
// Run: node server.js → http://localhost:3000

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// ─────────────────────────────────────────────────────────────
// VIEW — abstract base, holds all framework logic
// ─────────────────────────────────────────────────────────────

class View {
  #id
  #parent
  #wire

  constructor(props = {}) {
    this.props = props
    this.#id = randomUUID()
    this.#parent = null
    this.#wire = null
  }

  render() { throw new Error(`${this.constructor.name}.render() not implemented`) }

  get wire() {
    if (this.#wire) return this.#wire
    let view = this
    this.#wire = new Proxy(this, {
      get(target, key) {
        if (key in target) {
          let value = target[key]
          if (typeof value === 'function') {
            if (value._actionName) return value
            let fn = (...args) => value.apply(view.wire, args)
            fn._actionName = key
            return fn
          }
          return value
        }
        if (key in target.props) return target.props[key]
      },
      set(target, key, value) { target[key] = value; return true }
    })
    return this.#wire
  }

  _state() {
    let state = {}
    for (let key of Object.keys(this)) {
      if (key === 'props') continue
      if (key in this.props) continue
      let value = this[key]
      if (typeof value === 'function') continue
      state[key] = value
    }
    return state
  }

  // A prop that's a wired action (a `this.method` passed down from a
  // parent's render) can't survive JSON as a function, so it's encoded
  // as a reference to the method name instead of silently dropped.
  // This is what makes cross-component wiring name-agnostic.
  static #serializeProps(props) {
    let out = {}
    for (let [k, v] of Object.entries(props)) {
      out[k] = (typeof v === 'function' && v._actionName)
        ? { __wireAction: v._actionName }
        : v
    }
    return out
  }

  static #resolveProps(props, parent) {
    let out = {}
    for (let [k, v] of Object.entries(props || {})) {
      out[k] = (v && typeof v === 'object' && '__wireAction' in v)
        ? (parent ? parent.wire[v.__wireAction] : undefined)
        : v
    }
    return out
  }

  snapshot() {
    return {
      data: this._state(),
      memo: { id: this.#id, name: this.constructor.name, props: View.#serializeProps(this.props) }
    }
  }

  static fromSnapshot(Definition, snapshot, parent = null) {
    let view = new Definition(View.#resolveProps(snapshot.memo.props, parent))
    view.#id = snapshot.memo.id
    view.#parent = parent
    for (let [k, v] of Object.entries(snapshot.data)) view[k] = v
    return view
  }

  static renderToHtml(node, hostView, snapshots = new Map(), isRoot = true) {
    if (typeof node === 'string') return node

    if (typeof node.tag === 'function' && node.tag.prototype instanceof View) {
      let ChildClass = node.tag
      let childView = new ChildClass(node.props)
      childView.#parent = hostView
      let html = View.renderToHtml(childView.render.call(childView.wire), childView, snapshots, true)
      snapshots.set(childView.#id, childView.snapshot())
      return html
    }

    let { tag, children = [], ...rest } = node
    let htmlAttrs = '', wireAttrs = ''
    for (let [k, v] of Object.entries(rest)) {
      if (k.startsWith('on') && typeof v === 'function') wireAttrs += ` data-wire-${k.slice(2).toLowerCase()}="${v._actionName}"`
      else htmlAttrs += ` ${k}="${v}"`
    }
    if (isRoot) {
      htmlAttrs += ` data-wire-id="${hostView.#id}" data-wire-name="${hostView.constructor.name}"`
      snapshots.set(hostView.#id, hostView.snapshot())
    }
    let inner = children.map(c => typeof c === 'string' ? c : View.renderToHtml(c, hostView, snapshots, false)).join('')
    return `<${tag}${htmlAttrs}${wireAttrs}>${inner}</${tag}>`
  }

  static mount(Definition, props) {
    let view = new Definition(props)
    let snapshots = new Map()
    let html = View.renderToHtml(view.render.call(view.wire), view, snapshots, true)
    return { html, snapshots, view, snap: view.snapshot() }
  }

  // Reconstruct `snapshot` (optionally under `parentSnapshot`), run
  // `calls` against it, and re-render from whichever one is the root
  // of this update. No component name or prop name is special-cased.
  static update({ snapshot, parentSnapshot, calls }) {
    let TargetClass = View.lookup(snapshot.memo.name)
    if (!TargetClass) throw new Error(`unknown component "${snapshot.memo.name}"`)

    let parentView = null
    if (parentSnapshot) {
      let ParentClass = View.lookup(parentSnapshot.memo.name)
      if (!ParentClass) throw new Error(`unknown component "${parentSnapshot.memo.name}"`)
      parentView = View.fromSnapshot(ParentClass, parentSnapshot)
    }

    let targetView = View.fromSnapshot(TargetClass, snapshot, parentView)
    for (let call of calls) {
      if (typeof targetView[call.method] !== 'function') throw new Error(`unknown method "${call.method}" on ${TargetClass.name}`)
      targetView[call.method].apply(targetView.wire, call.params || [])
    }

    // If there's a parent, the call may have mutated it (through a
    // resolved wire-action prop) — re-render from there. Otherwise the
    // target itself is the root of the re-render.
    let rootView = parentView || targetView
    let snapshots = new Map()
    let html = View.renderToHtml(rootView.render.call(rootView.wire), rootView, snapshots, true)
    return { html, snap: rootView.snapshot(), snapshots: Object.fromEntries(snapshots) }
  }

  static registry = new Map()
  static register(c) { View.registry.set(c.name, c) }
  static lookup(n) { return View.registry.get(n) }
}

// ─────────────────────────────────────────────────────────────
// DEMO COMPONENTS — everything below is application code, not
// framework code. Rename these, change their props/methods/markup,
// and nothing above needs to change.
// ─────────────────────────────────────────────────────────────

class UserCard extends View {
  constructor(props) {
    super(props)
    this.onDelete = props.onDelete
    this.userId = props.userId
    this.userName = props.userName
  }
  handleDelete() {
    console.log('date');
    console.log(this.userId);
    this.onDelete(this.userId)
  }
  render() {
    return {
      tag: 'div',
      style: 'display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid #ddd;margin:6px 0;border-radius:6px',
      children: [
        { tag: 'span', children: [`${this.userId} — ${this.userName}`] },
        { tag: 'button', onClick: this.handleDelete, children: ['delete'] }
      ]
    }
  }
}

class UserList extends View {
  users = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Cara' },
    { id: 4, name: 'Dan' },
    { id: 5, name: 'Eve' },
  ]
  remove(userId) {
    this.users = this.users.filter(u => u.id !== userId)
  }
  render() {
    return {
      tag: 'div',
      children: [
        { tag: 'h2', children: [`Users (${this.users.length})`] },
        ...this.users.map(u => ({ tag: UserCard, props: { userId: u.id, userName: u.name, onDelete: this.remove } })),
      ]
    }
  }
}

View.register(UserCard)
View.register(UserList)

// ─────────────────────────────────────────────────────────────
// HTTP — Hono. Only app.get('/') references a specific component;
// /update is entirely generic.
// ─────────────────────────────────────────────────────────────

const app = new Hono()
const template = readFileSync(new URL('./index.html', import.meta.url), 'utf-8')

function escapeAttr(s) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function snapshotsToMeta(snapshots) {
  return Array.from(snapshots.values()).map(snap =>
    `<meta data-wire-snapshot data-id="${snap.memo.id}" data-name="${snap.memo.name}" content="${escapeAttr(JSON.stringify(snap))}">`
  ).join('\n')
}

app.get('/', (c) => {
  let { html, snapshots } = View.mount(UserList)
  let page = template
    .replace('<!--META-->', snapshotsToMeta(snapshots))
    .replace('<!--APP-->', html)
  return c.html(page)
})

app.post('/update', async (c) => {
  try {
    let body = await c.req.json()
    let { html, snap, snapshots } = View.update(body)
    return c.json({ html, snap, snapshots })
  } catch (err) {
    return c.json({ error: String(err) }, 400)
  }
})

app.get('/health', (c) => c.text('ok'))

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(`http://localhost:${info.port}`)
})

process.on('uncaughtException', (e) => console.error('uncaught', e))
process.on('unhandledRejection', (e) => console.error('unhandled', e))