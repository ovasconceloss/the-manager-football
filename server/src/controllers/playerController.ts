// import { AppError } from "../errors/errors";
import fastify from "../fastify";
import PlayerService from "../services/playerService";
import { FastifyReply, FastifyRequest } from "fastify";

class PlayerController {
    static async getPlayerById(request: FastifyRequest<{ Params: { playerId: number } }>, reply: FastifyReply) {
        const { playerId } = request.params;

        try {
            const player = await PlayerService.fetchPlayerById(playerId);
            if (!player) {
                return reply.status(404).send({ message: "Player not found." });
            }
            return reply.status(200).send({ player });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching player by ID ${playerId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve player data." });
            }
            fastify.log.error(`Unknown error fetching player by ID ${playerId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve player data." });
        }
    }

    static async getPlayersByName(request: FastifyRequest<{ Params: { playerName: string } }>, reply: FastifyReply) {
        const { playerName } = request.params;

        try {
            const players = await PlayerService.fetchPlayersByName(playerName);
            return reply.status(200).send({ players });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching players by name "${playerName}":`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve player data by name." });
            }
            fastify.log.error(`Unknown error fetching players by name "${playerName}":`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve player data by name." });
        }
    }

    static async getPlayersByClub(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;

        try {
            const players = await PlayerService.fetchPlayersByClub(clubId);
            return reply.status(200).send({ players });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching players by club ID ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve players for club." });
            }
            fastify.log.error(`Unknown error fetching players by club ID ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve players for club." });
        }
    }

    static async getAllPlayerSeasonStats(request: FastifyRequest, reply: FastifyReply) {
        try {
            const playersStats = await PlayerService.fetchAllPlayerSeasonStats();
            return reply.status(200).send({ playersStats });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all player season stats:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve all player season statistics." });
            }
            fastify.log.error("Unknown error fetching all player season stats:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve all player season statistics." });
        }
    }

    static async getTopScorers(request: FastifyRequest<{ Params: { competitionId: number }, Querystring: { limit?: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;
        const limit = request.query.limit ? Number(request.query.limit) : undefined;

        try {
            const topScorers = await PlayerService.fetchTopScorers(competitionId, limit);
            return reply.status(200).send({ topScorers });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching top scorers for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve top scorers." });
            }
            fastify.log.error(`Unknown error fetching top scorers for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve top scorers." });
        }
    }

    static async getTopAssists(request: FastifyRequest<{ Params: { competitionId: number }, Querystring: { limit?: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;
        const limit = request.query.limit ? Number(request.query.limit) : undefined;

        try {
            const topAssists = await PlayerService.fetchTopAssists(competitionId, limit);
            return reply.status(200).send({ topAssists });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching top assists for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve top assists." });
            }
            fastify.log.error(`Unknown error fetching top assists for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve top assists." });
        }
    }

    static async getTopRatings(request: FastifyRequest<{ Params: { competitionId: number }, Querystring: { limit?: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;
        const limit = request.query.limit ? Number(request.query.limit) : undefined;

        try {
            const topRatings = await PlayerService.fetchTopRatings(competitionId, limit);
            return reply.status(200).send({ topRatings });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching top ratings for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve top ratings." });
            }
            fastify.log.error(`Unknown error fetching top ratings for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve top ratings." });
        }
    }
}

export default PlayerController;