import { Context, Schema } from "koishi"
import type {} from "../service"
import { ahoFixes } from "../utils"

export const name = "xdi8-grep"
export const inject = ["xdi8"]

export interface Config {
  maxResults: number
}

export const Config: Schema<Config> = Schema.object({
  maxResults: Schema.number()
    .default(15)
    .description("结果的最大数量。超出时则随机从中抽取指定数量。"),
})

function samples<T>(items: T[], count: number) {
  if (items.length <= count) return items
  if (count <= 0) return []

  // Get `count` unique random integers in the range 0 to `items.length - 1`. Store in `indices`.
  /**
   * "lazy" array of numbers where an empty cell means the value is the same as its index.
   * Access like this: `sequence[i] ?? i`
   */
  const sequence = new Array<number>(items.length)
  const indices = []
  do {
    const pos = ~~(Math.random() * sequence.length)
    indices.push(sequence[pos] ?? pos)
    const last = sequence.pop()
    if (pos < sequence.length) sequence[pos] = last ?? sequence.length
  } while (indices.length < count)
  indices.sort((a, b) => a - b)

  return indices.map(i => items[i])
}

export function apply(ctx: Context, config: Config) {
  ctx
    .command("xdi8-grep <pattern:string>", {
      checkArgCount: true,
      checkUnknown: true,
      showWarning: true,
    })
    .option("legacy", "-l", { fallback: false })
    .action(({ session, options }, pattern) => {
      let inCharClass = false
      function charClass(chars: string) {
        return inCharClass ? chars : `[${chars}]`
      }
      pattern = pattern.replace(/[\[\]]|\\[\s\S]/g, s => {
        if (s === "[") inCharClass = true
        if (s === "]") inCharClass = false
        if (s === "\\c") return charClass("bpmwjqxynzDsrHNldtgkh45vF7Bcf")
        if (s === "\\C") return charClass("uaoeEAYL62T83V1i")
        if (s === "\\g") return charClass("ui")
        if (s === "\\G") return charClass("bpmwjqxynzDsrHNldtgkh45vF7BcfaoeEAYL62T83V1")
        if (s === "\\v") return charClass("aoeEAYL62T83V1")
        if (s === "\\V") return charClass("bpmwjqxynzDsrHNldtgkh45vF7Bcfui")
        return s
      })

      const re = (() => {
        try {
          return new RegExp(`^${pattern}$`)
        } catch {}
      })()
      if (!re) return session.text(".invalid-pattern")

      let entries = ctx.xdi8.hanziToXdi8Transcriber.dict.filter(
        entry =>
          entry.x.match(re) &&
          !(Object.hasOwn(ahoFixes, entry.x) && !ahoFixes[entry.x].includes(entry.h))
      )
      if (!entries.length) return session.text(".no-result")

      let regularEntries = []
      let legacyEntries = []
      for (const entry of entries) {
        if (entry.hh === "-" && entry.xh === "-") legacyEntries.push(entry)
        else if (!options.legacy) regularEntries.push(entry)
      }

      if (options.legacy) {
        if (!legacyEntries.length) return session.text(".no-result")
        regularEntries = legacyEntries
        legacyEntries = []
      }

      const resultCount = regularEntries.length + legacyEntries.length
      const more = resultCount > config.maxResults

      entries = [
        ...samples(regularEntries, config.maxResults),
        ...samples(legacyEntries, config.maxResults - regularEntries.length),
      ]

      const lines = entries.map(entry => {
        let line = `${entry.h} ${entry.x}`
        if (entry.n) line += `（${entry.n}）`
        return line
      })
      lines.push(
        (more ? "…" : "") +
          (legacyEntries.length
            ? session.text(".result-footer-with-legacy", [
                resultCount,
                legacyEntries.length,
              ])
            : session.text(".result-footer", [resultCount]))
      )
      return lines.join("\n")
    })
}
