import 'dotenv/config';
import Fastify from "fastify";
import cors from "@fastify/cors";
import { AppError } from './errors/errors';

import saveRoutes from './routes/saveRoutes';

const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport: process.env.NODE_ENV !== 'production' ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:HH:MM:ss Z',
                ignore: 'pid,hostname',
            }
        } : undefined
    }
});

fastify.register(cors, {
    origin: ["*", "http://localhost:1420", "tauri://localhost"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
});

fastify.register(saveRoutes);

fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
        reply.status(error.statusCode).send({ error: error.message });
    } else {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});

export default fastify;