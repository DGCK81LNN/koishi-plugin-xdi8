import { Context, Schema, h } from "koishi"
import {} from "@koishijs/plugin-help"
import { compileMandarin, compileShidinn, draw } from "@dgck81lnn/lnnzhyz2svg"
import { deserializeText, serializeText } from "@dgck81lnn/lnnzhyz2svg/notation"
import { stripTags, tryRestoreRawText } from "../utils"

export const name = "lnnzhyz"
export const inject = ["component:html"]

export interface Config {
  fontSize: number
  fontFamily: string
  width: string
  padding: string
}

export const Config: Schema<Config> = Schema.object({
  fontSize: Schema.number().description("字号，单位 px").default(32),
  fontFamily: Schema.string()
    .description("非转写部分使用的字体")
    .default("Noto Sans, Source Han Sans SC"),
  width: Schema.string().description("文本区域的理想最大宽度").default("15em"),
  padding: Schema.string().description("文本区域的边距").default("0.25em"),
})

export function apply(ctx: Context, config: Config) {
  const cmd = ctx
    .command("lnnzhyz <text:text>", {
      checkArgCount: true,
      checkUnknown: true,
      showWarning: true,
    })
    .option("compile", "-c")
    .option("type", "<type>", {
      type: str => {
        if ("xdi8".startsWith(str)) return "shidinn" as const
        if ("shidinn".startsWith(str)) return "shidinn" as const
        if ("mandarin".startsWith(str)) return "mandarin" as const
        if ("notation".startsWith(str)) return "notation" as const
        throw new TypeError("invalid type")
      },
      fallback: "shidinn",
    })
  cmd.option("type", "-x", { value: "shidinn", hidden: true })
  cmd.option("type", "-s", { value: "shidinn", hidden: true })
  cmd.option("type", "-m", { value: "mandarin", hidden: true })
  cmd.option("type", "-n", { value: "notation", hidden: true })
  cmd.action(
    async ({ options: { compile: compileOnly, type }, session, source }, text) => {
      if (source) text = stripTags(tryRestoreRawText(text, source) || text)

      if (compileOnly && type === "notation")
        return session.text(".cannot-compile-notation")

      let someOk = false
      const compileFn = {
        shidinn: compileShidinn,
        mandarin: compileMandarin,
        notation: deserializeText,
      }[type]
      const phraseRe =
        type === "notation"
          ? /\^?[~\dA-Z]+(?:[+ _-]\^?[~\dA-Z]+)*/gi
          : /\^?[\dA-Z]+(?:[ _-]\^?[\dA-Z]+)*/gi

      const result = text
        .replace(/\ufdd0/g, "\ufffd")
        .replace(/</g, "\ufdd0")
        .replace(phraseRe, phrase => {
          const words = phrase.split(" ")
          const results: string[] = []
          outer: do {
            for (let i = words.length; i > 0; i--) {
              try {
                const clause = compileFn(words.slice(0, i).join(" "))
                results.push(
                  compileOnly
                    ? serializeText(clause)
                    : `<img src="data:image/svg+xml,${h.escape(draw(clause), true)}" />`
                )
                someOk = true
                words.splice(0, i)
                continue outer
              } catch {}
            }
            const word = words.shift()
            results.push(compileOnly ? word : `<span style="color:red">${word}</span>`)
          } while (words.length)
          return results.join(" ")
        })
        .replace(/\ufdd0/g, "<")

      if (!someOk) return session.text(".no-valid-phrase")
      if (compileOnly) return result

      return (
        <html>
          <style>{
            /*css*/ `
            img {
              height: 1.1875em;
              vertical-align: text-bottom;
            }`
          }</style>
          <div
            style={{
              width: "auto",
              height: "auto",
              maxWidth: config.width,
              lineHeight: "1",
              padding: config.padding,
              fontSize: `${config.fontSize}px`,
              fontFamily: config.fontFamily,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
          >
            {h.parse(result.replace(/\n/g, "<br />"))}
          </div>
        </html>
      )
    }
  )
}
