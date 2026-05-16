import "server-only"

import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import path from "node:path"

import { TRPCError } from "@trpc/server"

import { STORAGE_PROVIDER_LOCAL } from "@/lib/const"
import { assertStorageObjectKey, encodeKeyForUrl } from "../object-key"
import type { StorageObjectInput, StorageProvider, StoredObject } from "../types"

const projectRoot = path.resolve(/*turbopackIgnore: true*/ process.cwd())

const normalizePublicBaseUrl = (value: string) => value.replace(/\/+$/, "")

const assertPathInside = ({ base, target }: { base: string; target: string }) => {
  const relative = path.relative(base, target)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "本地上传路径必须位于项目工作目录内。" })
  }
}

const resolveLocalRoot = (configuredPath: string) => {
  const resolved = path.resolve(/*turbopackIgnore: true*/ projectRoot, configuredPath)
  assertPathInside({ base: projectRoot, target: resolved })

  return resolved
}

export const getLocalStorageObjectPath = ({ key, localPath }: { key: string; localPath: string }) => {
  const root = resolveLocalRoot(localPath)
  assertStorageObjectKey(key)

  const resolved = path.resolve(/*turbopackIgnore: true*/ root, key)
  assertPathInside({ base: root, target: resolved })

  return resolved
}

export const readLocalStorageObject = async ({ key, localPath }: { key: string; localPath: string }) => {
  try {
    return await readFile(getLocalStorageObjectPath({ key, localPath }))
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({ code: "NOT_FOUND", message: "文件不存在。" })
  }
}

const wrapLocalOperation = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: "本地文件存储不可写，请检查上传路径权限。" })
  }
}

export const createLocalStorageProvider = ({ localPath, publicBaseUrl }: { localPath: string; publicBaseUrl: string }): StorageProvider => {
  const root = resolveLocalRoot(localPath)

  const resolveObjectPath = (key: string) => {
    assertStorageObjectKey(key)

    const resolved = path.resolve(root, key)
    assertPathInside({ base: root, target: resolved })

    return resolved
  }

  const getPublicUrl = (key: string) => {
    const encodedKey = encodeKeyForUrl(key)
    const baseUrl = normalizePublicBaseUrl(publicBaseUrl)

    return baseUrl ? `${baseUrl}/${encodedKey}` : `/api/uploads/local/${encodedKey}`
  }

  return {
    deleteObject: async (key) => {
      await wrapLocalOperation(async () => rm(resolveObjectPath(key), { force: true }))
    },
    getPublicUrl,
    putObject: async (input: StorageObjectInput): Promise<StoredObject> => {
      const objectPath = resolveObjectPath(input.key)

      await wrapLocalOperation(async () => {
        await mkdir(path.dirname(objectPath), { recursive: true })
        await writeFile(objectPath, input.body)
      })

      return {
        key: input.key,
        provider: STORAGE_PROVIDER_LOCAL,
        url: getPublicUrl(input.key)
      }
    }
  }
}
