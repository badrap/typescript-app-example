import * as v from "@badrap/valita";

export type State = v.Infer<typeof State>;
export const State = v.object({
  domains: v.array(v.string()).optional(() => []),
});
