import loaderUtils from "loader-utils"
import { basename } from "path"
import { updateSource } from "./update-source"

export = async function (source: string) {
  const options = Object.assign(loaderUtils.getOptions(this) || {}, {
    sourceMap: this.sourceMap,
    filePath: this.resourcePath,
    fileName: basename(this.resourcePath)
  })

  const { result, updated } = await updateSource(source, options)

  console.info(`Result: '${result}'`)
  console.info(`Updated: '${updated}'`)
  console.info(
    `Source file '${options.fileName}': ${updated ? "updated" : "same"}`
  )
  if (source !== result)
    console.log("==> source:", result)
  return result
}