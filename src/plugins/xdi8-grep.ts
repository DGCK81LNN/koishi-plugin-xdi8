import { Context, h, Schema } from "koishi"
import type {} from "../service"
import { ahoFixes, isSlash } from "../utils"

export const name = "xdi8-grep"
export const inject = ["xdi8"]

export interface Config {
  maxResults: number
}

export const Config: Schema<Config> = Schema.object({
  maxResults: Schema.number().default(500).description("单次查询的最大结果数。"),
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
    .option("perPage", "-n <n:natural>", { fallback: 20 })
    .option("page", "-p <p:natural>")
    .action((argv, pattern) => {
      const { session, options } = argv
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

      const repeatInput = isSlash(argv)

      const re = (() => {
        try {
          return new RegExp(`^(?:${pattern})$`)
        } catch {}
      })()
      if (!re)
        return repeatInput
          ? session.i18n(".invalid-pattern-with-expr", [pattern])
          : session.i18n(".invalid-pattern")

      let entries = ctx.xdi8.xdi8ToHanziTranscriber.dict.filter(
        entry =>
          entry.x.match(re) &&
          !(Object.hasOwn(ahoFixes, entry.x) && !ahoFixes[entry.x].includes(entry.h))
      )
      if (!entries.length)
        return repeatInput
          ? session.i18n(".no-result-with-expr", [pattern])
          : session.i18n(".no-result")

      let regularEntries = []
      let legacyEntries = []
      for (const entry of entries) {
        if (entry.hh === "-" && entry.xh === "-") legacyEntries.push(entry)
        else if (!options.legacy) regularEntries.push(entry)
      }

      if (options.legacy) {
        if (!legacyEntries.length)
          return repeatInput
            ? session.i18n(".no-result-legacy-with-expr", [pattern])
            : session.i18n(".no-result")
        regularEntries = legacyEntries
        legacyEntries = []
      }

      let perPage = options.perPage
      if (perPage > config.maxResults || perPage <= 0) perPage = config.maxResults
      const resultCount = regularEntries.length + legacyEntries.length
      const more = resultCount > perPage

      const pageIndex = (options.page ?? 1) - 1
      if (pageIndex === -1) {
        entries = [
          ...samples(regularEntries, perPage),
          ...samples(legacyEntries, perPage - regularEntries.length),
        ]
      } else {
        entries = [...regularEntries, ...legacyEntries].slice(
          pageIndex * perPage,
          (pageIndex + 1) * perPage
        )
      }

      let output = [
        h.text(
          entries
            .map(entry => {
              let line = `${entry.h} ${entry.x}`
              if (entry.n) line += `（${entry.n}）`
              return line
            })
            .join("\n")
        ),
      ]
      if (repeatInput)
        output = [
          // prettier-ignore
          ...session.i18n(
            options.legacy ? ".result-header-legacy" : ".result-header",
            [pattern]
          ),
          h.text("\n"),
          h("p", output),
        ]
      if (pageIndex <= 0) {
        const pageCount = Math.ceil(resultCount / perPage)
        const footer = legacyEntries.length
          ? session.i18n(".result-footer-with-legacy", [
              resultCount,
              legacyEntries.length,
              pageCount,
            ])
          : session.i18n(".result-footer", [resultCount, pageCount])
        if (more) footer.unshift(h.text("…"))
        output.push(h.text("\n"), h("p", footer))
      }
      return output
    })
}
