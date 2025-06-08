import { FastifyInstance } from "fastify";
import ClubController from "../controllers/clubController";

export default async function clubRoutes(fastify: FastifyInstance) {
    fastify.get('/clubs/all', ClubController.getAllClubs);
    fastify.get('/club/:clubId', ClubController.getClubById);
    fastify.get('/clubs/competition/:competitionId', ClubController.getClubsByCompetition);
}