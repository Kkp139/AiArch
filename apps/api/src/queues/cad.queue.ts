export interface QueueCadJobOptions {
  documentId: string;
  fileKey: string;
  filename: string;
  mimeType?: string;
}

export class CadQueue {
  private queueName = 'cad-preview-queue';

  async addJob(data: QueueCadJobOptions): Promise<{ jobId: string }> {
    // In production with BullMQ:
    // return cadBullQueue.add('convert-cad', data);
    return {
      jobId: `job-cad-${data.documentId}`,
    };
  }
}

export const cadQueue = new CadQueue();
