import "server-only"

export type EmailTemplateInfoRow = {
  label: string
  value: string
}

export type EmailTemplateLayoutInput = {
  actionLabel: string
  actionUrl: string
  body: string
  infoRows: EmailTemplateInfoRow[]
  preview: string
  securityNote: string
  title: string
}

export const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;")

const normalizeActionUrl = (actionUrl: string) => {
  const normalizedActionUrl = actionUrl.trim()

  if (normalizedActionUrl.startsWith("/") && !normalizedActionUrl.startsWith("//")) {
    return normalizedActionUrl
  }

  try {
    const url = new URL(normalizedActionUrl)

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.href
    }
  } catch {
    throw new Error("Email actionUrl must be an http(s) URL or a root-relative path.")
  }

  throw new Error("Email actionUrl must be an http(s) URL or a root-relative path.")
}

const renderInfoRows = (rows: EmailTemplateInfoRow[]) =>
  rows
    .map(
      (row) => `
        <tr class="email-info-row">
          <td class="email-info-label" style="padding:4px 0;color:#667085;font-size:13px;line-height:20px;width:112px;vertical-align:top;">${escapeHtml(row.label)}</td>
          <td class="email-info-value" style="padding:4px 0;color:#111827;font-size:13px;line-height:20px;font-weight:600;vertical-align:top;">${escapeHtml(row.value)}</td>
        </tr>`
    )
    .join("")

export const renderEmailLayout = (input: EmailTemplateLayoutInput) => {
  const actionUrl = escapeHtml(normalizeActionUrl(input.actionUrl))

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(input.title)}</title>
    <style>
      :root { color-scheme: light dark; supported-color-schemes: light dark; }
      @media (prefers-color-scheme: dark) {
        body, .email-canvas { background:#141414 !important; }
        .email-card { background:#262626 !important; border-color:#3A3A3A !important; }
        .email-divider { background:#3A3A3A !important; }
        .email-panel, .email-note { background:#1F1F1F !important; border-color:#3A3A3A !important; }
        .email-logo-mark { background:#1D2B44 !important; color:#93C5FD !important; }
        .email-link-panel { background:#1D2B44 !important; }
        .email-title, .email-strong, .email-brand, .email-info-value { color:#FFFFFF !important; }
        .email-muted, .email-copy, .email-footer, .email-info-label { color:#A3A3A3 !important; }
        .email-link { color:#93C5FD !important; }
      }
      @media (max-width: 520px) {
        .email-canvas { padding:18px 10px !important; }
        .email-wrap { width:100% !important; }
        .email-section { padding-left:22px !important; padding-right:22px !important; }
        .email-button { display:block !important; width:100% !important; box-sizing:border-box !important; }
        .email-info-label, .email-info-value { display:block !important; width:100% !important; box-sizing:border-box !important; }
        .email-info-value { padding-top:0 !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#F4F7FB;">
    <div class="email-canvas" style="background:#F4F7FB;padding:32px 16px;">
      <div class="email-wrap email-card" style="width:640px;max-width:100%;margin:0 auto;background:#FFFFFF;border:1px solid #D9E2EC;border-radius:8px;overflow:hidden;font-family:Inter,Arial,sans-serif;">
        <div style="height:6px;background:#2563EB;"></div>
        <div class="email-section" style="padding:26px 40px 24px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="width:38px;">
                <div class="email-logo-mark" style="width:38px;height:38px;border-radius:8px;background:#EAF2FF;color:#2563EB;font-size:18px;font-weight:800;line-height:38px;text-align:center;">L</div>
              </td>
              <td style="padding-left:12px;">
                <div class="email-brand" style="color:#111827;font-size:17px;font-weight:700;line-height:22px;">Lever Admin</div>
                <div class="email-muted" style="color:#667085;font-size:12px;line-height:18px;">Identity and access management</div>
              </td>
            </tr>
          </table>
        </div>
        <div class="email-divider" style="height:1px;background:#D9E2EC;"></div>
        <div class="email-section" style="padding:34px 40px;">
          <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(input.preview)}</div>
          <h1 class="email-title" style="margin:0 0 10px 0;color:#111827;font-size:28px;line-height:34px;font-weight:700;">${escapeHtml(input.title)}</h1>
          <p class="email-copy" style="margin:0 0 22px 0;color:#667085;font-size:15px;line-height:24px;">${escapeHtml(input.body)}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px 0;border-collapse:separate;border-spacing:0;">
            <tr>
              <td class="email-panel" style="background:#F8FAFC;border:1px solid #D9E2EC;border-radius:8px;padding:12px 16px;">
                <table class="email-info-table" role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${renderInfoRows(input.infoRows)}
                </table>
              </td>
            </tr>
          </table>
          <a class="email-button" href="${actionUrl}" style="display:inline-block;margin:0 0 22px 0;background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;line-height:20px;font-weight:700;padding:12px 28px;border-radius:6px;text-align:center;">${escapeHtml(input.actionLabel)}</a>
          <div class="email-link-panel" style="margin:0 0 14px 0;background:#EAF2FF;border-radius:8px;padding:14px;">
            <div class="email-strong" style="color:#111827;font-size:12px;line-height:18px;font-weight:600;">如果按钮无法打开，请复制以下链接到浏览器：</div>
            <div class="email-link" style="color:#2563EB;font-size:12px;line-height:18px;word-break:break-all;">${actionUrl}</div>
          </div>
          <div class="email-note" style="background:#F9FAFB;border:1px solid #D9E2EC;border-radius:8px;padding:14px;">
            <div class="email-muted" style="color:#667085;font-size:12px;line-height:18px;">${escapeHtml(input.securityNote)}</div>
          </div>
        </div>
        <div class="email-divider" style="height:1px;background:#D9E2EC;"></div>
        <div class="email-section" style="padding:20px 40px 26px 40px;text-align:center;">
          <div class="email-footer" style="color:#667085;font-size:12px;line-height:18px;">Lever Admin · 安全身份管理</div>
          <div class="email-footer" style="color:#667085;font-size:12px;line-height:18px;">这是一封自动发送的事务邮件，请勿直接回复。</div>
        </div>
      </div>
    </div>
  </body>
</html>`
}

export const renderPlainTextEmail = (input: EmailTemplateLayoutInput) => {
  const actionUrl = normalizeActionUrl(input.actionUrl)
  const lines = [
    "Lever Admin",
    "",
    input.title,
    "",
    input.body,
    "",
    ...input.infoRows.flatMap((row) => [`${row.label}: ${row.value}`]),
    "",
    `${input.actionLabel}: ${actionUrl}`,
    "",
    input.securityNote,
    "",
    "这是一封自动发送的事务邮件，请勿直接回复。"
  ]

  return lines.join("\n")
}
