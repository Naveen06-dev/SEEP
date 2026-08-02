import 'dotenv/config';
import { createApp, createSocketServer } from './app.js';

const PORT = process.env.PORT || 4000;
const app = createApp();
const { httpServer } = createSocketServer(app);

httpServer.listen(PORT, () => {
  console.log(`SEEP API running on http://localhost:${PORT}`);
});
