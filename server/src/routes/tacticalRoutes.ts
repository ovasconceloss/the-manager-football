import { FastifyInstance } from "fastify";
import TacticalController from "../controllers/tacticalController";

export default async function tacticalRoutes(fastify: FastifyInstance) {
    fastify.get('/tactical/types', TacticalController.getAllTacticalTypes);
    fastify.get('/tactical/formations', TacticalController.getAllTacticalFormations);
}