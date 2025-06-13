import fastify from "../fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import TacticalService from "../services/tacticalService";

class TacticalController {
    public static async getAllTacticalTypes(request: FastifyRequest, reply: FastifyReply) {
        try {
            const tacticalTypes = await TacticalService.fetchAllTacticalTypes();
            return reply.status(200).send({ tacticalTypes });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all tactical types:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve all tactical types." });
            }
            fastify.log.error("Unknown error fetching all tactical types:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve all tactical types." });
        }
    }

    public static async getAllTacticalFormations(request: FastifyRequest, reply: FastifyReply) {
        try {
            const tacticalFormations = await TacticalService.fetchAllTacticalFormations();
            return reply.status(200).send({ tacticalFormations });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching all tactical formations:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve all tactical formations." });
            }
            fastify.log.error("Unknown error fetching all tactical formations:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve all tactical formations." });
        }
    }
}

export default TacticalController;