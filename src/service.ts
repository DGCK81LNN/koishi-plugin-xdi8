import { Context, Service } from "koishi"
import {
  HanziToXdi8Transcriber,
  Xdi8ToHanziTranscriber,
  data,
  type AlphaToHanziTranscriber,
  type Data,
  type HanziToAlphaTranscriber,
} from "xdi8-transcriber"

declare module "koishi" {
  interface Context {
    xdi8: Xdi8
  }
}

export default class Xdi8 extends Service {
  constructor(ctx: Context) {
    super(ctx, "xdi8", true)
  }

  private _data: Data = data
  private _hanziToXdi8Transcriber: HanziToAlphaTranscriber | null = null
  private _xdi8ToHanziTranscriber: AlphaToHanziTranscriber | null = null

  get data() {
    return this._data
  }
  set data(data: Data) {
    if (this._data === data) return
    this._data = data
    this._hanziToXdi8Transcriber = null
    this._xdi8ToHanziTranscriber = null
  }

  get hanziToXdi8Transcriber() {
    return (this._hanziToXdi8Transcriber ??= new HanziToXdi8Transcriber(this._data))
  }
  get xdi8ToHanziTranscriber() {
    return (this._xdi8ToHanziTranscriber ??= new Xdi8ToHanziTranscriber(this._data))
  }
}
