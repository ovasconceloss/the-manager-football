import fastify from "../fastify";
import { AppError } from "../errors/errors";
import { FastifyReply, FastifyRequest } from "fastify";
import FinanceService from "../services/financeService";

class FinanceController {
    public static async getClubFinancialSummary(
        request: FastifyRequest<{ Params: { clubId: number } }>,
        reply: FastifyReply
    ) {
        const { clubId } = request.params;
        try {
            const summary = await FinanceService.getClubBalance(clubId);
            return reply.status(200).send({ clubId, summary });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error getting financial summary for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve financial summary." });
            }
            fastify.log.error(`Unknown error getting financial summary for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve financial summary." });
        }
    }

    public static async getClubTransactionsLog(
        request: FastifyRequest<{ Params: { clubId: number }, Querystring: { limit?: number, offset?: number } }>,
        reply: FastifyReply
    ) {
        const { clubId } = request.params;
        const { limit, offset } = request.query;

        try {
            const transactions = await FinanceService.getClubFinancialLog(clubId, limit, offset);
            return reply.status(200).send({ clubId, transactions });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error getting financial transactions for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve financial transactions." });
            }
            fastify.log.error(`Unknown error getting financial transactions for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve financial transactions." });
        }
    }

    public static async getClubBankruptcyStatus(
        request: FastifyRequest<{ Params: { clubId: number } }>,
        reply: FastifyReply
    ) {
        const { clubId } = request.params;
        try {
            const isBankrupt = await FinanceService.checkIfClubIsBankrupt(clubId);
            return reply.status(200).send({ clubId, isBankrupt });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error checking bankruptcy for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to check bankruptcy status." });
            }
            fastify.log.error(`Unknown error checking bankruptcy for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to check bankruptcy status." });
        }
    }
}

export default FinanceController;