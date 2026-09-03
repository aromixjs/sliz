export type ExtractSelf<T> = T extends { SelfType: infer U } ? U : never
export type ExtractProps<T> = T extends { PropsType: infer U } ? U : never;