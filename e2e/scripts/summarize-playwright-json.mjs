import { readFile } from "node:fs/promises"

const reportPath = process.argv[2]

const escapeAnnotation = (value) => String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A").replaceAll(":", "%3A").replaceAll(",", "%2C")

const toOneLine = (value) =>
  String(value ?? "")
    .replace(/\s+/gu, " ")
    .trim()

const collectFailures = (suite, failures = []) => {
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      for (const result of test.results ?? []) {
        if (["passed", "skipped"].includes(result.status)) {
          continue
        }

        const error = result.error?.message ?? result.errors?.map((entry) => entry.message).find(Boolean) ?? "Playwright test failed without an error message."
        failures.push({
          duration: result.duration,
          error,
          file: spec.file ?? suite.file ?? "e2e",
          line: spec.line ?? suite.line ?? 1,
          project: test.projectName ?? "unknown",
          status: result.status,
          title: [...(suite.titlePath ?? []), spec.title].filter(Boolean).join(" › ")
        })
      }
    }
  }

  for (const child of suite.suites ?? []) {
    collectFailures(child, failures)
  }

  return failures
}

const main = async () => {
  if (!reportPath) {
    console.log("No Playwright JSON report path was provided.")
    return
  }

  let report
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"))
  } catch (error) {
    console.log(`Unable to read Playwright JSON report at ${reportPath}: ${error instanceof Error ? error.message : String(error)}`)
    return
  }

  const failures = (report.suites ?? []).flatMap((suite) => collectFailures(suite))

  if (failures.length === 0) {
    console.log("No failed Playwright tests found in JSON report.")
    return
  }

  console.log(`Found ${failures.length} failed Playwright result(s):`)

  for (const failure of failures) {
    const message = `${failure.project} ${failure.status}: ${failure.title} (${failure.duration}ms) - ${toOneLine(failure.error)}`
    console.log(`- ${message}`)
    console.log(`::error file=${escapeAnnotation(failure.file)},line=${failure.line},title=${escapeAnnotation(failure.title)}::${escapeAnnotation(message)}`)
  }
}

await main()
