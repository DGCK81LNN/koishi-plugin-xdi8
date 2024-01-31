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
