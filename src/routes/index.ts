import { Router } from 'express';
import { healthRoutes } from './health.routes';

const router = Router();

// Mount route modules
router.use(healthRoutes);

export { router as routes };
