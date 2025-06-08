import fastify from "../fastify";
import ClubService from "../services/clubService";
import { FastifyReply, FastifyRequest } from "fastify";

class ClubController {
    static async getClubById(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;

        try {
            const club = await ClubService.fetchClubById(clubId);
            if (!club) {
                return reply.status(404).send({ message: "Club not found." });
            }
            return reply.status(200).send({ club });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching club by ID ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve club data by ID." });
            }
            fastify.log.error(`Unknown error fetching club by ID ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve club data by ID." });
        }
    }

    static async getClubsByCompetition(request: FastifyRequest<{ Params: { competitionId: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;

        try {
            const clubs = await ClubService.fetchClubsByCompetition(competitionId);
            return reply.status(200).send({ clubs });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching clubs for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve clubs by competition." });
            }
            fastify.log.error(`Unknown error fetching clubs for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve clubs by competition." });
        }
    }

    static async getAllClubs(request: FastifyRequest, reply: FastifyReply) {
        try {
            const clubs = await ClubService.fetchAllClubs();
            return reply.status(200).send({ clubs });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all clubs:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve all clubs." });
            }
            fastify.log.error("Unknown error fetching all clubs:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve all clubs." });
        }
    }
}

export default ClubController;