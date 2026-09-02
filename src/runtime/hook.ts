export interface Hook {
  readonly on: "render" | 'Mount';
  readonly run: () => MaybePromise<void>;
}




