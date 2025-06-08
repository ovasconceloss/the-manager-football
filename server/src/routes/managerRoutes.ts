import { FastifyInstance } from "fastify";
import ManagerController from "../controllers/managerController";

export default async function managerRoutes(fastify: FastifyInstance) {
    fastify.get("/manager/details", ManagerController.getUserManagerDetails);
    fastify.post("/manager/insert", ManagerController.insertAndAssignManager);

    fastify.get("/manager/clubs/availables", ManagerController.getAvailableClubs);
    fastify.get("/manager/tatical-styles", ManagerController.getTacticalStyleTypes);
}