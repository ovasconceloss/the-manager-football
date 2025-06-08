import fastify from "../fastify";
import LeagueService from "../services/leagueService";
import { FastifyReply, FastifyRequest } from "fastify";

class LeagueController {
    public static async getAllLeagues(request: FastifyRequest, reply: FastifyReply) {
        try {
            const leagues = await LeagueService.fetchAllLeagues();
            return reply.status(200).send({ leagues });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all leagues:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve data from all leagues." });
            }
            fastify.log.error("Unknown error fetching all leagues:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve data from all leagues." });
        }
    }

    public static async getLeagueById(request: FastifyRequest<{ Params: { competitionId: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;

        try {
            const league = await LeagueService.fetchLeagueById(competitionId);
            if (!league) {
                return reply.status(404).send({ message: "League not found." });
            }
            return reply.status(200).send({ league });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching league by ID ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve data from league by ID." });
            }
            fastify.log.error(`Unknown error fetching league by ID ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve data from league by ID." });
        }
    }

    public static async getStandingsByLeague(request: FastifyRequest<{ Params: { competitionId: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;

        try {
            const standings = await LeagueService.fetchStandingsByLeague(competitionId);
            return reply.status(200).send({ standings });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching standings for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve league standings." });
            }
            fastify.log.error(`Unknown error fetching standings for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve league standings." });
        }
    }
}

export default LeagueController;