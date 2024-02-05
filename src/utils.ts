import { h } from "koishi"

export function stripTags(text: string) {
  return (
    h
      .transform(text.replace(/[\ufdd0\ufdd1]/g, "\ufffd"), {
        // use noncharacter codepoints to mark specific anchors
        // object replacement
        img: "\ufdd0",
        image: "\ufdd0",
        face: "\ufdd0",
        // message boundary marks
        message: (_, children) => `\ufdd1${children.join("")}\ufdd1`,

        text: true,
        default: false,
      })
      // replace objects with spaces unless already next to whitespace
      .replace(/(\s?)\ufdd0(\s?)/g, (_, l, r) => l + r || " ")
      // replace message boundaries with newlines unless at beginning or end of text
      .replace(/^(\s*\ufdd1)+|(\ufdd1\s*)+$/g, "")
      .replace(/\ufdd1(?:\s*\ufdd1)*/g, "\n")
  )
}
