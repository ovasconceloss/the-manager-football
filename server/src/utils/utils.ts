import fastify from "../fastify";
import { AppError } from "../errors/errors";

export function randomValues(min: number, max: number): number {
    try {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (err: unknown) {
        if (err instanceof AppError) {
            fastify.log.error(`SeedService randomValues error: ${err.message}`);
            throw err;
        } else if (err instanceof Error) {
            fastify.log.error(`Unexpected error in randomValues: ${err.message}`);
            throw new AppError("Unexpected error while generating random value.", 500);
        } else {
            fastify.log.error("Unknown error in randomValues");
            throw new AppError("Unknown error while generating random value.", 500);
        }
    }
}

export function expandPositions(position: string, count: number): string[] {
    try {
        return Array(count).fill(position);
    } catch (err: unknown) {
        if (err instanceof AppError) {
            fastify.log.error(`SeedService expandPositions error: ${err.message}`);
            throw err;
        } else if (err instanceof Error) {
            fastify.log.error(`Unexpected error in expandPositions: ${err.message}`);
            throw new AppError("Unexpected error while expanding positions.", 500);
        } else {
            fastify.log.error("Unknown error in expandPositions");
            throw new AppError("Unknown error while expanding positions.", 500);
        }
    }
}