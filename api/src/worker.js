import 'dotenv/config';
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null
});

// Placeholder worker for async grading jobs
new Worker('coding-submit', async (job) => {
  console.log('[worker] processing coding submission job', job.id, job.data);
  return { ok: true };
}, { connection });

console.log('SEEP worker started');
