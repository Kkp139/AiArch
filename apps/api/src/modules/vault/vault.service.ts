import { parseFileName, isAllowedFileType, sanitizeOriginalDownloadUrl } from './naming.service';
import { storageService } from '../../services/storage.service';

export class VaultService {
  async prepareUpload(projectCode: string, filename: string) {
    if (!isAllowedFileType(filename)) {
      throw new Error(`File type not allowed. Allowed types: .pdf, .dwg, .dxf, .dgn, .jpg, .jpeg, .png, .webp`);
    }

    const parseResult = parseFileName(filename, projectCode);
    const presigned = await storageService.generatePresignedUploadUrl(projectCode, filename);

    return {
      ...presigned,
      ...parseResult,
    };
  }

  getDownloadUrl(fileKey: string, userPermission: 'VIEW_ONLY' | 'VIEW_AND_DOWNLOAD') {
    const rawUrl = `https://storage.pronex.com/${fileKey}`;
    return sanitizeOriginalDownloadUrl(rawUrl, userPermission);
  }
}

export const vaultService = new VaultService();
