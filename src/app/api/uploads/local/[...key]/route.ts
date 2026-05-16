import { TRPCError } from "@trpc/server"

import { readLocalUploadedObject } from "@/server/service/storage"

export const runtime = "nodejs"

const getStatusFromError = (error: TRPCError) => {
  if (error.code === "NOT_FOUND") {
    return 404
  }

  return 400
}

export const GET = async (_request: Request, { params }: { params: Promise<{ key: string[] }> }) => {
  try {
    const { key } = await params
    const objectKey = key.join("/")
    const object = await readLocalUploadedObject(objectKey)

    return new Response(object.body, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
        "Content-Type": object.contentType,
        "X-Content-Type-Options": "nosniff"
      }
    })
  } catch (error) {
    if (error instanceof TRPCError) {
      return Response.json({ message: error.message }, { status: getStatusFromError(error) })
    }

    return Response.json({ message: "文件不存在。" }, { status: 404 })
  }
}
