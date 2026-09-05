// server.js — runtime for the "compiled output" in compiled.js.
// Run: node server.js → http://localhost:3000
//
// There is exactly one thing this route does per action: look up the
// action by name, call it with the reads/params the client sent, and
// return whatever ops it produced. No component is ever instantiated,
// no render() runs, no tree is walked — for a scalar update this is a
// single object lookup and a pure function call.

import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { readFileSync } from 'node:fs'
import { components, toClientManifest } from './compiled.js'

const app = new Hono()
const template = readFileSync(new URL('./index.html', import.meta.url), 'utf-8')

app.get('/', (c) => {
  let users = [
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Cara' },
    { id: 4, name: 'Dan' },
    { id: 5, name: 'Eve' },
  ]

  let appHtml = `
    <div data-ref="root-counter" data-component="Counter">${components.Counter.render()}</div>
    <hr>
    <div data-ref="root-userlist" data-component="UserList">${components.UserList.render({ users })}</div>
  `

  let manifestScript = `<script>window.__COMPONENTS__ = ${JSON.stringify(toClientManifest())}</script>`

  let page = template
    .replace('<!--MANIFEST-->', manifestScript)
    .replace('<!--APP-->', appHtml)

  return c.html(page)
})

app.post('/action', async (c) => {
  let body = await c.req.json()
  let { component, ref, action, reads, params } = body

  let comp = components[component]
  if (!comp) return c.json({ error: `unknown component "${component}"` }, 404)

  let actionDef = comp.actions[action]
  if (!actionDef) return c.json({ error: `unknown action "${action}" on ${component}` }, 404)

  let result = actionDef.run(reads || {}, params || [])

  // Business logic deals only in semantic ops ({op:'set', key, value} or
  // {op:'remove', ref}); an op with no ref of its own is assumed to apply
  // to the ref that was targeted by this call. That's the only identity
  // plumbing the framework does on the server side.
  let ops = (result.ops || []).map(op => ({ ref, ...op }))

  return c.json({ ops })
})

serve({ fetch: app.fetch, port: Number(process.env.PORT || 3000) }, (info) => {
  console.log(`http://localhost:${info.port}`)
})