import { FastifyInstance } from "fastify";
import LeagueController from "../controllers/leagueController";

export default async function leagueRoutes(fastify: FastifyInstance) {
    fastify.get("/leagues/all", LeagueController.getAllLeagues);
    fastify.get("/league/:competitionId", LeagueController.getLeagueById);
    fastify.get("/league/standings/:competitionId", LeagueController.getStandingsByLeague);
}