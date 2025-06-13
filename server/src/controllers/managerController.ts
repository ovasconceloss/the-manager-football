import fastify from "../fastify";
import { FastifyReply, FastifyRequest } from "fastify";
import ManagerService from "../services/managerService";

class ManagerController {
    public static async insertAndAssignManager(
        request: FastifyRequest<{
            Body: {
                nationId: number;
                firstName: string;
                lastName: string;
                birthDate: string;
                tacticalStyleName: string;
                clubId: number;
            };
        }>,
        reply: FastifyReply
    ) {
        const { nationId, firstName, lastName, birthDate, tacticalStyleName, clubId } = request.body;

        if (!nationId || !firstName || !lastName || !birthDate || !tacticalStyleName || !clubId) {
            return reply.status(400).send({ message: "Missing required fields for manager creation." });
        }

        try {
            const newManagerStaffId = await ManagerService.insertAndAssignManager(
                nationId,
                firstName,
                lastName,
                birthDate,
                tacticalStyleName,
                clubId
            );
            return reply.status(201).send({
                message: "Manager created and assigned successfully.",
                managerStaffId: newManagerStaffId,
                clubId: clubId
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error creating and assigning manager:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to create and assign manager." });
            }
            fastify.log.error("Unknown error creating and assigning manager:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to create and assign manager." });
        }
    }

    public static async getUserManagerDetails(request: FastifyRequest, reply: FastifyReply) {
        try {
            const managerDetails = await ManagerService.getUserManagerDetails();
            if (!managerDetails) {
                return reply.status(404).send({ message: "No active user manager found." });
            }
            return reply.status(200).send({ manager: managerDetails });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching user manager details:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve user manager details." });
            }
            fastify.log.error("Unknown error fetching user manager details:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve user manager details." });
        }
    }

    public static async getAvailableClubs(request: FastifyRequest, reply: FastifyReply) {
        try {
            const availableClubs = await ManagerService.getAvailableClubs();
            return reply.status(200).send({ clubs: availableClubs });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching available clubs:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve available clubs." });
            }
            fastify.log.error("Unknown error fetching available clubs:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve available clubs." });
        }
    }

    public static async getTacticalStyleTypes(request: FastifyRequest, reply: FastifyReply) {
        try {
            const tacticalStyles = await ManagerService.getTacticalStyleTypes();
            return reply.status(200).send({ tacticalStyles });
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Error fetching tactical style types:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve tactical styles." });
            }
            fastify.log.error("Unknown error fetching tactical style types:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve tactical styles." });
        }
    }
}

export default ManagerController;