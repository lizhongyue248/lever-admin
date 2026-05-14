/**
 * @schema 2.10
 * @input theme: enum("light", "dark") = "light"
 * @input owner: enum("personal", "platform") = "personal"
 * @input mode: enum("logs", "stats") = "stats"
 * @input surface: enum("sheet", "page", "mobile") = "sheet"
 */
const isDark = pencil.input.theme === "dark"
const isPlatform = pencil.input.owner === "platform"
const isStats = pencil.input.mode === "stats"
const isMobile = pencil.input.surface === "mobile"
const isSheet = pencil.input.surface === "sheet"
const W = pencil.width
const H = pencil.height

const c = {
  bg: isDark ? "#18181B" : "#FFFFFF",
  panel: isDark ? "#27272A" : "#FFFFFF",
  panelSoft: isDark ? "#1F1F23" : "#F8FAFC",
  text: isDark ? "#F4F4F5" : "#0F172A",
  muted: isDark ? "#A1A1AA" : "#64748B",
  border: isDark ? "#3F3F46" : "#E2E8F0",
  borderStrong: isDark ? "#52525B" : "#CBD5E1",
  blue: "#3B82F6",
  blueSoft: isDark ? "#172554" : "#DBEAFE",
  green: isDark ? "#22C55E" : "#16A34A",
  greenSoft: isDark ? "#052E16" : "#DCFCE7",
  amber: isDark ? "#FBBF24" : "#B45309",
  amberSoft: isDark ? "#451A03" : "#FEF3C7",
  red: isDark ? "#F87171" : "#DC2626",
  redSoft: isDark ? "#450A0A" : "#FEE2E2"
}

const nodes = []

const addFrame = (name, x, y, width, height, fill = c.panel, stroke = c.border, radius = 8) => {
  const node = { type: "frame", name, x, y, width, height, fill, cornerRadius: radius, layout: "none" }
  if (stroke) {
    node.stroke = { fill: stroke, thickness: 1 }
  }
  nodes.push(node)
  return node
}

const addRect = (name, x, y, width, height, fill, radius = 0) => {
  nodes.push({ type: "rectangle", name, x, y, width, height, fill, cornerRadius: radius })
}

const addText = (name, x, y, content, size = 13, fill = c.text, weight = "normal", width) => {
  const node = { type: "text", name, x, y, content, fill, fontFamily: "Inter", fontSize: size, fontWeight: weight }
  if (width) {
    node.textGrowth = "fixed-width"
    node.width = width
    node.lineHeight = 1.45
  }
  nodes.push(node)
}

const addChip = (name, x, y, label, fill, textFill, width = 68) => {
  addFrame(`${name}Chip`, x, y, width, 26, fill, undefined, 999)
  addText(`${name}Text`, x + 14, y + 6, label, 11, textFill, "600")
}

const addTab = (x, y, label, active, width) => {
  addFrame(`${label}Tab`, x, y, width, 36, active ? c.text : c.panel, active ? c.text : c.borderStrong, 8)
  addText(`${label}TabText`, x + 18, y + 9, label, 13, active ? c.bg : c.muted, "600")
}

const addMetric = (x, y, label, value, hint, width) => {
  addFrame(`${label}Metric`, x, y, width, 76, c.panel, c.border, 8)
  addText(`${label}MetricLabel`, x + 14, y + 12, label, 11, c.muted, "600")
  addText(`${label}MetricValue`, x + 14, y + 32, value, 22, c.text, "700")
  addText(`${label}MetricHint`, x + 14, y + 58, hint, 11, c.muted)
}

const addBar = (x, y, label, value, width, fill) => {
  addText(`${label}Label`, x, y + 2, label, 11, c.muted, "600")
  addRect(`${label}Track`, x + 92, y, width, 14, isDark ? "#3F3F46" : "#E5E7EB", 999)
  addRect(`${label}Bar`, x + 92, y, Math.max(8, Math.round(width * value)), 14, fill, 999)
}

const margin = isMobile ? 20 : isSheet ? 32 : 48
const contentW = W - margin * 2

addRect("v2Background", 0, 0, W, H, c.bg)

const title = isPlatform ? "平台 API Key 详情" : "API Key 详情"
const subtitle = isPlatform ? "prod-org-sync · Acme Inc. · lev_live_J3k2••••••••" : "cli-production · Lin Admin · lev_live_8wQ9••••••••"
addText("v2Title", margin, isMobile ? 22 : 32, title, isMobile ? 22 : 24, c.text, "700")
addText("v2Subtitle", margin, isMobile ? 58 : 70, subtitle, 12, c.muted, "normal", contentW - (isMobile ? 0 : 180))
if (!isMobile) {
  addFrame("openFullDetail", W - margin - 126, 64, 126, 32, c.panel, c.borderStrong, 8)
  addText("openFullDetailText", W - margin - 106, 72, "完整详情页", 13, c.muted, "600")
}

const summaryY = isMobile ? 92 : 116
const summaryH = isMobile ? 124 : 82
addFrame("compactSummary", margin, summaryY, contentW, summaryH, c.panelSoft, c.border, 8)
addText("summaryName", margin + 16, summaryY + 14, isPlatform ? "prod-org-sync" : "cli-production", 15, c.text, "700")
addText("summaryKey", margin + 16, summaryY + 42, isPlatform ? "组织 Key · 2026-06-30 过期" : "个人 Key · 永不过期", 12, c.muted)
addChip("status", margin + contentW - 90, summaryY + 14, isPlatform ? "复核" : "启用", isPlatform ? c.amberSoft : c.greenSoft, isPlatform ? c.amber : c.green, 58)
const metaTop = isMobile ? summaryY + 78 : summaryY + 20
const metaX = isMobile ? margin + 16 : margin + 230
addText("summaryMeta1", metaX, metaTop, isPlatform ? "主体  Acme Inc." : "归属  Lin Admin", 12, c.muted)
addText("summaryMeta2", metaX + (isMobile ? 0 : 170), metaTop + (isMobile ? 22 : 0), "最后使用  8 分钟前", 12, c.muted)
addText("summaryMeta3", metaX + (isMobile ? 0 : 316), metaTop + (isMobile ? 44 : 0), isPlatform ? "风险  17 次 403" : "24h 调用  382", 12, c.muted)

const tabsY = summaryY + summaryH + 16
addTab(margin, tabsY, "调用日志", !isStats, isMobile ? 104 : 118)
addTab(margin + (isMobile ? 112 : 126), tabsY, "图表统计", isStats, isMobile ? 116 : 126)

const bodyY = tabsY + 52
const bodyH = H - bodyY - (isSheet ? 92 : isMobile ? 24 : 48)

if (!isStats) {
  addFrame("logsPanel", margin, bodyY, contentW, bodyH, c.panel, c.border, 8)
  addText("logsTitle", margin + 18, bodyY + 16, "调用日志", 15, c.text, "700")
  addText("logsDesc", margin + 18, bodyY + 42, "最近 90 天 · 按调用时间倒序 · 可继续按结果筛选", 12, c.muted)
  const headY = bodyY + 80
  addRect("logsHead", margin + 18, headY, contentW - 36, 34, c.panelSoft, 6)
  addText("logsHeadText", margin + 32, headY + 10, isMobile ? "时间 / 请求 / 结果" : "时间                     请求路径                              结果        IP / UA", 11, c.muted, "700")
  const rows = [
    ["14:24:18", "POST /v1/orgs/acme/members", "403", "CN · node-fetch · org_role_forbidden"],
    ["14:20:03", "GET /v1/me", "200", "CN · curl/8.4"],
    ["13:48:29", "GET /v1/audit", "429", "CN · rate limited"],
    ["13:31:09", "GET /v1/sessions", "200", "CN · curl/8.4"],
    ["12:58:44", "GET /v1/orgs/acme", "200", "CN · node-fetch"]
  ]
  rows.forEach((row, index) => {
    const y = headY + 46 + index * (isMobile ? 68 : 54)
    addText(`logTime${index}`, margin + 32, y, row[0], 12, c.muted, "600")
    addText(`logPath${index}`, margin + (isMobile ? 32 : 122), y, row[1], 13, row[2] === "403" || row[2] === "429" ? c.amber : c.text, "600", isMobile ? contentW - 64 : 250)
    addText(`logStatus${index}`, margin + (isMobile ? 32 : 398), y + (isMobile ? 24 : 0), row[2], 13, row[2] === "200" ? c.green : c.amber, "700")
    addText(`logMeta${index}`, margin + (isMobile ? 78 : 466), y + (isMobile ? 24 : 0), row[3], 12, c.muted, "normal", isMobile ? contentW - 110 : contentW - 500)
  })
} else {
  const metricGap = isMobile ? 8 : 12
  const metricW = isMobile ? (contentW - metricGap) / 2 : (contentW - metricGap * 3) / 4
  addMetric(margin, bodyY, "24h 调用", "382", "+18% vs 昨日", metricW)
  addMetric(margin + metricW + metricGap, bodyY, "失败率", "5.0%", "17 次 403", metricW)
  if (!isMobile) {
    addMetric(margin + (metricW + metricGap) * 2, bodyY, "平均耗时", "184ms", "P95 420ms", metricW)
    addMetric(margin + (metricW + metricGap) * 3, bodyY, "Top 路径", "7", "/v1/me 最高", metricW)
  }

  const chartY = bodyY + 96
  const chartH = isMobile ? 160 : 250
  addFrame("trendChart", margin, chartY, isMobile ? contentW : Math.round(contentW * 0.62), chartH, c.panel, c.border, 8)
  addText("trendTitle", margin + 18, chartY + 16, "7 天调用趋势", 15, c.text, "700")
  addText("trendHint", margin + 18, chartY + 42, "成功、失败和限流按天聚合", 12, c.muted)
  const chartLeft = margin + 24
  const chartBase = chartY + chartH - 34
  const bars = [0.42, 0.56, 0.48, 0.74, 0.61, 0.86, 0.72]
  bars.forEach((value, index) => {
    const barW = isMobile ? 26 : 34
    const gap = isMobile ? 16 : 24
    const x = chartLeft + index * (barW + gap)
    const h = Math.round((chartH - 98) * value)
    addRect(`trendSuccess${index}`, x, chartBase - h, barW, h, c.blue, 6)
    addRect(`trendFail${index}`, x, chartBase - h - 10, barW, 8, value > 0.7 ? c.amber : c.green, 4)
  })
  addText("trendAxis", chartLeft, chartBase + 10, "Mon        Tue        Wed        Thu        Fri        Sat        Sun", 10, c.muted)

  const sideX = isMobile ? margin : margin + Math.round(contentW * 0.62) + 16
  const sideY = isMobile ? chartY + chartH + 12 : chartY
  const sideW = isMobile ? contentW : contentW - Math.round(contentW * 0.62) - 16
  const resultH = isMobile ? 128 : 250
  addFrame("resultChart", sideX, sideY, sideW, resultH, c.panel, c.border, 8)
  addText("resultTitle", sideX + 18, sideY + 16, "结果分布", 15, c.text, "700")
  addBar(sideX + 18, sideY + 58, "2xx", 0.82, sideW - 128, c.green)
  addBar(sideX + 18, sideY + 92, "4xx", 0.14, sideW - 128, c.amber)
  if (!isMobile) {
    addBar(sideX + 18, sideY + 126, "429", 0.04, sideW - 128, c.red)
  }
  if (!isMobile) {
    addText("resultNote", sideX + 18, sideY + 176, isPlatform ? "风险事件来自 403、429 与调用突增。" : "个人页仅展示自己的 Key 聚合。", 12, c.muted, "normal", sideW - 36)
  }

  const bottomY = isMobile ? sideY + resultH + 12 : chartY + chartH + 16
  const bottomH = H - bottomY - (isSheet ? 96 : isMobile ? 24 : 48)
  const leftW = isMobile ? contentW : Math.round((contentW - 16) * 0.52)
  addFrame("topPaths", margin, bottomY, leftW, bottomH, c.panel, c.border, 8)
  addText("topPathsTitle", margin + 18, bottomY + 16, "Top 路径", 15, c.text, "700")
  const paths = ["/v1/me", "/v1/orgs/acme", "/v1/orgs/acme/members", "/v1/audit"]
  paths.slice(0, isMobile ? 2 : paths.length).forEach((path, index) => {
    const y = bottomY + (isMobile ? 42 : 54) + index * (isMobile ? 24 : 36)
    addText(`path${index}`, margin + 18, y, path, 12, index === 2 ? c.amber : c.text, "600", leftW - 130)
    addText(`pathCount${index}`, margin + leftW - 82, y, `${148 - index * 27} 次`, 12, c.muted, "600")
  })
  if (!isMobile) {
    const riskX = margin + leftW + 16
    addFrame("riskEvents", riskX, bottomY, contentW - leftW - 16, bottomH, c.panel, c.border, 8)
    addText("riskEventsTitle", riskX + 18, bottomY + 16, isPlatform ? "风险事件" : "耗时分布", 15, c.text, "700")
    addText("riskEventsBody", riskX + 18, bottomY + 54, isPlatform ? "17 次 org_role_forbidden\n2 次 rate_limited\n1 个非常用接口路径\n失败集中在成员写入接口" : "P50 120ms\nP95 420ms\n最慢路径 /v1/audit\n无异常地域变化", 13, c.muted, "normal", contentW - leftW - 52)
  }
}

if (isSheet) {
  const actionY = H - 72
  addFrame("actions", margin, actionY, contentW, 48, c.bg, c.border, 8)
  addText("actionPrimary", margin + 18, actionY + 16, isStats ? "点击图表项可回到日志并带入筛选" : "日志是主内容，基础信息保持轻量展示", 12, c.muted)
}

return nodes
