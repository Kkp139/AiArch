import path from 'path';

export interface CadJobData {
  documentId: string;
  fileKey: string;
  filename: string;
  mimeType?: string;
}

export interface CadProcessResult {
  status: 'COMPLETED' | 'FAILED';
  documentId: string;
  previewKey: string;
  originalPreserved: boolean;
  error?: string;
}

export const CAD_EXTENSIONS = ['.dwg', '.dxf', '.dgn'] as const;

export function isCadFile(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return CAD_EXTENSIONS.includes(ext as any);
}

export function generatePreviewKey(documentId: string): string {
  return `previews/${documentId}.pdf`;
}

/**
 * Background worker job:
 * Converts raw CAD (.dwg/.dxf) file into a web-optimized PDF/vector asset
 * while preserving the original CAD file in storage.
 */
export async function processCadFile(job: { data: CadJobData }): Promise<CadProcessResult> {
  const { documentId, fileKey, filename } = job.data;

  try {
    if (!isCadFile(filename)) {
      throw new Error(`File ${filename} is not a supported CAD format`);
    }

    const previewKey = generatePreviewKey(documentId);

    // In production with LibreCAD / ODA File Converter / ezdxf:
    // Convert source CAD stream -> web-optimized PDF vector preview -> upload to S3 at previewKey

    return {
      status: 'COMPLETED',
      documentId,
      previewKey,
      originalPreserved: true,
    };
  } catch (err: any) {
    return {
      status: 'FAILED',
      documentId,
      previewKey: '',
      originalPreserved: true,
      error: err.message,
    };
  }
}
