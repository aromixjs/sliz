# View Layer Syntax

## Two Blocks

```
<script server>
  // Server only
</script>

<script client>
  // Client only
</script>
```

## Data Flow

Parent passes data:

```
<Child expose={{ data: { todos } }} />
```

Child reads data:

```
let { todos } = $props()
```

## Event Flow

Parent listens:

```
<Child on:add="handleAdd" />
```

Child sends event:

```
$emit('add', { text: 'Buy milk' })
```

## Full Example

```
// Parent
<script server>
  const todos = await ctx.db.findMany('todos')
</script>

<TodoList expose={{ data: { todos } }} on:add="handleAdd" />

<script client>
  function handleAdd(event) {
    todos = [...todos, event.detail]
  }
</script>
```

```
// Child
<script client>
  let { todos } = $props()
  let newTodo = ''
  
  function addTodo() {
    $emit('add', { text: newTodo })
    newTodo = ''
  }
</script>

<input bind:value="newTodo" />
<button on:click="addTodo">Add</button>

{{#each todos as todo}}
  <li>{{ todo.text }}</li>
{{/each}}
```

## API

| API                       | Purpose                |
| ------------------------- | ---------------------- |
| `expose({ data: {...} })` | Pass data to child     |
| `on:event="handler"`      | Listen for child event |
| `$props()`                | Read exposed data      |
| `$emit('name', data)`     | Send event to parent   |
| `$state(initial)`         | Client reactive state  |
| `bind:value`              | Two-way binding        |
| `on:click`                | Event handler          |
