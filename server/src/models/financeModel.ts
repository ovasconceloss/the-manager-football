import fastify from "../fastify";
import GameLoaderService from "../core/gameLoader";

class FinanceModel {
    public static async initializeClubFinanceSummary(
        clubId: number,
        initialBalance: number,
        transferBudget: number,
        salaryBudget: number
    ): Promise<number> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentGameState = databaseInstance.prepare(`SELECT current_date, season_id FROM game_state LIMIT 1`).get() as { current_date: string, season_id: number } | undefined;

        const stmt = databaseInstance.prepare(`
            INSERT INTO club_finance_summary (club_id, current_balance, transfer_budget_available, salary_budget_available, last_updated_date)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(club_id) DO UPDATE SET
                current_balance = EXCLUDED.current_balance,
                transfer_budget_available = EXCLUDED.transfer_budget_available,
                salary_budget_available = EXCLUDED.salary_budget_available,
                last_updated_date = EXCLUDED.last_updated_date;
        `);
        const result = stmt.run(clubId, initialBalance, transferBudget, salaryBudget, currentGameState?.current_date);
        return result.lastInsertRowid as number;
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
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        return databaseInstance.transaction(() => {
            const category = databaseInstance.prepare(`
                SELECT id, transaction_type_id FROM transaction_category WHERE name = ?
            `).get(categoryName) as { id: number, transaction_type_id: number } | undefined;

            if (!category) {
                throw new Error(`Transaction category '${categoryName}' not found.`);
            }

            const insertTransactionStmt = databaseInstance.prepare(`
                INSERT INTO financial_transaction
                    (club_id, transaction_category_id, amount, transaction_date, description,
                     related_player_id, related_staff_id, related_match_id, related_club_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const transactionResult = insertTransactionStmt.run(
                clubId, category.id, amount, transactionDate, description,
                relatedPlayerId, relatedStaffId, relatedMatchId, relatedClubId
            );
            const transactionId = transactionResult.lastInsertRowid as number;

            const updateBalanceStmt = databaseInstance.prepare(`
                UPDATE club_finance_summary
                SET current_balance = current_balance + ?, last_updated_date = ?
                WHERE club_id = ?
            `);
            updateBalanceStmt.run(amount, transactionDate, clubId);

            return transactionId;
        })();
    }

    public static async getClubFinancialSummary(clubId: number): Promise<{
        current_balance: number;
        transfer_budget_available: number;
        salary_budget_available: number;
        last_updated_date: string;
    } | undefined> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT current_balance, transfer_budget_available, salary_budget_available, last_updated_date
            FROM club_finance_summary
            WHERE club_id = ?;
        `;

        return databaseInstance.prepare(sql).get(clubId) as {
            current_balance: number;
            transfer_budget_available: number;
            salary_budget_available: number;
            last_updated_date: string;
        } | undefined;
    }

    public static async getClubTransactions(
        clubId: number,
        limit: number = 20,
        offset: number = 0
    ): Promise<any[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT
                ft.id,
                ft.amount,
                ft.transaction_date,
                ft.description,
                tc.name AS category_name,
                tt.name AS transaction_type_name,
                p.first_name || ' ' || p.last_name AS player_name,
                s.first_name || ' ' || s.last_name AS staff_name,
                m.id AS match_id,
                c_rel.name AS related_club_name
            FROM financial_transaction ft
            JOIN transaction_category tc ON ft.transaction_category_id = tc.id
            JOIN transaction_type tt ON tc.transaction_type_id = tt.id
            LEFT JOIN player p ON ft.related_player_id = p.id
            LEFT JOIN staff s ON ft.related_staff_id = s.id
            LEFT JOIN match m ON ft.related_match_id = m.id
            LEFT JOIN club c_rel ON ft.related_club_id = c_rel.id
            WHERE ft.club_id = ?
            ORDER BY ft.transaction_date DESC, ft.id DESC
            LIMIT ? OFFSET ?;
        `;
        return databaseInstance.prepare(sql).all(clubId, limit, offset);
    }

    public static async calculateMonthlySalaries(clubId: number, date: string): Promise<number> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const playerSalariesSql = `
            SELECT SUM(pc.salary)
            FROM player_contract pc
            WHERE pc.club_id = ?
              AND ? BETWEEN pc.start_date AND pc.end_date;
        `;
        const playerSalaries = databaseInstance.prepare(playerSalariesSql).get(clubId, date) as { 'SUM(pc.salary)': number } | undefined;
        const totalPlayerSalaries = playerSalaries ? playerSalaries['SUM(pc.salary)'] || 0 : 0;

        const staffSalariesSql = `
            SELECT SUM(sc.salary)
            FROM staff_contract sc
            WHERE sc.club_id = ?
              AND ? BETWEEN sc.start_date AND sc.end_date;
        `;
        const staffSalaries = databaseInstance.prepare(staffSalariesSql).get(clubId, date) as { 'SUM(sc.salary)': number } | undefined;
        const totalStaffSalaries = staffSalaries ? staffSalaries['SUM(sc.salary)'] || 0 : 0;

        return totalPlayerSalaries + totalStaffSalaries;
    }

    public static async processSalaryPayments(clubId: number, paymentDate: string): Promise<number[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const playerSalariesSql = `
            SELECT SUM(pc.salary) as total
            FROM player_contract pc
            WHERE pc.club_id = ?
                AND ? BETWEEN pc.start_date AND pc.end_date;
        `;

        const playerSalariesResult = databaseInstance.prepare(playerSalariesSql).get(clubId, paymentDate) as { total: number } | undefined;
        const playerSalaries = playerSalariesResult?.total || 0;

        const staffSalariesSql = `
            SELECT SUM(sc.salary) as total
            FROM staff_contract sc
            WHERE sc.club_id = ?
                AND ? BETWEEN sc.start_date AND sc.end_date;
        `;

        const staffSalariesResult = databaseInstance.prepare(staffSalariesSql).get(clubId, paymentDate) as { total: number } | undefined;
        const staffSalaries = staffSalariesResult?.total || 0;

        const results: number[] = [];

        if (playerSalaries > 0) {
            const desc = `Monthly salaries for players`;
            //fastify.log.info(`Processing ${desc} of -${playerSalaries} for club ${clubId} on ${paymentDate}.`);
            const id = await FinanceModel.recordTransaction(
                clubId, 'Player Salaries', -playerSalaries, paymentDate, desc
            );
            results.push(id);
        }

        if (staffSalaries > 0) {
            const desc = `Monthly salaries for staff`;
            //fastify.log.info(`Processing ${desc} of -${staffSalaries} for club ${clubId} on ${paymentDate}.`);
            const id = await FinanceModel.recordTransaction(
                clubId, 'Staff Salaries', -staffSalaries, paymentDate, desc
            );
            results.push(id);
        }

        if (results.length === 0) {
            fastify.log.info(`No salaries to pay for club ${clubId} on ${paymentDate}.`);
        }

        return results;
    }

    public static async checkBankruptcy(clubId: number, bankruptcyThreshold: number = -1000000): Promise<boolean> {
        const summary = await FinanceModel.getClubFinancialSummary(clubId);
        if (!summary) {
            fastify.log.warn(`Financial summary not found for club ${clubId}. Cannot check bankruptcy.`);
            return false;
        }
        return summary.current_balance < bankruptcyThreshold;
    }

    public static async getTransactionTypes(): Promise<any[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        return databaseInstance.prepare(`SELECT id, name FROM transaction_type`).all();
    }

    public static async getTransactionCategories(): Promise<any[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT tc.id, tc.name, tt.name AS type_name
            FROM transaction_category tc
            JOIN transaction_type tt ON tc.transaction_type_id = tt.id;
        `;
        return databaseInstance.prepare(sql).all();
    }
}

export default FinanceModel;