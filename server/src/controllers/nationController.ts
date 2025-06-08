import fastify from "../fastify";
import NationService from "../services/nationService";
import { FastifyReply, FastifyRequest } from "fastify";

class NationController {
    static async getAllNations(request: FastifyRequest, reply: FastifyReply) {
        try {
            const nations = await NationService.fetchAllNations();
            return reply.status(200).send({ nations });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all nations:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve data from all nations." });
            }
            fastify.log.error("Unknown error fetching all nations:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve data from all nations." });
        }
    }

    static async getNationById(request: FastifyRequest<{ Params: { nationId: number } }>, reply: FastifyReply) {
        const { nationId } = request.params;

        try {
            const nation = await NationService.fetchNationById(nationId);
            if (!nation) {
                return reply.status(404).send({ message: "Nation not found." });
            }
            return reply.status(200).send({ nation });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error(`Error fetching nation by ID ${nationId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve data from nation by ID." });
            }
            fastify.log.error(`Unknown error fetching nation by ID ${nationId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve data from nation by ID." });
        }
    }
}

export default NationController;