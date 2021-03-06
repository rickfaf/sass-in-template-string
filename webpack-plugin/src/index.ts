import { basename } from "path"
import { CssSyntax } from "./find-sass-template"
import { compileSassCode } from "./sass-compiler"
import { updateSource } from "./update-source"

const pluginName = "SassInTemplateString"

interface Options {
  outputFile: string
}

interface CssChunk {
  code: string
  syntax: CssSyntax
  assetPath: string
  assetLine: number
  cssStartColumn: number
}

export default class SassInTemplateString {

  private outputFile: string

  constructor(options: Options) {
    if (!options || !options.outputFile)
      throw new Error("Missing option: 'outputFile'")
    this.outputFile = options.outputFile
  }

  apply(compiler: any) {
    let assetList: string[] = []
    const chunks = new Map<string, CssChunk>()

    // compiler.hooks.beforeCompile.tapAsync(pluginName, (params: any, callback: any) => {
    //   console.log("[DEBUG] beforeCompile")
    //   callback()
    // })

    compiler.hooks.compilation.tap(pluginName, (bundle: any) => {
      // console.log("[DEBUG] compilation")
      bundle.hooks.optimizeModules.tap(pluginName, (modules: any) => {
        // console.log("[DEBUG] optimizeModules")
        assetList = []
        for (const mod of modules) {
          const assetPath: string = mod.request
          // console.log("[DEBUG] optimizeModules →", assetPath)
          if (assetPath.endsWith(".ts") || assetPath.endsWith(".js")) {
            assetList.push(assetPath)
            const updated = updateSource(mod._source._value)
            if (updated) {
              const { result, cssSyntax, cssCodeWithoutTag, assetLine, cssStartColumn } = updated
              mod._source._value = result
              chunks.set(assetPath, {
                code: cssCodeWithoutTag,
                syntax: cssSyntax,
                assetPath,
                assetLine,
                cssStartColumn
              })
            }
          }
        }
      })
    })

    compiler.hooks.emit.tapPromise(pluginName, async (compilation: any) => {
      // console.log("[DEBUG] emit.tapPromise")
      const orderedChunks: CssChunk[] = []
      for (const assetPath of assetList) {
        const chunk = chunks.get(assetPath)
        if (chunk)
          orderedChunks.push(chunk)
      }
      const cssCode = await makeCssCode(orderedChunks, compilation)
      compilation.assets[this.outputFile] = {
        source: () => {
          // console.log("[DEBUG] source")
          return cssCode
        },
        size: () => {
          // console.log("[DEBUG] size")
          return cssCode.length
        }
      }
    })

    // compiler.hooks.done.tapAsync(pluginName, async () => {
    //   const cssCode = await makeCssCode(cssChunks)
    //   await writeFile(this.outputFile, cssCode)
    // })
  }
}

async function makeCssCode(cssChunks: CssChunk[], compilation: any) {
  const bundle: string[] = []
  for (const { code, syntax, assetPath, assetLine, cssStartColumn } of cssChunks) {
    try {
      const assetName = basename(assetPath)
      bundle.push(`/* ${assetName} */`)
      if (syntax === "scss" || syntax === "sass")
        bundle.push(await compileSassCode(code, syntax))
      else
        bundle.push(code)
    } catch (error) {
      // console.log("ERROR:", Object.entries(error))
      const { line, column } = error
      const l = assetLine + (line ? line : 1)
      const c = column ? ":" + (line === 1 ? column + cssStartColumn : column) : ""

      // tslint:disable-next-line: whitespace
      compilation.errors.push(new Error(`${error.message ?? error} at ${assetPath}:${l}${c}`))
    }
  }
  return bundle.join("\n")
}