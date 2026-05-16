import { Buffer } from "node:buffer"

import { TRPCError } from "@trpc/server"

import { UPLOAD_PURPOSE_AVATAR } from "@/lib/const"
import { assertAllowedImageUpload, uploadObject } from "@/server/service/storage/storage-service"
import { assertUploadFileSize, assertUploadRequestSize, getUploadSession, toErrorResponse } from "../_lib/upload-auth"

export const runtime = "nodejs"

export const POST = async (request: Request) => {
  try {
    assertUploadRequestSize(request)
    const session = await getUploadSession(request)
    const formData = await request.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "请选择要上传的头像文件。" })
    }

    assertUploadFileSize(file)
    const extension = assertAllowedImageUpload({ contentType: file.type, size: file.size })
    const body = Buffer.from(await file.arrayBuffer())
    const result = await uploadObject({
      body,
      contentType: file.type,
      extension,
      filenamePrefix: session.user.id,
      purpose: UPLOAD_PURPOSE_AVATAR
    })

    return Response.json(result)
  } catch (error) {
    const responseError = error instanceof Error ? error : new Error("upload_failed")

    return toErrorResponse(responseError)
  }
}
