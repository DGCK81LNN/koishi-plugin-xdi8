# koishi-plugin-xdi8

[![npm](https://img.shields.io/npm/v/koishi-plugin-xdi8?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-xdi8)

希顶语与汉字互转

基于本人维护的 npm 包 [xdi8-transcriber](https://github.com/DGCK81LNN/xdi8-transcriber)

## 用法

  > 指令：`xdi8 <text...>`
  >
  > 汉字希顶互转（实验性）
  >
  > 在文本前添加选项“-a”（与文本和指令名“xdi8”之间用空格隔开）来显示隐藏的结果，如过时拼写和希转汉时的部分繁体字。
  >
  > 当文本为单个汉字或不包含空格的希顶“词”时，即使未启用“-a”选项也会默认显示绝大多数隐藏结果。
  >
  > 可用的选项有：
  >
  >   * -a, --all  显示隐藏结果

## 字表更新

为使转写器的字表保持最新，本插件所使用的库 xdi8-transcriber 需要持续更新。若要更新 xdi8-transcriber，请在 Koishi 的工作目录运行如下指令：

  * **npm:**

        npm update xdi8-transcriber

  * **yarn:**

        yarn up -R xdi8-transcriber

  * **Koishi 启动器:**

    <pre><code>koi yarn -n <mark>default</mark> up -R xdi8-transcriber</code></pre>

    其中“`default`”为 Koishi 实例名称。

## 示例

`xdi8 萤火虫`

```
nu3k ho ci3
```

`xdi8 地`

```
地:
dde（助词 de）
dDE（名词 dì）
```

`xdi8 怒发冲冠  奋发图强`

```
nAF jbia¹ mzu3² HB2  hu8H pio³ mb1 qT
```

```
[1] 发:
jbia（“髪”的简化字 fà）
pio（“發”的简化字 fā）
[2] 冲:
mzu3（“衝”的简化字）
Du3E（同“沖” 山间的平地；用于地名）
[3] 发:
pio（“發”的简化字 fā）
jbia（“髪”的简化字 fà）
```

`xdi8 tof H6H huT vnuV nYH`

```
施氏食狮史
```

`xdi8 NAh`

```
NAh:
曲（“麴”的简化字 酿酒或制酱时引起发醇的东西）
麹
麴
```

<code>xdi8<br>nAF nE wiY vnuV<br>nE wiY 4i6 n5i6<br>wiY 4i6 wA 56</code>

```
怒尼威狮
尼威又鸡
威又乌犀
```

## 附加功能

### grep

  > 指令：`xdi8-grep <pattern>`
  >
  > 从字表正则搜索希顶词
  >
  > 可以使用以下语法糖匹配特定种类的希顶字母：
  >
  >   * `\c` — 声母
  >   * `\g` — 介母
  >   * `\v` — 韵母
  >
  > 例如：“`\c\g\v.H`”匹配形如 _CGVRH_ 的希顶词。
  >
  > 将转义字母大写以选择补集，如 `\C` 匹配非声母。

显示的搜索结果有数量上限，可在插件配置中更改。超出上限时将随机抽取指定数量的结果显示，但正常拼写优先于过时拼写，正常拼写数量不足时才会用过时拼写补足数量。

示例：

`xdi8-grep H.*H`

```
示 HuTH
时 HoH
猪 HAH
髭 HuLjH
洓 HueEH
絷 HuauH
矰 H37H
夃 Hu3H
屒 H8pH
𠂔 HYH
…共 26 条结果。
```

`xdi8-grep \c\g\v[^\CH]H`

```
黯 Ni2bH
𫠊 xu2gH
烠 yu6xH
衠 7iemH
勮 5iVlH
宨 tiLfH
嶚 liLwH
攼 hi2rH（hàn）
甼 ti84H
幉 diepH
…共 42 条结果。
```

`xdi8-grep (.).*\1.*\1`

```
幈 ppi8p
徊 VVfiV（旧拼写）
璱 33b63（旧拼写）
共 3 条结果。
```
