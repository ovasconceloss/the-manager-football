import { FastifyInstance } from "fastify";
import SeasonController from "../controllers/seasonController";

export default async function seasonRoutes(fastify: FastifyInstance) {
    fastify.post("/season/start", SeasonController.createNewSeason);
    fastify.get("/season/current", SeasonController.getCurrentSeason);
    fastify.post("/season/advance-day", SeasonController.advanceSeasonDay);
}