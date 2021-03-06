export type CssSyntax = "css" | "scss" | "sass"

export interface FoundTemplate {
  start: number
  end: number
  code: string
  tagName: CssSyntax
  value: string
  startLine: number
  startColumn: number
}

export function findSassTemplate(source: string): FoundTemplate | undefined {
  const newLine = `(?:\\r?\\n|\\r)`
  const lineBegin = `(?:^|${newLine})`
  const declEnd = "(?:\\s*;)?"
  const templateString = "`(?:[^`\\\\]*(?:\\\\.[^`\\\\]*)*)`"
  const prefix = "(css|scss|sass)"

  const reg = new RegExp(
    `${lineBegin}(${prefix}\\s*)(${templateString})\\s*${declEnd}`,
    "g"
  )

  const found = reg.exec(source)

  if (!found)
    return

  let start = found.index!
  let [code, prefixCode, tagName, sassCssCode] = found

  if (code[0] === "\r" && code[1] === "\n") {
    start += 2
    code = code.substr(2)
  } else if (code[0] === "\n" || code[0] === "\r") {
    ++start
    code = code.substr(1)
  }

  const lastIndex = code.length - 1
  if (code[lastIndex] === ";")
    code = code.substr(0, lastIndex)

  return {
    start,
    end: start + code.length,
    code,
    tagName: tagName as CssSyntax,
    // tslint:disable-next-line: no-eval
    value: eval(sassCssCode),
    startLine: (source.substr(0, start).match(/\r?\n|\r/g) || []).length,
    startColumn: prefixCode.length + 1
  }
}