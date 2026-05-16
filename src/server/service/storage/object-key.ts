import "server-only"

import path from "node:path"

import { TRPCError } from "@trpc/server"

export const assertStorageObjectKey = (key: string) => {
  const segments = key.split("/")

  if (!key.trim() || path.isAbsolute(key) || key.includes("\\") || segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "文件存储路径无效。" })
  }
}

export const encodeKeyForUrl = (key: string) => {
  assertStorageObjectKey(key)

  return key.split("/").map(encodeURIComponent).join("/")
}
