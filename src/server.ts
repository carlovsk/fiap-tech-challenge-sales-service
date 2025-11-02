import { routes } from '@/routes';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import express from 'express';

logger('server').info('Starting server...');

const app = express();

app.use(express.json());
app.use(routes);

app.listen(env.PORT, () => logger('server').info(`Server is running on port ${env.PORT}`));
