import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { internalRoutes } from './internal';

const router = Router();

// Mount route modules
router.use(healthRoutes);
router.use('/api/internal', internalRoutes);

export { router as routes };
