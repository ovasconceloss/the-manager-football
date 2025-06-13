import { FastifyInstance } from "fastify";
import NationController from "../controllers/nationController";

export default async function nationRoutes(fastify: FastifyInstance) {
    fastify.get('/nations/all', NationController.getAllNations);
    fastify.get('/nation/:nationId', NationController.getNationById);
    fastify.get('/nation/cities/:nationId', NationController.getCitiesByNation);
}