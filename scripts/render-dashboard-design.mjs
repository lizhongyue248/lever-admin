import { mkdir } from "node:fs/promises"
import { chromium } from "@playwright/test"

const outDir = "prd/dashboard-design-export"

const palettes = {
  light: {
    background: "#FFFFFF",
    surface: "#F8F8F8",
    foreground: "#333333",
    card: "#FFFFFF",
    muted: "#F8F8F8",
    mutedForeground: "#6C727E",
    accent: "#DCF2FF",
    accentForeground: "#1E3A8B",
    border: "#E4E8EF",
    primary: "#3981F6",
    primaryForeground: "#FFFFFF",
    destructive: "#F14444",
    sidebar: "#FFFFFF",
    sidebarForeground: "#090909",
    sidebarAccent: "#F5F5F5",
    sidebarBorder: "#E4E4E4",
    chart: ["#3981F6", "#2463EF", "#1D4EDA", "#1D3FAD", "#1E3A8B"],
    chartStrong: "#3981F6",
    chartMid: "#6CA3F8",
    chartSoft: "#A9C9FA",
    chartTrack: "#EAF2FF",
    shadow: "0 18px 45px rgba(15, 23, 42, 0.08)"
  },
  dark: {
    background: "#161616",
    surface: "#161616",
    foreground: "#E4E4E4",
    card: "#262626",
    muted: "#262626",
    mutedForeground: "#A4A4A4",
    accent: "#1E3A8B",
    accentForeground: "#BDDAFF",
    border: "#404040",
    primary: "#3981F6",
    primaryForeground: "#FFFFFF",
    destructive: "#F14444",
    sidebar: "#262626",
    sidebarForeground: "#FFFFFF",
    sidebarAccent: "#262626",
    sidebarBorder: "rgba(255, 255, 255, 0.1)",
    chart: ["#61A4F7", "#3981F6", "#2463EF", "#1D4EDA", "#1D3FAD"],
    chartStrong: "#3981F6",
    chartMid: "#2F65C7",
    chartSoft: "#2A4772",
    chartTrack: "#333333",
    shadow: "0 18px 45px rgba(0, 0, 0, 0.28)"
  }
}

const css = (theme) => {
  const p = palettes[theme]
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 1440px;
      height: 1024px;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
      background: ${p.background};
      color: ${p.foreground};
    }
    .screen { width: 1440px; height: 1024px; display: flex; background: ${p.surface}; }
    .sidebar {
      width: 280px;
      height: 1024px;
      background: ${p.sidebar};
      border-right: 1px solid ${p.sidebarBorder};
      padding: 30px 16px 24px;
      position: relative;
      flex-shrink: 0;
    }
    .brand { display: flex; align-items: center; gap: 12px; margin: 0 8px 38px; }
    .mark, .avatar {
      width: 36px; height: 36px; border-radius: 9px;
      display: grid; place-items: center;
      background: ${p.primary}; color: ${p.primaryForeground};
      font-weight: 760;
    }
    .brand-title { font-size: 14px; font-weight: 760; color: ${p.sidebarForeground}; line-height: 1.1; }
    .brand-sub { margin-top: 3px; font-size: 10px; color: ${p.mutedForeground}; }
    .nav-group { margin-top: 18px; }
    .nav-label { padding: 0 12px 8px; font-size: 10px; color: ${p.mutedForeground}; font-weight: 650; }
    .nav-item {
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 12px;
      color: ${p.sidebarForeground};
      font-size: 12px;
    }
    .nav-item.active {
      background: ${theme === "light" ? p.accent : p.sidebarAccent};
      color: ${theme === "light" ? p.primary : p.sidebarForeground};
      font-weight: 720;
    }
    .nav-bar { width: 3px; height: 18px; border-radius: 999px; background: ${p.primary}; }
    .nav-icon { width: 16px; text-align: center; color: ${p.mutedForeground}; }
    .dock {
      position: absolute; left: 16px; right: 16px; bottom: 24px;
      height: 68px;
      border-radius: 12px;
      border: 1px solid ${p.border};
      background: ${theme === "light" ? "#FFFFFF" : "#202020"};
      display: flex; align-items: center; gap: 10px;
      padding: 12px;
    }
    .dock-name { font-size: 12px; font-weight: 760; color: ${p.foreground}; }
    .dock-email { margin-top: 3px; font-size: 10px; color: ${p.mutedForeground}; }
    .dock-chev { margin-left: auto; color: ${p.mutedForeground}; font-size: 14px; }
    .app { width: 1160px; height: 1024px; position: relative; }
    .topbar {
      height: 64px;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 24px 0 32px;
      background: ${p.card};
      border-bottom: 1px solid ${p.border};
    }
    .top-left { display: flex; align-items: center; gap: 20px; }
    .menu { font-size: 20px; color: ${p.mutedForeground}; }
    .separator { width: 1px; height: 20px; background: ${p.border}; }
    .crumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: ${p.mutedForeground}; }
    .crumb strong { color: ${p.foreground}; }
    .theme-btn {
      width: 36px; height: 36px; border-radius: 9px;
      display: grid; place-items: center;
      color: ${p.primary};
      background: ${theme === "light" ? p.accent : p.sidebarAccent};
      font-weight: 760;
    }
    main { height: 960px; padding: 40px; position: relative; }
    .grid-top { display: grid; grid-template-columns: 1fr 392px; gap: 28px; }
    .card {
      border: 1px solid ${p.border};
      background: ${p.card};
      border-radius: 14px;
      box-shadow: ${p.shadow};
    }
    .hero {
      height: 338px;
      padding: 28px 34px;
      display: grid;
      grid-template-columns: 290px 1fr;
      align-items: center;
      gap: 30px;
    }
    .score { margin-top: 14px; display: flex; align-items: end; gap: 8px; }
    .score-num { font-size: 58px; line-height: 0.9; font-weight: 780; letter-spacing: 0; }
    .score-total { font-size: 16px; font-weight: 760; color: ${p.mutedForeground}; padding-bottom: 5px; }
    .desc { margin-top: 22px; width: 260px; font-size: 12px; line-height: 1.5; color: ${p.mutedForeground}; }
    .primary-btn {
      margin-top: 20px;
      width: 136px; height: 38px; border-radius: 8px;
      display: grid; place-items: center;
      background: ${p.primary}; color: ${p.primaryForeground};
      font-size: 11px; font-weight: 760;
    }
    .viz-stage {
      position: relative;
      width: 292px;
      height: 252px;
      margin-left: auto;
      margin-right: 14px;
      display: grid;
      place-items: center;
    }
    .radar-chart svg { width: 100%; height: 100%; overflow: visible; }
    .radar-grid { fill: ${theme === "light" ? "#F4F8FF" : "#202020"}; stroke: ${p.border}; stroke-width: 1; }
    .radar-axis { stroke: ${p.border}; stroke-width: 1; }
    .radar-fill { fill: ${p.primary}; fill-opacity: ${theme === "light" ? "0.2" : "0.28"}; stroke: ${p.primary}; stroke-width: 2.5; }
    .radar-point { fill: ${p.primary}; stroke: ${p.card}; stroke-width: 3; }
    .radar-label {
      position: absolute;
      color: ${p.mutedForeground};
      font-size: 10px;
      font-weight: 680;
      white-space: nowrap;
    }
    .radar-label.top { top: 4px; left: 122px; }
    .radar-label.right-top { top: 74px; right: 2px; }
    .radar-label.right-bottom { right: 24px; bottom: 24px; }
    .radar-label.left-bottom { left: 24px; bottom: 24px; }
    .radar-label.left-top { top: 74px; left: 2px; }
    .hero-meta { position: absolute; left: 34px; bottom: 32px; display: flex; gap: 18px; font-size: 10px; color: ${p.mutedForeground}; }
    .queue { height: 338px; padding: 24px; }
    .queue h2, .mini h3, .wide h3 { margin: 0; font-size: 16px; letter-spacing: 0; }
    .queue p, .mini p, .wide p { margin: 6px 0 0; font-size: 11px; color: ${p.mutedForeground}; }
    .task { height: 48px; border-radius: 10px; border: 1px solid ${p.border}; display: flex; align-items: center; gap: 12px; padding: 0 12px; margin-top: 16px; }
    .task:first-of-type { background: ${p.accent}; border-color: transparent; }
    .task-num { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: ${p.primary}; color: ${p.primaryForeground}; font-size: 12px; font-weight: 760; }
    .task:not(:first-of-type) .task-num { background: ${theme === "light" ? p.muted : "#333333"}; color: ${p.mutedForeground}; }
    .task-text { font-size: 12px; font-weight: 760; }
    .cards { margin-top: 32px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; }
    .mini { height: 230px; padding: 22px; }
    .bars { height: 92px; margin-top: 36px; display: flex; align-items: end; gap: 10px; }
    .bar { flex: 1; border-radius: 5px; background: ${p.chartSoft}; }
    .bar:nth-child(2) { height: 62px; background: ${p.chartMid}; opacity: 0.62; }
    .bar:nth-child(3) { height: 54px; background: ${p.chartMid}; opacity: 0.78; }
    .bar:nth-child(4) { height: 78px; background: ${p.chartStrong}; opacity: 1; }
    .bar:nth-child(5) { height: 48px; background: ${p.chartSoft}; opacity: 0.82; }
    .donut { width: 112px; height: 112px; border-radius: 50%; background: conic-gradient(${p.chartStrong} 0 205deg, ${p.chartMid} 205deg 285deg, ${p.chartTrack} 285deg); mask: radial-gradient(circle, transparent 50%, #000 51%); }
    .mini-row { margin-top: 28px; display: flex; gap: 24px; align-items: center; }
    .legend { display: grid; gap: 10px; font-size: 11px; }
    .legend div::before { content: ""; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${p.primary}; margin-right: 8px; }
    .key-number { width: 82px; height: 82px; border-radius: 16px; background: ${p.accent}; display: grid; place-items: center; color: ${p.primary}; font-size: 34px; font-weight: 780; }
    .wide { margin-top: 34px; height: 210px; padding: 22px; }
    .event-row { margin-top: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
    .event { height: 114px; border-radius: 10px; background: ${theme === "light" ? p.muted : "#202020"}; padding: 16px; }
    .event b { display: block; font-size: 12px; margin-bottom: 12px; }
    .event span { font-size: 11px; color: ${p.mutedForeground}; }
    .coverage { grid-column: span 2; }
    .coverage-row { display: grid; grid-template-columns: 72px 1fr 42px; align-items: center; gap: 14px; margin-top: 22px; font-size: 11px; }
    .track { height: 10px; border-radius: 999px; background: ${theme === "light" ? "#EAF2FF" : "#333333"}; overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; background: ${p.chartStrong}; }
    .bubble-row { height: 108px; display: flex; align-items: center; gap: 20px; margin-top: 18px; }
    .bubble { border-radius: 50%; background: ${p.chartStrong}; }
    .role-card .mini-row { justify-content: center; margin-top: 24px; }
    .role-card p { text-align: center; }
    .floating {
      position: absolute; right: 34px; bottom: 40px;
      width: 56px; height: 56px; border-radius: 50%;
      background: ${p.primary}; color: ${p.primaryForeground};
      display: grid; place-items: center; font-size: 24px; font-weight: 780;
      box-shadow: 0 18px 45px rgba(57, 129, 246, 0.35);
    }
    .float-tip {
      position: absolute; right: 108px; bottom: 52px;
      height: 32px; padding: 0 14px; border-radius: 8px;
      border: 1px solid ${p.border}; background: ${p.card}; color: ${p.foreground};
      display: grid; place-items: center; font-size: 12px;
    }
  `
}

const mobileCss = (theme) => {
  const p = palettes[theme]
  return `
    * { box-sizing: border-box; }
    body {
      margin: 0;
      width: 390px;
      height: 844px;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", sans-serif;
      background: ${p.background};
      color: ${p.foreground};
    }
    .mobile-screen { width: 390px; height: 844px; background: ${p.surface}; position: relative; overflow: hidden; }
    .mobile-topbar {
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14px;
      background: ${p.card};
      border-bottom: 1px solid ${p.border};
    }
    .mobile-top-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .menu { font-size: 20px; color: ${p.mutedForeground}; }
    .separator { width: 1px; height: 18px; background: ${p.border}; }
    .crumb { display: flex; align-items: center; gap: 6px; font-size: 11px; color: ${p.mutedForeground}; white-space: nowrap; }
    .crumb strong { color: ${p.foreground}; }
    .theme-btn {
      width: 34px; height: 34px; border-radius: 9px;
      display: grid; place-items: center;
      color: ${p.primary};
      background: ${theme === "light" ? p.accent : p.sidebarAccent};
      font-weight: 760;
      flex-shrink: 0;
    }
    main { height: 784px; padding: 14px; overflow: hidden; position: relative; }
    .mobile-grid { display: grid; gap: 14px; }
    .card {
      border: 1px solid ${p.border};
      background: ${p.card};
      border-radius: 14px;
      box-shadow: ${p.shadow};
    }
    .hero { height: 318px; padding: 18px; position: relative; overflow: hidden; }
    .score { display: flex; align-items: end; gap: 7px; }
    .score-num { font-size: 50px; line-height: 0.9; font-weight: 780; letter-spacing: 0; }
    .score-total { font-size: 14px; font-weight: 760; color: ${p.mutedForeground}; padding-bottom: 4px; }
    .desc { margin-top: 15px; width: 174px; font-size: 11px; line-height: 1.55; color: ${p.mutedForeground}; }
    .primary-btn {
      margin-top: 16px;
      width: 116px; height: 34px; border-radius: 8px;
      display: grid; place-items: center;
      background: ${p.primary}; color: ${p.primaryForeground};
      font-size: 11px; font-weight: 760;
    }
    .viz-stage {
      position: absolute;
      right: 6px;
      top: 62px;
      width: 182px;
      height: 158px;
      display: grid;
      place-items: center;
    }
    .radar-chart svg { width: 100%; height: 100%; overflow: visible; }
    .radar-grid { fill: ${theme === "light" ? "#F4F8FF" : "#202020"}; stroke: ${p.border}; stroke-width: 1; }
    .radar-axis { stroke: ${p.border}; stroke-width: 1; }
    .radar-fill { fill: ${p.primary}; fill-opacity: ${theme === "light" ? "0.2" : "0.28"}; stroke: ${p.primary}; stroke-width: 2.5; }
    .radar-point { fill: ${p.primary}; stroke: ${p.card}; stroke-width: 3; }
    .radar-label {
      position: absolute;
      color: ${p.mutedForeground};
      font-size: 8px;
      font-weight: 680;
      white-space: nowrap;
    }
    .radar-label.top { top: 2px; left: 77px; }
    .radar-label.right-top { top: 46px; right: 0; }
    .radar-label.right-bottom { right: 12px; bottom: 13px; }
    .radar-label.left-bottom { left: 12px; bottom: 13px; }
    .radar-label.left-top { top: 46px; left: 0; }
    .hero-meta { position: absolute; left: 18px; bottom: 18px; display: flex; gap: 12px; font-size: 10px; color: ${p.mutedForeground}; }
    .queue { padding: 18px; }
    .queue h2, .mini h3 { margin: 0; font-size: 15px; letter-spacing: 0; }
    .queue p, .mini p { margin: 5px 0 0; font-size: 11px; color: ${p.mutedForeground}; }
    .task { height: 42px; border-radius: 10px; border: 1px solid ${p.border}; display: flex; align-items: center; gap: 10px; padding: 0 10px; margin-top: 12px; }
    .task:first-of-type { background: ${p.accent}; border-color: transparent; }
    .task-num { width: 24px; height: 24px; border-radius: 7px; display: grid; place-items: center; background: ${p.primary}; color: ${p.primaryForeground}; font-size: 11px; font-weight: 760; }
    .task:not(:first-of-type) .task-num { background: ${theme === "light" ? p.muted : "#333333"}; color: ${p.mutedForeground}; }
    .task-text { font-size: 12px; font-weight: 760; }
    .mobile-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .mini { height: 146px; padding: 16px; overflow: hidden; }
    .bars { height: 56px; margin-top: 20px; display: flex; align-items: end; gap: 7px; }
    .bar { flex: 1; border-radius: 5px; background: ${p.chartSoft}; }
    .bar:nth-child(2) { height: 42px; background: ${p.chartMid}; opacity: 0.62; }
    .bar:nth-child(3) { height: 34px; background: ${p.chartMid}; opacity: 0.78; }
    .bar:nth-child(4) { height: 52px; background: ${p.chartStrong}; opacity: 1; }
    .bar:nth-child(5) { height: 30px; background: ${p.chartSoft}; opacity: 0.82; }
    .donut { width: 62px; height: 62px; border-radius: 50%; background: conic-gradient(${p.chartStrong} 0 205deg, ${p.chartMid} 205deg 285deg, ${p.chartTrack} 285deg); mask: radial-gradient(circle, transparent 50%, #000 51%); }
    .mini-row { margin-top: 16px; display: flex; gap: 12px; align-items: center; }
    .legend { display: grid; gap: 6px; font-size: 9px; color: ${p.mutedForeground}; }
    .legend div::before { content: ""; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${p.primary}; margin-right: 5px; }
    .coverage-row { display: grid; grid-template-columns: 42px 1fr 28px; align-items: center; gap: 7px; margin-top: 13px; font-size: 9px; }
    .track { height: 8px; border-radius: 999px; background: ${theme === "light" ? "#EAF2FF" : "#333333"}; overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; background: ${p.chartStrong}; }
    .bubble-row { height: 56px; display: flex; align-items: center; gap: 10px; margin-top: 15px; }
    .bubble { border-radius: 50%; background: ${p.chartStrong}; }
    .floating {
      position: absolute; right: 18px; bottom: 18px;
      width: 48px; height: 48px; border-radius: 50%;
      background: ${p.primary}; color: ${p.primaryForeground};
      display: grid; place-items: center; font-size: 21px; font-weight: 780;
      box-shadow: 0 18px 45px rgba(57, 129, 246, 0.35);
    }
  `
}

const nav = () => `
  <div class="brand">
    <div class="mark">L</div>
    <div><div class="brand-title">Lever Admin</div><div class="brand-sub">身份与权限控制台</div></div>
  </div>
  ${[
    ["概览", [["工作台", "□", true]]],
    [
      "账号设置",
      [
        ["个人资料", "○"],
        ["安全设置", "◇"],
        ["我的会话", "▭"]
      ]
    ],
    [
      "组织",
      [
        ["组织管理", "▦"],
        ["成员", "◎"],
        ["团队", "◇"]
      ]
    ],
    [
      "管理",
      [
        ["管理概览", "⚙"],
        ["API Key", "#"]
      ]
    ]
  ]
    .map(
      ([label, items]) =>
        `<div class="nav-group"><div class="nav-label">${label}</div>${items
          .map(
            ([name, icon, active]) =>
              `<div class="nav-item ${active ? "active" : ""}">${active ? '<span class="nav-bar"></span>' : ""}<span class="nav-icon">${icon}</span><span>${name}</span></div>`
          )
          .join("")}</div>`
    )
    .join("")}
  <div class="dock"><div class="avatar">李</div><div><div class="dock-name">李明</div><div class="dock-email">liming@example.com</div></div><div class="dock-chev">⌃</div></div>
`

const shell = (theme, mode) => {
  const isOrg = mode === "org"
  return `
    <!doctype html><html><head><meta charset="utf-8"><style>${css(theme)}</style></head>
    <body><div class="screen">
      <aside class="sidebar">${nav()}</aside>
      <section class="app">
        <header class="topbar">
          <div class="top-left"><div class="menu">☰</div><div class="separator"></div><div class="crumb"><span>首页</span><span>/</span><strong>工作台</strong></div></div>
          <div class="theme-btn">${theme === "light" ? "☼" : "☾"}</div>
        </header>
        <main>
          ${isOrg ? orgContent() : personalContent()}
          ${isOrg ? '<div class="float-tip">切换视角</div><div class="floating">⇄</div>' : ""}
        </main>
      </section>
    </div></body></html>
  `
}

const mobileShell = (theme, mode) => {
  const isOrg = mode === "org"
  return `
    <!doctype html><html><head><meta charset="utf-8"><style>${mobileCss(theme)}</style></head>
    <body><div class="mobile-screen">
      <header class="mobile-topbar">
        <div class="mobile-top-left"><div class="menu">☰</div><div class="separator"></div><div class="crumb"><span>首页</span><span>/</span><strong>工作台</strong></div></div>
        <div class="theme-btn">${theme === "light" ? "☼" : "☾"}</div>
      </header>
      <main>
        ${isOrg ? mobileOrgContent() : mobilePersonalContent()}
        ${isOrg ? '<div class="floating">⇄</div>' : ""}
      </main>
    </div></body></html>
  `
}

const radarChart = ({ ariaLabel, labels, points }) => `
  <div class="viz-stage radar-chart">
    <svg viewBox="0 0 292 252" role="img" aria-label="${ariaLabel}">
      <polygon class="radar-grid" points="146,22 255,101 213,226 79,226 37,101" />
      <polygon class="radar-grid" points="146,58 221,112 192,198 100,198 71,112" />
      <polygon class="radar-grid" points="146,94 187,124 171,170 121,170 105,124" />
      <line class="radar-axis" x1="146" y1="22" x2="146" y2="126" />
      <line class="radar-axis" x1="255" y1="101" x2="146" y2="126" />
      <line class="radar-axis" x1="213" y1="226" x2="146" y2="126" />
      <line class="radar-axis" x1="79" y1="226" x2="146" y2="126" />
      <line class="radar-axis" x1="37" y1="101" x2="146" y2="126" />
      <polygon class="radar-fill" points="${points.map(([x, y]) => `${x},${y}`).join(" ")}" />
      ${points.map(([x, y]) => `<circle class="radar-point" cx="${x}" cy="${y}" r="5" />`).join("")}
    </svg>
    <span class="radar-label top">${labels[0]}</span>
    <span class="radar-label right-top">${labels[1]}</span>
    <span class="radar-label right-bottom">${labels[2]}</span>
    <span class="radar-label left-bottom">${labels[3]}</span>
    <span class="radar-label left-top">${labels[4]}</span>
  </div>
`

const personalRadar = () =>
  radarChart({
    ariaLabel: "个人安全维度雷达图",
    labels: ["邮箱", "2FA", "Passkey", "会话", "OAuth"],
    points: [
      [146, 42],
      [229, 107],
      [190, 190],
      [95, 203],
      [58, 106]
    ]
  })

const organizationRadar = () =>
  radarChart({
    ariaLabel: "组织治理维度雷达图",
    labels: ["成员", "邀请", "团队", "会话", "Key"],
    points: [
      [146, 54],
      [214, 111],
      [184, 198],
      [88, 190],
      [64, 108]
    ]
  })

const personalContent = () => `
  <div class="grid-top">
    <section class="card hero">
      <div>
        <div class="score"><div class="score-num">82</div><div class="score-total">/ 100</div></div>
        <div class="desc">你的账号安全状态良好。建议补齐双因素认证和 Passkey，让恢复与登录链路更稳。</div>
        <div class="primary-btn">提升安全性</div>
      </div>
      ${personalRadar()}
      <div class="hero-meta"><span>3 台设备</span><span>1 个邀请</span></div>
    </section>
    <section class="card queue">
      <h2>我的安全待办</h2><p>只展示与你直接相关的处理项</p>
      ${["开启 2FA", "添加 Passkey", "处理组织邀请", "检查长期会话"].map((text, i) => `<div class="task"><div class="task-num">${i + 1}</div><div class="task-text">${text}</div></div>`).join("")}
    </section>
  </div>
  <div class="cards">
    <section class="card mini"><h3>设备足迹</h3><p>近 30 天登录设备保持稳定</p><div class="bars">${[42, 62, 54, 78, 48].map((h) => `<div class="bar" style="height:${h}px"></div>`).join("")}</div><b>3 台活跃设备</b></section>
    <section class="card mini"><h3>登录方式画像</h3><p>密码与 OAuth 组合使用</p><div class="mini-row"><div class="donut"></div><div class="legend"><div>密码 58%</div><div>OAuth 31%</div><div>Passkey 11%</div></div></div></section>
    <section class="card mini"><h3>个人 API Key 状态</h3><p>凭证暴露面维持在低风险</p><div class="mini-row"><div class="key-number">2</div><div class="legend"><div>1 个 30 天内使用</div><div>0 个即将过期</div><div>0 个高权限 Scope</div></div></div></section>
  </div>
  <section class="card wide"><h3>最近身份事件</h3><div class="event-row"><div class="event"><b>登录成功</b><span>Chrome · 上海 · 12 分钟前</span></div><div class="event"><b>组织邀请待处理</b><span>客户成功 · viewer · 2 天后过期</span></div><div class="event"><b>API Key 使用</b><span>cli-prod · 3 小时前</span></div></div></section>
`

const orgContent = () => `
  <div class="grid-top">
    <section class="card hero">
      <div>
        <div class="score"><div class="score-num">76</div><div class="score-total">/ 100</div></div>
        <div class="desc">组织身份治理整体稳定，但成员安全覆盖和邀请流转仍有优化空间。</div>
        <div class="primary-btn">查看治理建议</div>
      </div>
      ${organizationRadar()}
      <div class="hero-meta"><span>12 名成员</span><span>5 个邀请</span><span>1 个风险 Key</span></div>
    </section>
    <section class="card queue">
      <h2>治理行动队列</h2><p>只展示组织管理员可处理事项</p>
      ${["未开启 2FA 成员", "过期或临期邀请", "异常会话待检查", "即将过期 API Key"].map((text, i) => `<div class="task"><div class="task-num">${[3, 5, 2, 1][i]}</div><div class="task-text">${text}</div></div>`).join("")}
    </section>
  </div>
  <div class="cards">
    <section class="card mini coverage"><h3>成员安全覆盖</h3><p>邮箱验证、2FA、Passkey 采用率</p>${[
      ["邮箱验证", "88%", 88],
      ["2FA", "61%", 61],
      ["Passkey", "42%", 42]
    ]
      .map(
        ([label, val, width]) => `<div class="coverage-row"><span>${label}</span><div class="track"><div class="fill" style="width:${width}%"></div></div><span>${val}</span></div>`
      )
      .join("")}</section>
    <section class="card mini role-card"><h3>权限分布</h3><div class="mini-row"><div class="donut"></div></div><p>owner/admin 占比 25%</p></section>
    <section class="card mini"><h3>团队结构</h3><p>识别空团队与超大团队</p><div class="bubble-row"><div class="bubble" style="width:72px;height:72px"></div><div class="bubble" style="width:54px;height:54px;opacity:.75"></div><div class="bubble" style="width:38px;height:38px;opacity:.55"></div></div><p>研发团队偏大，建议拆分权限域。</p></section>
  </div>
`

const mobilePersonalContent = () => `
  <div class="mobile-grid">
    <section class="card hero">
      <div class="score"><div class="score-num">82</div><div class="score-total">/ 100</div></div>
      <div class="desc">你的账号安全状态良好。建议补齐双因素认证和 Passkey。</div>
      <div class="primary-btn">提升安全性</div>
      ${personalRadar()}
      <div class="hero-meta"><span>3 台设备</span><span>1 个邀请</span></div>
    </section>
    <section class="card queue">
      <h2>我的安全待办</h2><p>只展示与你直接相关的处理项</p>
      ${["开启 2FA", "添加 Passkey", "处理组织邀请"].map((text, i) => `<div class="task"><div class="task-num">${i + 1}</div><div class="task-text">${text}</div></div>`).join("")}
    </section>
    <div class="mobile-cards">
      <section class="card mini"><h3>设备足迹</h3><p>近 30 天登录稳定</p><div class="bars">${[32, 42, 34, 52, 30].map((h) => `<div class="bar" style="height:${h}px"></div>`).join("")}</div></section>
      <section class="card mini"><h3>登录方式</h3><p>密码与 OAuth 组合</p><div class="mini-row"><div class="donut"></div><div class="legend"><div>密码 58%</div><div>OAuth 31%</div></div></div></section>
    </div>
  </div>
`

const mobileOrgContent = () => `
  <div class="mobile-grid">
    <section class="card hero">
      <div class="score"><div class="score-num">76</div><div class="score-total">/ 100</div></div>
      <div class="desc">组织身份治理整体稳定，但成员安全覆盖仍有优化空间。</div>
      <div class="primary-btn">治理建议</div>
      ${organizationRadar()}
      <div class="hero-meta"><span>12 名成员</span><span>5 个邀请</span><span>1 个风险 Key</span></div>
    </section>
    <section class="card queue">
      <h2>治理行动队列</h2><p>组织管理员可处理事项</p>
      ${["未开启 2FA 成员", "过期或临期邀请", "异常会话待检查"].map((text, i) => `<div class="task"><div class="task-num">${[3, 5, 2][i]}</div><div class="task-text">${text}</div></div>`).join("")}
    </section>
    <div class="mobile-cards">
      <section class="card mini"><h3>成员覆盖</h3><p>安全能力采用率</p>${[
        ["邮箱", "88%", 88],
        ["2FA", "61%", 61],
        ["Key", "42%", 42]
      ]
        .map(
          ([label, val, width]) =>
            `<div class="coverage-row"><span>${label}</span><div class="track"><div class="fill" style="width:${width}%"></div></div><span>${val}</span></div>`
        )
        .join("")}</section>
      <section class="card mini"><h3>权限分布</h3><p>owner/admin 占比</p><div class="mini-row"><div class="donut"></div><div class="legend"><div>管理员 25%</div><div>成员 75%</div></div></div></section>
    </div>
  </div>
`

await mkdir(outDir, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ deviceScaleFactor: 1 })

for (const spec of [
  ["personal-light", "light", "personal"],
  ["personal-dark", "dark", "personal"],
  ["organization-light", "light", "org"],
  ["organization-dark", "dark", "org"]
]) {
  const [name, theme, mode] = spec
  await page.setViewportSize({ width: 1440, height: 1024 })
  await page.setContent(shell(theme, mode), { waitUntil: "load" })
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false })
}

for (const spec of [
  ["personal-light-mobile", "light", "personal"],
  ["personal-dark-mobile", "dark", "personal"],
  ["organization-light-mobile", "light", "org"],
  ["organization-dark-mobile", "dark", "org"]
]) {
  const [name, theme, mode] = spec
  await page.setViewportSize({ width: 390, height: 844 })
  await page.setContent(mobileShell(theme, mode), { waitUntil: "load" })
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: false })
}

await browser.close()
