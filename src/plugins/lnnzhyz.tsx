import { compileMandarin, compileShidinn, draw, PUA } from "@dgck81lnn/lnnzhyz2svg"
import { deserializeText, serializeText } from "@dgck81lnn/lnnzhyz2svg/notation"
import type {} from "@koishijs/plugin-help"
import { Context, Schema, h } from "koishi"
import { isSlash, stripTags } from "../utils"

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
    .command("lnnzhyz <text:el>", {
      checkArgCount: true,
      checkUnknown: true,
      showWarning: true,
    })
    .option("type", "<type>", {
      type: str => {
        if ("xdi8".startsWith(str)) return "shidinn" as const
        if ("shidinn".startsWith(str)) return "shidinn" as const
        if ("mandarin".startsWith(str)) return "mandarin" as const
        if ("notation".startsWith(str)) return "notation" as const
        if ("pua".startsWith(str)) return "pua" as const
        throw new TypeError("invalid type")
      },
      hidden: true,
      fallback: "shidinn",
    })
    .option("compile", "-c")
    .option("toPua", "-P")
    .option("size", "-X <css-font-size:string>")
    .option("weight", "-w <value>", {
      type: str => {
        const value = +str
        if (!(value > 0 && value < 2)) throw new RangeError()
        return value
      },
      fallback: 1,
    })
  cmd.option("type", "-x", { value: "shidinn" })
  cmd.option("type", "-s", { value: "shidinn" })
  cmd.option("type", "-m", { value: "mandarin" })
  cmd.option("type", "-n", { value: "notation" })
  cmd.option("type", "-p", { value: "pua" })
  cmd.action(async (argv, els) => {
    const {
      options: { compile: compileOnly, toPua, type, size, weight },
      session,
    } = argv
    const text = stripTags(els)

    if (
      (compileOnly && type === "notation") ||
      (compileOnly && toPua) ||
      (toPua && type === "pua")
    )
      return session.text(".options-conflict")

    let someOk = false

    let result = text.replace(/\ufdd0/g, "\ufffd").replace(/</g, "\ufdd0")
    if (type === "pua") {
      let ok = false
      result = PUA.parseMixed(result)
        .map(seg => {
          const prevOk = ok
          ok = typeof seg !== "string"
          if (typeof seg === "string") return seg
          someOk = true

          if (compileOnly) {
            let s = serializeText([seg])
            if (prevOk) return " " + s
            return s
          }

          return draw([seg], { strokeWidth: weight }).replace("viewBox", "viewbox")
        })
        .join("")
    } else {
      const compileFn = {
        shidinn: compileShidinn,
        mandarin: compileMandarin,
        notation: deserializeText,
      }[type]
      const phraseRe =
        type === "notation"
          ? /\^?[~\dA-Z]+(?:[+_-]\^?[~\dA-Z]+)*/gi
          : /\^?[\dA-Z]+(?:[_-]\^?[\dA-Z]+)*/gi

      result = result.replace(phraseRe, word => {
        try {
          const ct = compileFn(word)
          const result = compileOnly
            ? serializeText(ct)
            : toPua
            ? PUA.stringifyText(ct, { mandarin: type === "mandarin" })
            : draw(ct, { strokeWidth: weight }).replace("viewBox", "viewbox")
          someOk = true
          return result
        } catch {
          return `<span style="color:red">${word}</span>`
        }
      })
    }
    if (!someOk) return session.text(".no-valid-phrase")
    result = result.replace(/\ufdd0/g, "<")

    if (compileOnly || toPua)
      return [
        isSlash(argv) &&
          session.text(toPua ? "header-to-pua" : ".header-compile", {
            type: session.text(`.${type}`),
            text,
          }),
        h.escape(result),
      ]
        .filter(Boolean)
        .join("<br/>")

    return (
      <>
        {isSlash(argv)
          ? h.parse(
              type === "notation"
                ? session.text(".header-notation", { text })
                : session.text(".header", { type: session.text(`.${type}`), text })
            )
          : ""}
        <html>
          <div
            style={{
              width: "auto",
              height: "auto",
              maxWidth: config.width,
              lineHeight: "1",
              padding: config.padding,
              fontSize: size || `${config.fontSize}px`,
              fontFamily: config.fontFamily,
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
            }}
          >
            {h.parse(result.replace(/\n/g, "<br />"))}
          </div>
        </html>
      </>
    )
  })
}
