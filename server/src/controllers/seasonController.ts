import fastify from "../fastify";
import { AppError } from "../errors/errors";
import GameLoaderService from "../core/gameLoader";
import LoopService from "../core/engine/loopService";
import SeasonService from "../services/seasonService";
import { FastifyReply, FastifyRequest } from "fastify";

class SeasonController {
    public static async getCurrentSeason(request: FastifyRequest, reply: FastifyReply) {
        try {
            const currentSeason = await SeasonService.fetchCurrentSeason();
            return reply.status(201).send({ statusCode: 200, currentSeason });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Get current season error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected get current season error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while getting current season." });
            } else {
                fastify.log.error("Unknown error while getting current season");
                return reply.status(500).send({ error: "Unknown error while getting current season." });
            }
        }
    }

    public static async createNewSeason(request: FastifyRequest<{
        Body: {
            end_date: string,
            start_date: string,
        }
    }>, reply: FastifyReply) {
        const { start_date, end_date } = request.body;

        try {
            SeasonService.insertNewSeason(start_date, end_date);
            return reply.status(201).send({ statusCode: 201, message: "New season successfully started." });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Create new season error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected create new season error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while creating a new season." });
            } else {
                fastify.log.error("Unknown error while creating new season");
                return reply.status(500).send({ error: "Unknown error while creating a new season." });
            }
        }
    }

    public static async advanceSeasonDay(request: FastifyRequest, reply: FastifyReply) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        try {
            const resultDate = await LoopService.advanceGameDay(databaseInstance);
            return reply.status(200).send({ message: "Day successfully completed.", resultDate });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Advance season day error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected advance season day error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while advancing season day." });
            } else {
                fastify.log.error("Unknown error while advancing season day");
                return reply.status(500).send({ error: "Unknown error while advancing season day." });
            }
        }
    }
}

export default SeasonController;