import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'OK' });
});

app.listen(PORT, () => {
  console.log(`[server] DocSign API listening on port ${PORT}`);
});

export default app;
