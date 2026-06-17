import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './modules/auth/auth.routes';
import documentRoutes from './modules/documents/documents.routes';
import signatureRoutes from './modules/signatures/signatures.routes';
import verificationRoutes from './modules/verification/verification.routes';
import auditRoutes from './modules/audit/audit.routes';
import adminRoutes from './modules/admin/admin.routes';

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3010';

// Behind a proxy (e.g. Render) so req.ip and rate limiting work correctly.
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString(),
  });
});

// Module routers
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/signatures', signatureRoutes);
app.use('/api/verify', verificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/admin', adminRoutes);

// Global error handler — must be registered last.
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] DocSign API listening on port ${PORT}`);
});

export default app;
