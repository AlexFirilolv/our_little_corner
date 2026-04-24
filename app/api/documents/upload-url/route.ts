import { NextRequest } from 'next/server'
import { Storage } from '@google-cloud/storage'
import { requireLocketMembership, authErrorResponse } from '@/lib/auth-helpers'
import { randomUUID } from 'crypto'

let storageInstance: Storage | null = null

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME
  if (!bucketName) throw new Error('GCS_BUCKET_NAME is not defined')
  if (!storageInstance) {
    storageInstance = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    })
  }
  return storageInstance.bucket(bucketName)
}

/**
 * POST /api/documents/upload-url
 * Generate a resumable presigned URL for uploading a document to GCS.
 * Key path: lockets/<locket_id>/documents/<uuid>-<sanitized-filename>
 */
export async function POST(request: NextRequest) {
  let body: { locketId?: string; filename?: string; contentType?: string }
  try {
    body = await request.json()
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json({ error: 'invalid_json' }, { status: 400 })
    }
    throw err
  }
  try {
    const { locketId, filename, contentType } = body
    await requireLocketMembership(request, locketId ?? '')
    if (!filename || !contentType) {
      return Response.json({ error: 'missing_fields' }, { status: 400 })
    }
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `lockets/${locketId}/documents/${randomUUID()}-${sanitized}`
    const bucket = getBucket()
    const [uploadUrl] = await bucket.file(key).getSignedUrl({
      version: 'v4',
      action: 'resumable',
      expires: Date.now() + 5 * 60 * 1000,
      contentType,
    })
    return Response.json({ uploadUrl, gcs_key: key })
  } catch (err) {
    return authErrorResponse(err)
  }
}
