import { h } from "koishi"

/**
 * Dict of shidinn spellings and their preferred hanzi forms.
 *
 * Some entries have hanzi froms that include PUA characters which will not
 * display in plain-text environments. Thus, when characters in this dict are
 * transcribed to hanzi, only the preferred hanzi forms will be shown --
 * unless the `all` flag is set, in which case they are moved to the end of
 * the alternations array instead.
 */
export const ahoFixes: Record<string, string[]> = {
  aho: ["纟火", "糹火"],
}

export function stripTags(els: h[]) {
  return h.unescape(
    h
      .transform(els.join("").replace(/[\ufdd0\ufdd1]/g, "\ufffd"), {
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
