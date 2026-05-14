type GoogleRecaptcha = {
  execute: (siteKey: string, options: { action: string }) => Promise<string>
  ready: (callback: () => void) => void
}

declare global {
  interface Window {
    grecaptcha?: GoogleRecaptcha
  }
}

const recaptchaScriptId = "google-recaptcha-v3"

const getSiteKey = () => process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SITE_KEY?.trim() || null
const getScriptHost = () => process.env.NEXT_PUBLIC_GOOGLE_RECAPTCHA_SCRIPT_HOST ?? "www.google.com"

const isCaptchaEnabled = () => process.env.NODE_ENV !== "test" && Boolean(getSiteKey())

const loadRecaptchaScript = async (siteKey: string) => {
  if (window.grecaptcha) {
    return
  }

  const existingScript = document.getElementById(recaptchaScriptId)

  if (existingScript) {
    await new Promise<void>((resolve, reject) => {
      existingScript.addEventListener("load", () => resolve(), { once: true })
      existingScript.addEventListener("error", () => reject(new Error("Google reCAPTCHA 加载失败。")), { once: true })
    })
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script")
    script.async = true
    script.defer = true
    script.id = recaptchaScriptId
    script.src = `https://${getScriptHost()}/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`
    script.addEventListener("load", () => resolve(), { once: true })
    script.addEventListener("error", () => reject(new Error("Google reCAPTCHA 加载失败。")), { once: true })
    document.head.appendChild(script)
  })
}

export const getRecaptchaFetchOptions = async (action: "forgot_password" | "sign_in" | "sign_up") => {
  if (!isCaptchaEnabled()) {
    return undefined
  }

  const siteKey = getSiteKey()

  if (!siteKey) {
    return undefined
  }

  await loadRecaptchaScript(siteKey)

  const token = await new Promise<string>((resolve, reject) => {
    const recaptcha = window.grecaptcha

    if (!recaptcha) {
      reject(new Error("Google reCAPTCHA 未初始化。"))
      return
    }

    recaptcha.ready(() => {
      recaptcha.execute(siteKey, { action }).then(resolve).catch(reject)
    })
  })

  return {
    headers: {
      "x-captcha-response": token
    }
  }
}
