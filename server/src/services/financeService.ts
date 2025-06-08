import fastify from "../fastify";
import { AppError } from "../errors/errors";
import FinanceModel from "../models/financeModel";

class FinanceService {
    public static async initializeClubFinance(
        clubId: number,
        initialBalance: number,
        transferBudget: number,
        salaryBudget: number
    ): Promise<number> {
        if (initialBalance < 0 || transferBudget < 0 || salaryBudget < 0) {
            throw new AppError("Budgets cannot be negative.", 400);
        }
        return FinanceModel.initializeClubFinanceSummary(clubId, initialBalance, transferBudget, salaryBudget);
    }

    public static async recordTransaction(
        clubId: number,
        categoryName: string,
        amount: number,
        transactionDate: string,
        description: string | null = null,
        relatedPlayerId: number | null = null,
        relatedStaffId: number | null = null,
        relatedMatchId: number | null = null,
        relatedClubId: number | null = null
    ): Promise<number> {
        if (!clubId || !categoryName || typeof amount !== 'number' || !transactionDate) {
            throw new AppError("Missing or invalid required transaction parameters.", 400);
        }

        const categories = await FinanceModel.getTransactionCategories();
        const categoryExists = categories.some(cat => cat.name === categoryName);
        if (!categoryExists) {
            throw new AppError(`Transaction category '${categoryName}' is invalid.`, 400);
        }

        return FinanceModel.recordTransaction(
            clubId, categoryName, amount, transactionDate, description,
            relatedPlayerId, relatedStaffId, relatedMatchId, relatedClubId
        );
    }

    public static async getClubBalance(clubId: number) {
        if (!clubId) {
            throw new AppError("Club ID is required.", 400);
        }
        const summary = await FinanceModel.getClubFinancialSummary(clubId);
        if (!summary) {
            fastify.log.warn(`Financial summary not found for club ${clubId}. Returning default.`);
            return { current_balance: 0, transfer_budget_available: 0, salary_budget_available: 0, last_updated_date: 'N/A' };
        }
        return summary;
    }

    public static async getClubFinancialLog(clubId: number, limit?: number, offset?: number) {
        if (!clubId) {
            throw new AppError("Club ID is required.", 400);
        }
        return FinanceModel.getClubTransactions(clubId, limit, offset);
    }

    public static async checkIfClubIsBankrupt(clubId: number): Promise<boolean> {
        return FinanceModel.checkBankruptcy(clubId);
    }
}

export default FinanceService;