import express from 'express';
import { executeInSandbox } from './sandbox.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'code-runner' }));

app.post('/execute', async (req, res) => {
  try {
    const { language, sourceCode, stdin, timeLimitMs, memoryLimitMB } = req.body;
    if (!language || !sourceCode) {
      return res.status(400).json({ message: 'language and sourceCode required' });
    }

    const result = await executeInSandbox({
      language,
      sourceCode,
      stdin: stdin || '',
      timeLimitMs,
      memoryLimitMB
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Code runner on :${PORT}`));
