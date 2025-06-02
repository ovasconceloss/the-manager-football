import fastify from "./fastify"
import { AppError } from "./errors/errors";

const serverStart = async () => {
    const PORT = Number(process.env.SERVER_PORT) || 3000;

    try {
        await fastify.listen({ port: PORT });
    } catch (err: unknown) {
        if (err instanceof AppError) {
            fastify.log.error(`Failed to start the fastify server: ${err.message}`);
        } else if (err instanceof Error) {
            fastify.log.error(`Failed to start the fastify server: ${err.message}`);
        } else {
            fastify.log.error('Unknown error occurred during server start');
        }

        process.exit(1);
    }
}

serverStart();