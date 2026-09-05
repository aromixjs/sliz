# Tokenizer Benchmark

The benchmark measures how fast `SlizTokenizer` turns `.sliz` source into tokens, compared against htmlparser2's raw `Tokenizer` doing the same job on the same input.

Here is how you run it:

```sh
pnpm bench
```

That runs vitest's benchmark mode against `tests/tokenizer-bench.bench.ts`.

## What the harness does

Each workload is one markup string, tokenized two ways:

- `SlizTokenizer(source).tokenize()` from `@/src`, the real entry point, exactly as a consumer would call it.
- htmlparser2's `Tokenizer` imported directly from `htmlparser2` configured with `{ xmlMode: false, decodeEntities: false, recognizeSelfClosing: true }` and a full set of no-op callbacks.

The htmlparser2 tokenizer is fed with `write(source)` and `end()`. It's the closest comparable unit, its lexer alone, not the parser on top of it, so the comparison is tokenizer-to-tokenizer.

There are three workloads, all generated from the same markup shape (a `<!DOCTYPE html>` document with a nav, a template-literal interpolation, and `{expr}` interpolations sprinkled through attributes and text, the small one being handwritten):

| Workload | Input size                                     |
| -------- | ---------------------------------------------- |
| small    | 440 bytes, handwritten `.sliz` snippet         |
| large    | 2000 generated rows (nav links and list items) |
| huge     | 10000 generated rows                           |

## What the numbers mean

vitest bench reports operations per second (`hz`) and latency percentiles in milliseconds (`min`, `max`, `mean`, `p75`, `p99`). `hz` is the headline number, how many times the whole tokenization of that workload fits into a second, and `mean` is the average wall time of one tokenization. `rme` is the relative margin of error of the measurement; the small workload gets hundreds of thousands of samples and a sub-1% error, the huge one only gets a handful of samples per run and a larger error, so treat its numbers as ballpark.

## Current results

One representative run (Windows, Node v24):

**small markup (440 bytes)**

| tokenizer   | hz      | mean (ms) | p75 (ms) | p99 (ms) | samples |
| ----------- | ------- | --------- | -------- | -------- | ------- |
| sliz        | 29,465  | 0.0339    | 0.0319   | 0.0734   | 14,733  |
| htmlparser2 | 375,387 | 0.0027    | 0.0026   | 0.0050   | 187,694 |

**large markup (2000 rows)**

| tokenizer   | hz     | mean (ms) | p75 (ms) | samples |
| ----------- | ------ | --------- | -------- | ------- |
| sliz        | 64.86  | 15.418    | 15.482   | 33      |
| htmlparser2 | 713.23 | 1.402     | 1.438    | 357     |

**huge markup (10000 rows)**

| tokenizer   | hz     | mean (ms) | p75 (ms) | samples |
| ----------- | ------ | --------- | -------- | ------- |
| sliz        | 13.45  | 74.337    | 78.995   | 10      |
| htmlparser2 | 139.06 | 7.191     | 7.343    | 70      |

## Reading the results

On this run htmlparser2 came out about 12.7x faster on the small workload, 11.0x on large, and 10.3x on huge, so the gap is roughly constant across input sizes. That gap is not a surprise, sliz's tokenizer is built for structure and diagnostics over speed, every character goes through `peek`/`advance` on a `CharacterScanner`, every construct that can fail gets its own token, and every `{expr}` hands off to the TypeScript scanner via `JsInterpolationResolver`, so there's a lot of machinery per byte that htmlparser2 simply doesn't have. The benchmark exists so that gap stays visible and measurable when the tokenizer is optimized; what matters is the trend on the same machine, not the absolute numbers, those drift with hardware and vitest versions anyway.

```ts
tag UserList(user:List){
<li for={u in user}>
{user}
</li>
}
```
