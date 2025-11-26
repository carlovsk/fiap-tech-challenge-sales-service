import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { internalRoutes } from './internal';
import { salesRoutes } from './sales';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use('/api/internal', internalRoutes);
router.use('/api/sales', salesRoutes);

export { router as routes };
