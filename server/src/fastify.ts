import 'dotenv/config';
import Fastify from "fastify";
import cors from "@fastify/cors";
import { AppError } from './errors/errors';

import clubRoutes from './routes/clubRoutes';
import saveRoutes from './routes/saveRoutes';
import nationRoutes from './routes/nationRoutes';
import seasonRoutes from './routes/seasonRoutes';
import playerRoutes from './routes/playerRoutes';
import leagueRoutes from './routes/leagueRoutes';
import fixtureRoutes from './routes/fixtureRoutes';
import managerRoutes from './routes/managerRoutes';
import financeRoutes from './routes/financeRoutes';
import transferRoutes from './routes/transferRoutes';
import tacticalRoutes from './routes/tacticalRoutes';

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

fastify.register(clubRoutes);
fastify.register(saveRoutes);
fastify.register(nationRoutes);
fastify.register(seasonRoutes);
fastify.register(playerRoutes);
fastify.register(leagueRoutes);
fastify.register(fixtureRoutes);
fastify.register(managerRoutes);
fastify.register(financeRoutes);
fastify.register(transferRoutes);
fastify.register(tacticalRoutes);

fastify.server.setTimeout(600000);

fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
        reply.status(error.statusCode).send({ error: error.message });
    } else {
        fastify.log.error(error);
        reply.status(500).send({ error: 'Internal Server Error' });
    }
});

export default fastify;