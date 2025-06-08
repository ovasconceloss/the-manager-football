import fastify from "../fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import FixtureService from "../services/fixtureService";

class FixtureController {
    public static async getTodayMatches(request: FastifyRequest<{ Params: { competitionId: number } }>, reply: FastifyReply) {
        const { competitionId } = request.params;

        try {
            const matchesData = await FixtureService.fetchTodayMatches(competitionId);
            return reply.status(200).send(matchesData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching today's matches for competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve today's matches." });
            }
            fastify.log.error(`Unknown error fetching today's matches for competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve today's matches." });
        }
    }

    public static async getMatchesByLegNumber(request: FastifyRequest<{ Params: { legNumber: number, competitionId: number } }>, reply: FastifyReply) {
        const { legNumber, competitionId } = request.params;

        try {
            const matchesData = await FixtureService.fetchMatchesByLegNumber(legNumber, competitionId);
            return reply.status(200).send(matchesData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching matches for leg ${legNumber} of competition ${competitionId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve matches by leg number." });
            }
            fastify.log.error(`Unknown error fetching matches for leg ${legNumber} of competition ${competitionId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve matches by leg number." });
        }
    }

    public static async getTodayMatchesByClub(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;

        try {
            const matchesData = await FixtureService.fetchTodayMatchesByClub(clubId);
            return reply.status(200).send(matchesData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching today's matches for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve today's matches (by club)." });
            }
            fastify.log.error(`Unknown error fetching today's matches for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve today's matches (by club)." });
        }
    }

    public static async getClubMatchesByLegNumber(request: FastifyRequest<{ Params: { legNumber: number, clubId: number } }>, reply: FastifyReply) {
        const { legNumber, clubId } = request.params;

        try {
            const matchesData = await FixtureService.fetchClubMatchesByLegNumber(legNumber, clubId);
            return reply.status(200).send(matchesData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching club matches for leg ${legNumber} for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve club matches by leg number." });
            }
            fastify.log.error(`Unknown error fetching club matches for leg ${legNumber} for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve club matches by leg number." });
        }
    }

    public static async getClubFullCalendar(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;

        try {
            const calendarData = await FixtureService.fetchClubFullCalendar(clubId);
            return reply.status(200).send(calendarData);
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching full calendar for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve club full calendar." });
            }
            fastify.log.error(`Unknown error fetching full calendar for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve club full calendar." });
        }
    }

    public static async getClubNextMatch(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;

        try {
            const nextMatch = await FixtureService.fetchClubNextMatch(clubId);
            if (nextMatch.length === 0) {
                return reply.status(404).send({ message: "No next match found for this club." });
            }
            return reply.status(200).send({ match: nextMatch[0] });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching next match for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve club next match." });
            }
            fastify.log.error(`Unknown error fetching next match for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve club next match." });
        }
    }
}

export default FixtureController;