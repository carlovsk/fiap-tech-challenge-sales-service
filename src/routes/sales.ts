import { SalesController } from '@/controllers/sales.controller';
import { Router } from 'express';

const router = Router();

router.get('/vehicles/available', SalesController.getAvailableVehicles);
router.get('/vehicles/sold', SalesController.getSoldVehicles);
router.post('/purchase', SalesController.purchase);
router.post('/payment/webhook', SalesController.paymentWebhook);

export { router as salesRoutes };
