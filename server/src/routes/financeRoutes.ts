import { FastifyInstance } from "fastify";
import FinanceController from "../controllers/financeController";

export default async function financeRoutes(fastify: FastifyInstance) {
    fastify.get('/finance/club/:clubId/summary', FinanceController.getClubFinancialSummary);
    fastify.get('/finance/club/:clubId/transactions', FinanceController.getClubTransactionsLog);
    fastify.get('/finance/club/:clubId/bankruptcy-status', FinanceController.getClubBankruptcyStatus);
}