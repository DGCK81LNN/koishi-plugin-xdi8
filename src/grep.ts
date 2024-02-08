import { Context, Schema } from "koishi"
import { data } from "xdi8-transcriber"
import { ahoFixes } from "./utils"

export interface Config {
  maxResults: number
}

export const Config: Schema<Config> = Schema.object({
  maxResults: Schema.number()
    .default(10)
    .description("xdi8-grep 结果的最大数量。超出时则随机从中抽取指定数量。"),
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
    sequence[pos] = sequence.pop() ?? sequence.length
  } while (indices.length < count)
  indices.sort((a, b) => a - b)

  return indices.map(i => items[i])
}

export function apply(ctx: Context, config: Config) {
  const dict = data.dict.slice(0).sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0))

  ctx
    .command("xdi8-grep <pattern:string>", {
      checkArgCount: true,
      checkUnknown: true,
      showWarning: true,
    })
    .action(({ session }, pattern) => {
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

      let entries = dict.filter(
        entry =>
          entry.x.match(re) &&
          !(Object.hasOwn(ahoFixes, entry.x) && !ahoFixes[entry.x].includes(entry.h))
      )
      const resultCount = entries.length
      if (!resultCount) return session.text(".no-result")
      const more = resultCount > config.maxResults

      const regularEntries = []
      const legacyEntries = []
      for (const entry of entries) {
        if (entry.hh === "-" && entry.xh === "-") legacyEntries.push(entry)
        else regularEntries.push(entry)
      }

      entries = [
        ...samples(regularEntries, config.maxResults),
        ...samples(legacyEntries, config.maxResults - regularEntries.length),
      ]

      const lines = entries.map(entry => {
        let line = `${entry.h} ${entry.x}`
        if (entry.n) line += session.text("general.paren", [entry.n])
        return line
      })
      lines.push((more ? "…" : "") + session.text(".result-footer", [resultCount]))
      return lines.join("\n")
    })
}
