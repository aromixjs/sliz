// compiled.js
//
// HAND-AUTHORED for this prototype — nobody writes this by hand in the real
// system. This is the exact shape a Sliz/.av compile step would emit for a
// component: a bindings table (state key -> where it lives in the DOM) and
// an action table (what each action needs to read, plus the actual logic).
// The runtime below never reconstructs a component instance or a render
// tree to run an action — it just looks a name up in here and calls it.

export const components = {

  // A component with its own local, scalar state. No children.
  Counter: {
    bindings: {
      count: { selector: '[data-bind="count"]', prop: 'textContent' }
    },
    actions: {
      increment: {
        reads: ['count'],
        run(reads) {
          let next = Number(reads.count) + 1
          return { ops: [{ op: 'set', key: 'count', value: String(next) }] }
        }
      },
      reset: {
        reads: [],
        run() {
          return { ops: [{ op: 'set', key: 'count', value: '0' }] }
        }
      }
    },
    render() {
      return `<span data-bind="count">0</span> ` +
             `<button data-action="increment">+1</button> ` +
             `<button data-action="reset">reset</button>`
    }
  },

  // A component with a list of children. Owns the one action that can
  // structurally change the list. Its own scalar binding (userCount)
  // updates alongside the structural change in the same response.
  UserList: {
    bindings: {
      userCount: { selector: '[data-bind="userCount"]', prop: 'textContent' }
    },
    actions: {
      removeUser: {
        reads: ['userCount'],
        run(reads, params) {
          let id = params[0]
          let next = Number(reads.userCount) - 1
          return {
            ops: [
              { op: 'remove', ref: `user-${id}` },
              { op: 'set', key: 'userCount', value: String(next) }
            ]
          }
        }
      }
    },
    render(state) {
      return `Users (<span data-bind="userCount">${state.users.length}</span>)` +
        `<div>${state.users.map(u => components.UserCard.render(u)).join('')}</div>`
    }
  },

  // A purely presentational component: no state, no actions of its own.
  // Its button names an action ("removeUser") that only an ancestor
  // defines — that's the entire cross-component mechanism, no separate
  // "emit" concept needed.
  UserCard: {
    bindings: {},
    actions: {},
    render(u) {
      return `<div data-ref="user-${u.id}" data-component="UserCard"
                   style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid #ddd;margin:6px 0;border-radius:6px">
        <span>${u.id} — ${u.name}</span>
        <button data-action="removeUser" data-param="${u.id}">delete</button>
      </div>`
    }
  }
}

// What the browser is allowed to see: bindings (to locate DOM) and, per
// action, only the *names* of what it reads — never the run() logic.
export function toClientManifest() {
  let out = {}
  for (let [name, comp] of Object.entries(components)) {
    out[name] = {
      bindings: comp.bindings,
      actions: Object.fromEntries(
        Object.entries(comp.actions).map(([action, def]) => [action, { reads: def.reads }])
      )
    }
  }
  return out
}