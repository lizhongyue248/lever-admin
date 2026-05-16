import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

const rawDir = path.join(process.cwd(), ".playwright-coverage", "raw")
const outputDir = path.join(process.cwd(), "coverage", "playwright")
const outputPath = path.join(outputDir, "coverage-summary.json")

const mergeRanges = (ranges) => {
  const sorted = ranges
    .filter((range) => Number.isFinite(range.startOffset) && Number.isFinite(range.endOffset) && range.endOffset > range.startOffset)
    .sort((a, b) => a.startOffset - b.startOffset || a.endOffset - b.endOffset)
  const merged = []

  for (const range of sorted) {
    const previous = merged.at(-1)

    if (!previous || range.startOffset > previous.endOffset) {
      merged.push({ endOffset: range.endOffset, startOffset: range.startOffset })
      continue
    }

    previous.endOffset = Math.max(previous.endOffset, range.endOffset)
  }

  return merged
}

const subtractRanges = (includedRanges, excludedRanges) => {
  const result = []

  for (const includedRange of includedRanges) {
    let segments = [{ ...includedRange }]

    for (const excludedRange of excludedRanges) {
      segments = segments.flatMap((segment) => {
        if (excludedRange.endOffset <= segment.startOffset || excludedRange.startOffset >= segment.endOffset) {
          return [segment]
        }

        const nextSegments = []
        const leftEnd = Math.max(segment.startOffset, excludedRange.startOffset)
        const rightStart = Math.min(segment.endOffset, excludedRange.endOffset)

        if (segment.startOffset < leftEnd) {
          nextSegments.push({ endOffset: leftEnd, startOffset: segment.startOffset })
        }

        if (rightStart < segment.endOffset) {
          nextSegments.push({ endOffset: segment.endOffset, startOffset: rightStart })
        }

        return nextSegments
      })
    }

    result.push(...segments)
  }

  return result
}

const countUsedBytes = (entry) => {
  const usedRanges = mergeRanges(entry.functions.flatMap((fn) => fn.ranges.filter((range) => range.count > 0)))
  const unusedRanges = mergeRanges(entry.functions.flatMap((fn) => fn.ranges.filter((range) => range.count === 0)))

  return subtractRanges(usedRanges, unusedRanges).reduce((sum, range) => sum + range.endOffset - range.startOffset, 0)
}

const getScriptName = (url) => {
  if (!url) {
    return "anonymous"
  }

  try {
    const parsed = new URL(url)

    return parsed.pathname
  } catch {
    return url
  }
}

const getEntrySource = (entry) => entry.source ?? entry.text ?? ""

const shouldIncludeEntry = (entry) => {
  if (!entry.url || !entry.functions || getEntrySource(entry).length === 0) {
    return false
  }

  if (!entry.url.includes("/_next/static/chunks/")) {
    return false
  }

  return entry.url.includes("/_next/static/chunks/src")
}

const files = await readdir(rawDir).catch(() => [])
const byUrl = new Map()

for (const file of files.filter((name) => name.endsWith(".json"))) {
  const entries = JSON.parse(await readFile(path.join(rawDir, file), "utf8"))

  for (const entry of entries) {
    if (!shouldIncludeEntry(entry)) {
      continue
    }

    const source = getEntrySource(entry)
    const key = getScriptName(entry.url)
    const previous = byUrl.get(key) ?? { totalBytes: 0, usedBytes: 0, url: key }
    previous.totalBytes = Math.max(previous.totalBytes, source.length)
    previous.usedBytes = Math.max(previous.usedBytes, countUsedBytes(entry))
    byUrl.set(key, previous)
  }
}

const filesSummary = [...byUrl.values()]
  .map((item) => ({
    ...item,
    percent: item.totalBytes === 0 ? 0 : Number(((item.usedBytes / item.totalBytes) * 100).toFixed(2))
  }))
  .sort((a, b) => a.url.localeCompare(b.url))
const totalBytes = filesSummary.reduce((sum, item) => sum + item.totalBytes, 0)
const usedBytes = filesSummary.reduce((sum, item) => sum + item.usedBytes, 0)
const summary = {
  files: filesSummary,
  generatedAt: new Date().toISOString(),
  totals: {
    files: filesSummary.length,
    percent: totalBytes === 0 ? 0 : Number(((usedBytes / totalBytes) * 100).toFixed(2)),
    totalBytes,
    usedBytes
  }
}

await mkdir(outputDir, { recursive: true })
await writeFile(outputPath, JSON.stringify(summary, null, 2), "utf8")
console.log(`Playwright coverage written to ${outputPath}`)
console.log(`Total client JS byte coverage: ${summary.totals.percent}%`)
