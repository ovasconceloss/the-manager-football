import { FastifyInstance } from "fastify";
import SaveController from "../controllers/saveController";

export default async function saveRoutes(fastify: FastifyInstance) {
    fastify.get('/save/list', SaveController.listSaves);
    fastify.post('/save/create', SaveController.createSave);
    fastify.post('/save/load', SaveController.loadSave);
    fastify.delete('/save/delete', SaveController.deleteSave);
}