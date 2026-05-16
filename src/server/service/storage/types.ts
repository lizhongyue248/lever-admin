import type { PlatformStorageProviderName, UploadPurpose } from "@/lib/const"

export type StorageObjectInput = { body: Buffer; contentType: string; key: string }
export type StoredObject = { key: string; provider: PlatformStorageProviderName; url: string }
export type StorageProvider = {
  deleteObject: (key: string) => Promise<void>
  getPublicUrl: (key: string) => string
  putObject: (input: StorageObjectInput) => Promise<StoredObject>
}
export type StorageUploadInput = {
  body: Buffer
  contentType: string
  extension: string
  filenamePrefix: string
  purpose: UploadPurpose
}
