import fastify from "../fastify";
import ClubModel from "../models/clubModel";
import { AppError } from "../errors/errors";
import FinanceModel from "../models/financeModel";

class FinanceService {
    public static async insertClubFinance(
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

    public static async initializeClubFinances(): Promise<void> {
        fastify.log.info("Initializing financial summaries for all clubs...");

        const clubs = await ClubModel.getAllClubs();

        for (const club of clubs as { club_id: number; club_name: string; reputation: number }[]) {
            const salaryBudget = club.reputation * 1500;
            const initialBalance = club.reputation * 5000;
            const transferBudget = club.reputation * 2000;

            try {
                await this.insertClubFinance(club.club_id, initialBalance, transferBudget, salaryBudget);
            } catch (error) {
                fastify.log.error(`Error initialising finances for club ${club.club_name} (ID: ${club.club_id}):`, error);
            }
        }
        fastify.log.info("Financial summaries initialized for all clubs successfully.");
    }
}

export default FinanceService;