import "server-only"

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { TRPCError } from "@trpc/server"

import { STORAGE_PROVIDER_S3 } from "@/lib/const"
import { assertStorageObjectKey, encodeKeyForUrl } from "../object-key"
import type { StorageObjectInput, StorageProvider, StoredObject } from "../types"

type S3StorageProviderInput = {
  accessKeyId: string
  bucket: string
  endpoint?: string
  forcePathStyle: boolean
  publicBaseUrl: string
  region: string
  secretAccessKey: string
}

const normalizePublicBaseUrl = (value: string) => value.replace(/\/+$/, "")

const getEndpointUrl = (endpoint: string) => {
  let parsed: URL

  try {
    parsed = new URL(endpoint)
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 Endpoint 配置无效。" })
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, "")

  return parsed
}

const getS3PublicUrl = ({ bucket, endpoint, forcePathStyle, key, publicBaseUrl, region }: S3StorageProviderInput & { key: string }) => {
  const encodedKey = encodeKeyForUrl(key)
  const normalizedPublicBaseUrl = normalizePublicBaseUrl(publicBaseUrl)

  if (normalizedPublicBaseUrl) {
    return `${normalizedPublicBaseUrl}/${encodedKey}`
  }

  if (endpoint) {
    const endpointUrl = getEndpointUrl(endpoint)

    if (forcePathStyle) {
      endpointUrl.pathname = `${endpointUrl.pathname}/${bucket}/${encodedKey}`.replace(/\/{2,}/g, "/")
      return endpointUrl.toString()
    }

    endpointUrl.hostname = `${bucket}.${endpointUrl.hostname}`
    endpointUrl.pathname = `${endpointUrl.pathname}/${encodedKey}`.replace(/\/{2,}/g, "/")

    return endpointUrl.toString()
  }

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`
}

const wrapS3Operation = async <T>(operation: () => Promise<T>) => {
  try {
    return await operation()
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error
    }

    throw new TRPCError({ code: "BAD_REQUEST", message: "S3 文件存储操作失败，请检查 Bucket、Endpoint、Region 和凭据。" })
  }
}

export const createS3StorageProvider = (input: S3StorageProviderInput): StorageProvider => {
  const client = new S3Client({
    credentials: {
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey
    },
    endpoint: input.endpoint || undefined,
    forcePathStyle: input.forcePathStyle,
    region: input.region
  })

  const getPublicUrl = (key: string) => getS3PublicUrl({ ...input, key })

  return {
    deleteObject: async (key) => {
      assertStorageObjectKey(key)
      await wrapS3Operation(() =>
        client.send(
          new DeleteObjectCommand({
            Bucket: input.bucket,
            Key: key
          })
        )
      )
    },
    getPublicUrl,
    putObject: async (objectInput: StorageObjectInput): Promise<StoredObject> => {
      assertStorageObjectKey(objectInput.key)
      await wrapS3Operation(() =>
        client.send(
          new PutObjectCommand({
            Body: objectInput.body,
            Bucket: input.bucket,
            ContentType: objectInput.contentType,
            Key: objectInput.key
          })
        )
      )

      return {
        key: objectInput.key,
        provider: STORAGE_PROVIDER_S3,
        url: getPublicUrl(objectInput.key)
      }
    }
  }
}
