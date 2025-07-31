import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME!

export interface PresignedUrlResponse {
  uploadUrl: string
  key: string
  fileUrl: string
}

/**
 * Generate a presigned URL for uploading files to S3
 */
export async function generatePresignedUploadUrl(
  filename: string,
  fileType: string,
  fileSizeBytes: number
): Promise<PresignedUrlResponse> {
  try {
    // Generate a unique key for the file
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const fileExtension = filename.split('.').pop()
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    
    const key = `media/${timestamp}-${randomString}-${sanitizedFilename}`
    
    // Create the S3 command for uploading
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSizeBytes,
      // Add metadata
      Metadata: {
        'original-filename': filename,
        'upload-timestamp': timestamp.toString(),
      },
      // Set cache control for better performance
      CacheControl: 'max-age=31536000', // 1 year
    })

    // Generate the presigned URL (expires in 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 300 // 5 minutes
    })

    // Construct the public URL for accessing the file
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

    return {
      uploadUrl,
      key,
      fileUrl,
    }
  } catch (error) {
    console.error('Error generating presigned URL:', error)
    throw new Error('Failed to generate upload URL')
  }
}

/**
 * Generate a presigned URL for downloading/viewing files from S3
 */
export async function generatePresignedDownloadUrl(key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    // Generate the presigned URL (expires in 1 hour)
    const downloadUrl = await getSignedUrl(s3Client, command, { 
      expiresIn: 3600 // 1 hour
    })

    return downloadUrl
  } catch (error) {
    console.error('Error generating presigned download URL:', error)
    throw new Error('Failed to generate download URL')
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    await s3Client.send(command)
  } catch (error) {
    console.error('Error deleting file from S3:', error)
    throw new Error('Failed to delete file')
  }
}

/**
 * Get file type category (image, video, etc.)
 */
export function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'other' {
  if (mimeType.startsWith('image/')) {
    return 'image'
  } else if (mimeType.startsWith('video/')) {
    return 'video'
  } else {
    return 'other'
  }
}

/**
 * Validate file type for our romantic gallery
 */
export function isValidFileType(mimeType: string): boolean {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    // Videos
    'video/mp4',
    'video/mov',
    'video/quicktime',
    'video/avi',
    'video/mkv',
    'video/webm',
  ]
  
  return allowedTypes.includes(mimeType.toLowerCase())
}

/**
 * Get max file size based on file type (in bytes)
 */
export function getMaxFileSize(mimeType: string): number {
  const fileCategory = getFileTypeCategory(mimeType)
  
  switch (fileCategory) {
    case 'image':
      return 10 * 1024 * 1024 // 10MB for images
    case 'video':
      return 100 * 1024 * 1024 // 100MB for videos
    default:
      return 5 * 1024 * 1024 // 5MB for other files
  }
}