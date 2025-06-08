import { FastifyInstance } from "fastify";
import ManagerController from "../controllers/managerController";

export default async function managerRoutes(fastify: FastifyInstance) {
    fastify.post("/manager/insert", ManagerController.insertAndAssignManager);
    fastify.post("/manager/details", ManagerController.getUserManagerDetails);

    fastify.post("/manager/clubs/availables", ManagerController.getAvailableClubs);
    fastify.post("/manager/tatical-styles", ManagerController.getTacticalStyleTypes);
}