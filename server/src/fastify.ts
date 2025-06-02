import 'dotenv/config';
import Fastify from "fastify";
import cors from "@fastify/cors";

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

export default fastify;