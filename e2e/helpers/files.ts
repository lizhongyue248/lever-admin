import { access } from "node:fs/promises"
import path from "node:path"

export const localUploadObjectExists = async ({ key, localPath = "./uploads" }: { key: string; localPath?: string }) => {
  const objectPath = path.resolve(process.cwd(), localPath, key)

  try {
    await access(objectPath)

    return true
  } catch {
    return false
  }
}
