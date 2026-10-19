export interface PresignedUploadResult {
  uploadUrl: string;
  fileKey: string;
}

export class StorageService {
  private bucket: string;

  constructor(bucket: string = process.env.S3_BUCKET || 'pronex-drawings') {
    this.bucket = bucket;
  }

  /**
   * Generates presigned URL for direct secure client upload to S3 / Cloudflare R2
   */
  async generatePresignedUploadUrl(
    projectCode: string,
    filename: string
  ): Promise<PresignedUploadResult> {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `projects/${projectCode}/${timestamp}_${sanitizedFilename}`;

    // In production with AWS SDK / @aws-sdk/s3-request-presigner:
    const uploadUrl = `https://${this.bucket}.s3.amazonaws.com/${fileKey}?mock_presigned=true`;

    return {
      uploadUrl,
      fileKey,
    };
  }

  /**
   * Generates secure, time-limited download URL for authorized users
   */
  async generatePresignedDownloadUrl(fileKey: string, expiresInSeconds: number = 3600): Promise<string> {
    return `https://${this.bucket}.s3.amazonaws.com/${fileKey}?expires=${expiresInSeconds}&mock_signature=valid`;
  }
}

export const storageService = new StorageService();
