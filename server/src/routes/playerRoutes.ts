import { FastifyInstance } from "fastify";
import PlayerController from "../controllers/playerController";

export default async function playerRoutes(fastify: FastifyInstance) {
    fastify.get('/player/:playerId', PlayerController.getPlayerById);
    fastify.get('/players/:playerName', PlayerController.getPlayersByName);
    fastify.get('/players/club/:clubId', PlayerController.getPlayersByClub);
    fastify.get('/players/all-season-stats', PlayerController.getAllPlayerSeasonStats);

    fastify.get('/players/top-assists/:competitionId', PlayerController.getTopAssists);
    fastify.get('/players/top-scorers/:competitionId', PlayerController.getTopScorers);
    fastify.get('/players/top-ratings/:competitionId', PlayerController.getTopRatings);
}