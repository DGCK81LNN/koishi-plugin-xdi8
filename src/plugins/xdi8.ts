import { Argv, Computed, Context, Schema, h } from "koishi"
import type { Alternation, TranscribeResult } from "xdi8-transcriber"
import type {} from "../service"
import { doAhoFix, isSlash } from "../utils"

export const name = "xdi8"
export const inject = ["xdi8"]

export interface Config {
  footnotesInSeparateMessage: Computed<boolean>
}

export const Config: Schema<Config> = Schema.object({
  footnotesInSeparateMessage: Schema.computed(Schema.boolean())
    .description("是否将结果正文与脚注分成两条消息发送。")
    .default(true),
})

function supNum(n: number) {
  return Array.from(String(0 | n), (d: `${number}`) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d]).join("")
}

export function fullWidthToHalfWidth(text: string): string {
  return text
    .replace(/[！，．：；？](?!$)/gm, "$& ")
    .replace(/[！-～]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xfee0))
    .replace(/。$/gm, ".")
    .replace(/、$/gm, ",")
    .replace(/。/g, ". ")
    .replace(/、/g, ", ")
}

export function apply(ctx: Context, config: Config) {
  function stringifyResult<T extends "h" | "x">(
    argv: Argv,
    source: string,
    result: TranscribeResult,
    sourceType: T,
    { all = false },
  ) {
    const { session } = argv
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

    const alts: (Alternation[] & { source: string })[] = []
    let text = result
      .map(seg => {
        if (typeof seg === "string") return seg
        if (Array.isArray(seg)) {
          const source = seg[0].content.map(s => s[sourceType]).join("")
          let index = alts.findIndex(s => s.source === source)
          if (index === -1) {
            index = alts.length
            alts.push(Object.assign(seg, { source }))
          }
          // 汉转希时，若一个汉字的所有拼写都为旧拼写（即最新字表已删除该字），则不转换，输出转换前的汉字，但依然显示脚注
          if (sourceType === "h" && seg[0].legacy)
            return seg[0].content.map(seg => seg.h).join("") + supNum(index + 1)
          return seg[0].content.map(seg => seg.v).join("") + supNum(index + 1)
        }
        return seg.v
      })
      .join("")
    if (sourceType === "h") text = fullWidthToHalfWidth(text)

    const footnotes = alts.map(seg => {
      const source = seg[0].content.map(seg => seg[sourceType]).join("")
      const alts = seg.map(alt => {
        let line = alt.content.map(seg => seg.v).join("")
        if (alt.note) line += `（${alt.note.replace(/\n/g, "；")}）`
        return line
      })
      return `${source}:\n${alts.join("\n")}`
    })

    if (single && footnotes.length === 1)
      return [isSlash(argv) && session.text(".input", [source]), h.escape(footnotes[0])]
        .filter(Boolean)
        .join("\n")

    return [
      isSlash(argv) && session.text(".input", [source]),
      h.escape(text),
      h.escape(footnotes.map((fn, i) => `[${i + 1}] ${fn}`).join("\n")),
    ]
      .filter(Boolean)
      .join(session.resolve(config.footnotesInSeparateMessage) ? "<message />" : "\n")
  }

  function getResultScore(result: TranscribeResult) {
    if (!result) return 0
    return result.reduce(
      (score, seg) =>
        score + (Array.isArray(seg) ? seg[0].content.length : +(typeof seg === "object")),
      0,
    )
  }

  const cmd = ctx
    .command("xdi8 <text:rawtext>", {
      checkArgCount: true,
      checkUnknown: true,
    })
    .option("all", "-a")
    .option("decode", "-d")
    .option("encode", "-e")
  cmd.action((argv, text) => {
    const { options, session } = argv
    text = text.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, "")

    let hxResult: TranscribeResult, xhResult: TranscribeResult
    let hxScore = 0
    let xhScore = 0

    if (!options.decode) {
      hxResult = ctx.xdi8.hanziToXdi8Transcriber.transcribe(text, {
        ziSeparator: " ",
      })
      hxScore = getResultScore(hxResult)
    }
    if (!options.encode) {
      xhResult = ctx.xdi8.xdi8ToHanziTranscriber.transcribe(text, {
        alphaFilter: null,
      })
      xhScore = getResultScore(xhResult)
    }
    if (!hxScore && !xhScore) return session.text(".no-result")

    if (hxScore > xhScore) return stringifyResult(argv, text, hxResult, "h", options)

    const xhResultCompact = xhResult.filter(seg => seg !== " ")
    return stringifyResult(argv, text, xhResultCompact, "x", options)
  })
}
