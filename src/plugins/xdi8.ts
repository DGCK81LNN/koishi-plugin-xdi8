import { Context, Schema, Session, h } from "koishi"
import type { Alternation, TranscribeResult } from "xdi8-transcriber"
import type {} from "../service"
import { doAhoFix, stripTags } from "../utils"

export const name = "xdi8"
export const inject = ["xdi8"]

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
            // aho fix when `all` flag is not set: only keep preferred forms
            // note that at least one form must be preferred or this will produce an empty array, breaking things
            if (sourceType === "x") seg = doAhoFix(seg)[0]

            let newSeg = seg.filter(alt => {
              if (!showLegacy && alt.legacy) return false
              if (!showExceptional && alt.exceptional) return false
              return true
            })
            if (newSeg.length) seg = newSeg
          } else if (sourceType === "x") {
            // aho fix when `all` flag is set: move non-preferred forms to bottom
            const [good, bad] = doAhoFix(seg)
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
          line += `（${alt.note.replace(/\n/g, "；")}）`
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

  const cmdXdi8 = ctx.command("xdi8 <text:el>", {
    checkArgCount: true,
    checkUnknown: true,
    showWarning: true,
  })
  cmdXdi8.option("all", "-a").action(({ options, session }, els) => {
    const text = stripTags(els).replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "")

    const hxResult = ctx.xdi8.hanziToXdi8Transcriber.transcribe(text, {
      ziSeparator: " ",
    })
    const hxScore = getResultScore(hxResult)
    const xhResult = ctx.xdi8.xdi8ToHanziTranscriber.transcribe(text, {
      alphaFilter: null,
    })
    const xhScore = getResultScore(xhResult)

    if (!hxScore && !xhScore) return session.text(".no-result")

    if (hxScore > xhScore) return stringifyResult(session, hxResult, "h", options)

    const xhResultCompact = xhResult.filter(seg => seg !== " ")
    return stringifyResult(session, xhResultCompact, "x", options)
  })
}
