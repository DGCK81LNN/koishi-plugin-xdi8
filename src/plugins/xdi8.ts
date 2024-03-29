import { Context, Schema, Session, h } from "koishi"
import type { Alternation, TranscribeResult } from "xdi8-transcriber"
import { getHx, getXh } from "../transcriber-manager"
import { ahoFixes, tryRestoreRawText } from "../utils"

export const name = "xdi8"

export interface Config {
  footnotesInSeparateMessage: boolean
}

export const Config: Schema<Config> = Schema.object({
  footnotesInSeparateMessage: Schema.boolean()
    .description("是否将结果正文与脚注分成两条消息发送。")
    .default(true),
})

function supNum(n: number) {
  return Array.from(String(0 | n), (d: `${number}`) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]).join("")
}

export function apply(ctx: Context, config: Config) {
  function stringifyResult<T extends "h" | "x">(
    session: Session,
    result: TranscribeResult,
    sourceType: T,
    { all = false }
  ) {
    const showLegacy = result.length === 1 || all
    const showExceptional = result.length === 1 || all || sourceType === "h"
    result = result
      .flatMap(seg => {
        if (Array.isArray(seg)) {
          if (!all) {
            seg = seg.filter(alt => {
              if (!showLegacy && alt.legacy) return false
              if (!showExceptional && alt.exceptional) return false
              // aho fix when `all` flag is set: only keep preferred forms
              if (
                sourceType === "x" &&
                alt.content.some(
                  seg =>
                    Object.hasOwn(ahoFixes, seg.x) && !ahoFixes[seg.x].includes(seg.v)
                )
              )
                return false
              return true
            })
          } else if (
            sourceType === "x" &&
            seg.some(alt => alt.content.some(seg => Object.hasOwn(ahoFixes, seg.x)))
          ) {
            // aho fix when `all` flag is not set: move non-preferred forms to bottom
            const good: Alternation[] = []
            const bad: Alternation[] = []
            for (const alt of seg) {
              const isBad = alt.content.some(
                seg => Object.hasOwn(ahoFixes, seg.x) && !ahoFixes[seg.x].includes(seg.v)
              )
              ;(isBad ? bad : good).push(alt)
            }
            seg = good.concat(bad)
          }
          if (seg.length === 1) return seg[0].content
        }
        return [seg]
      })
      .map(seg => {
        if (!Array.isArray(seg) && typeof seg === "object" && seg.legacy)
          return [{ content: [seg], note: "旧拼写", exceptional: true, legacy: true }]
        return seg
      })

    const single = result.length === 1 && Array.isArray(result[0])

    const alts: (Alternation[] & { $: string })[] = []
    const text = result
      .map(seg => {
        if (typeof seg === "string") return seg
        if (Array.isArray(seg)) {
          const j = JSON.stringify(seg)
          let index = alts.findIndex(s => s.$ === j)
          if (index === -1) {
            index = alts.length
            alts.push(Object.assign(seg, { $: j }))
          }
          return seg[0].content.map(seg => seg.v).join("") + supNum(index + 1)
        }
        return seg.v
      })
      .join("")

    const footnotes = alts.map(seg => {
      const source = seg[0].content.map(seg => seg[sourceType]).join("")
      const alts = seg.map(alt => {
        let line = alt.content.map(seg => seg.v).join("")
        if (alt.note)
          line += session.text("general.paren", [alt.note.replace(/\n/g, "；")])
        return line
      })
      return `${source}:\n${alts.join("\n")}`
    })

    if (single && footnotes.length === 1) return h.escape(footnotes[0])

    return [text, footnotes.map((fn, i) => `[${i + 1}] ${fn}`).join("\n")]
      .map(s => h.escape(s))
      .filter(Boolean)
      .join(config.footnotesInSeparateMessage ? "<message />" : "\n")
  }

  function getResultScore(result: TranscribeResult) {
    if (!result) return 0
    return result.reduce(
      (score, seg) =>
        score + (Array.isArray(seg) ? seg[0].content.length : +(typeof seg === "object")),
      0
    )
  }

  const cmdXdi8 = ctx.command("xdi8 <text:text>", {
    checkArgCount: true,
    checkUnknown: true,
    showWarning: true,
  })
  cmdXdi8.option("all", "-a").action(({ options, session, source }, text) => {
    if (source) text = tryRestoreRawText(text, source, true)
    text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "")

    const hxResult = getHx().transcribe(text, { ziSeparator: " " })
    const hxScore = getResultScore(hxResult)
    const xhResult = getXh().transcribe(text, { alphaFilter: null })
    const xhScore = getResultScore(xhResult)

    if (!hxScore && !xhScore) return session.text(".no-result")

    if (hxScore > xhScore) return stringifyResult(session, hxResult, "h", options)

    const xhResultCompact = xhResult.filter(seg => seg !== " ")
    return stringifyResult(session, xhResultCompact, "x", options)
  })
}
