import { processCadFile } from './processors/cad.processor';

export async function startWorker() {
  console.log('ProNex-ArchAI Background Worker initialized.');
  console.log('Listening to queue: cad-preview-queue...');

  // Worker loop initialized
  return {
    status: 'RUNNING',
    queues: ['cad-preview-queue', 'push-retry-queue', 'work-update-reminders'],
  };
}

if (require.main === module) {
  startWorker()
    .then(() => {
      // Keep worker process alive in container
      setInterval(() => {}, 60_000);
    })
    .catch(err => {
      console.error('Worker failed to start:', err);
      process.exit(1);
    });
}
