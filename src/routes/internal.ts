import { InternalController } from '@/controllers/internal.controller';
import { Router } from 'express';

const router = Router();

router.post('/vehicles/sync', InternalController.syncVehicle);

export { router as internalRoutes };
