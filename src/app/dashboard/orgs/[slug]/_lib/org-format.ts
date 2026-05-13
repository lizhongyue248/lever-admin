type DateInput = Date | string | number | null | undefined

const toDate = (date: DateInput) => {
  if (!date) {
    return null
  }

  const value = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(value.getTime())) {
    return null
  }

  return value
}

export const formatDate = (date: DateInput) => {
  const value = toDate(date)

  if (!value) {
    return "暂无"
  }

  return new Intl.DateTimeFormat("zh-CN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(value)
}

export const formatRelativeTime = (date: DateInput) => {
  const value = toDate(date)

  if (!value) {
    return "暂无"
  }

  const diffMinutes = Math.floor(Math.max(0, Date.now() - value.getTime()) / 60_000)

  if (diffMinutes < 1) {
    return "刚刚"
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} 分钟前`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours} 小时前`
  }

  return `${Math.floor(diffHours / 24)} 天前`
}
