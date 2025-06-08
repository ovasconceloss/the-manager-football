import { FastifyInstance } from "fastify";
import FixtureController from "../controllers/fixtureController";

export default async function fixtureRoutes(fastify: FastifyInstance) {
    fastify.get("/fixtures/today/:competitionId", FixtureController.getTodayMatches);
    fastify.get("/fixtures/club/today/:clubId", FixtureController.getTodayMatchesByClub);

    fastify.get("/fixtures/club/full/:clubId", FixtureController.getClubFullCalendar);
    fastify.get("/fixtures/club/next/:legNumber/:clubId", FixtureController.getClubNextMatch);

    fastify.get("/fixtures/club/by-leg/:legNumber/:clubId", FixtureController.getClubMatchesByLegNumber);
    fastify.get("/fixtures/league/by-leg/:legNumber/:competitionId", FixtureController.getMatchesByLegNumber);
}