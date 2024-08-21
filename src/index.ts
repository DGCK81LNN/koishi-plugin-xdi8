import { Context, Schema } from "koishi"
import Xdi8 from "./service"
import * as pluginXdi8 from "./plugins/xdi8"
import * as pluginXegoe from "./plugins/xegoe"
import * as pluginXdi8Grep from "./plugins/xdi8-grep"
import * as pluginLnnzhyz from "./plugins/lnnzhyz"

export { Xdi8 }

export const name = "xdi8-index"
export const inject = {
  optional: ["component:html"],
}

export const usage: string = /*markdown*/ `
<style>
@font-face {
  font-family: XEGOEPUAall;
  src: url(https://dgck81lnn.github.io/bootstrap-lnn/fonts/XEGOEPUAall.woff2);
  font-display: block;
}
.koixdi8 {
  font: 3em XEGOEPUAall;
  color: #4737AC;
}
.koixdi8 .koixdi8-logo {
  height: 1.25em;
  vertical-align: text-bottom;
}
.koixdi8 .koixdi8-link.koixdi8-link {
  color: inherit;
  text-decoration-thickness: 2px;
}
.koixdi8 .koixdi8-koi {
  color: #8324DD;
}
:root.dark .koixdi8 {
  color: #AA99FF;
}
:root.dark .koixdi8 .koixdi8-koi {
  color: #C079F2;
}
</style>

<div class="koixdi8"><img class="koixdi8-logo" src="https://koishi.chat/logo.png"> <span class="koixdi8-koi"></span><a class="koixdi8-link" href="https://wiki.xdi8.top/wiki/希顶语" target="_blank" title="希顶语“灯”，音译为“希顶”"></a></div>

欢迎使用本插件。请按需启用或禁用下列功能。
`

type Toggle<T> = T & { enabled: boolean }

function schemaToggle<T>(
  schema: Schema<T>,
  description: string,
  enableByDefault = false,
  remark = ""
): Schema<Toggle<T>> {
  return Schema.intersect([
    Schema.object({
      enabled: Schema.boolean()
        .description("启用该功能。" + remark)
        .default(enableByDefault),
    }).description(""),
    Schema.union([
      Schema.object({
        enabled: Schema.const(true).required(!enableByDefault),
        ...schema.dict,
      }),
      Schema.object({
        enabled: Schema.const(false).required(enableByDefault),
      }),
    ]),
  ]).description(description) as Schema<Toggle<T>>
}

export interface Config {
  xdi8: Toggle<pluginXdi8.Config>
  xegoe: Toggle<pluginXegoe.Config>
  xdi8Grep: Toggle<pluginXdi8Grep.Config>
  lnnzhyz: Toggle<pluginLnnzhyz.Config>
}

export const Config = Schema.object({
  xdi8: schemaToggle(pluginXdi8.Config, "xdi8：汉希互转", true),
  xegoe: schemaToggle(
    pluginXegoe.Config,
    "xegoe：渲染希顶字母图片",
    true,
    "（需要加载 component:html 服务〔通常由 puppeteer 插件提供〕）"
  ),
  xdi8Grep: schemaToggle(pluginXdi8Grep.Config, "xdi8-grep：从字表正则搜索希顶词"),
  lnnzhyz: schemaToggle(
    pluginLnnzhyz.Config,
    "lnnzhyz：渲染 LNN 中华语字图片",
    false,
    "（需要加载 component:html 服务〔通常由 puppeteer 插件提供〕）"
  ),
}) as Schema<Config>

export function apply(ctx: Context, config: Config) {
  ctx.i18n.define("zh", require("./locales/zh"))
  ctx.i18n.define("en", require("./locales/en"))

  ctx.plugin(Xdi8)
  if (config.xdi8.enabled) ctx.plugin(pluginXdi8, config.xdi8)
  if (config.xegoe.enabled) ctx.plugin(pluginXegoe, config.xegoe)
  if (config.xdi8Grep.enabled) ctx.plugin(pluginXdi8Grep, config.xdi8Grep)
  if (config.lnnzhyz.enabled) ctx.plugin(pluginLnnzhyz, config.lnnzhyz)
}
