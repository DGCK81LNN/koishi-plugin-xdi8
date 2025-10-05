import { Argv, h } from "koishi"
import type { Alternation } from "xdi8-transcriber"

export const ahoFixes: Record<string, string[]> = {
  aho: ["纟火", "糹火"],
}
/**
 * Some entries have hanzi froms that include PUA characters which will not display in
 * plain-text environments. Thus, when such characters are transcribed to hanzi, we only
 * show the "preferred" hanzi forms -- unless the `all` flag is set, in which case they
 * are moved to the end of the alternation array instead.
 */
export function doAhoFix(seg: Alternation[]): [good: Alternation[], bad: Alternation[]] {
  const good: Alternation[] = []
  const bad: Alternation[] = []
  for (const alt of seg) {
    const isBad = alt.content.some(
      seg => Object.hasOwn(ahoFixes, seg.x) && !ahoFixes[seg.x].includes(seg.v)
    )
    ;(isBad ? bad : good).push(alt)
  }
  return [good, bad]
}

export function isSlash(argv: Argv): boolean {
  return argv.session.event.type === "interaction/command"
}
