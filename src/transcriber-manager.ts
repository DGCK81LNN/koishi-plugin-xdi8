import {
  HanziToXdi8Transcriber,
  Xdi8ToHanziTranscriber,
  data as data_,
  type AlphaToHanziTranscriber,
  type Data,
  type HanziToAlphaTranscriber,
  type DictEntry,
} from "xdi8-transcriber"

let data = data_
let hx: HanziToAlphaTranscriber | null = null
let xh: AlphaToHanziTranscriber | null = null

export function getHx() {
  return (hx ||= new HanziToXdi8Transcriber(data))
}

export function getXh() {
  return (xh ||= new Xdi8ToHanziTranscriber(data))
}

export function setData(data_: Data) {
  data = data_
  hx = null
  xh = null
}
