import fastify from "../fastify";
import Database from "better-sqlite3";
import { AppError } from "../errors/errors";
import FinanceService from "./financeService";
import SeasonModel from "../models/seasonModel";
import GameLoaderService from "../core/gameLoader";
import FixtureService from "../core/engine/fixturesService";

class SeasonService {
    private static createTransferWindowsForSeasonSync(databaseInstance: Database.Database, seasonId: number, seasonStartDate: string, seasonEndDate: string): void {
        const summerTypeId = databaseInstance.prepare("SELECT id FROM transfer_window_type WHERE name = 'Summer'").get() as { id: number };
        const winterTypeId = databaseInstance.prepare("SELECT id FROM transfer_window_type WHERE name = 'Winter'").get() as { id: number };

        if (!summerTypeId || !winterTypeId) {
            throw new AppError("Transfer window types (Summer/Winter) not found. Please ensure they are seeded.", 500);
        }

        const seasonStart = new Date(seasonStartDate + 'T12:00:00Z');
        const summerEndDate = new Date(seasonStart);

        const summerStart = new Date(seasonStart);
        summerStart.setMonth(summerStart.getMonth() - 1);
        summerStart.setDate(1);

        const winterStart = new Date(seasonStart);
        winterStart.setFullYear(winterStart.getFullYear() + 1);
        winterStart.setMonth(0);
        winterStart.setDate(1);

        const winterEndDate = new Date(winterStart);
        winterEndDate.setDate(31);

        const insertStmt = databaseInstance.prepare(`
        INSERT INTO transfer_window (season_id, transfer_window_type_id, start_date, end_date)
        VALUES (?, ?, ?, ?), (?, ?, ?, ?);
    `);

        insertStmt.run(
            seasonId, summerTypeId.id, summerStart.toISOString().split('T')[0], summerEndDate.toISOString().split('T')[0],
            seasonId, winterTypeId.id, winterStart.toISOString().split('T')[0], winterEndDate.toISOString().split('T')[0]
        );

        fastify.log.info(`Transfer windows created for season ${seasonId}: Summer (${summerStart.toISOString().split('T')[0]} to ${summerEndDate.toISOString().split('T')[0]}) and Winter (${winterStart.toISOString().split('T')[0]} to ${winterEndDate.toISOString().split('T')[0]}).`);
    }

    public static async fetchCurrentSeason() {
        return await SeasonModel.getCurrentSeason();
    }

    public static async insertNewSeason(start_date: string, end_date: string) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const seasonId = await SeasonModel.insertNewSeason(start_date, end_date);

        databaseInstance.prepare(`INSERT INTO game_state (current_date, season_id) VALUES (?, ?)`).run("2025-08-01", seasonId);

        FinanceService.initializeClubFinances();
        FixtureService.createFixtures(databaseInstance, seasonId as number);

        const gameState = databaseInstance.prepare("SELECT * FROM game_state WHERE season_id = ? LIMIT 1").get(seasonId) as {
            current_date: string, season_id: number
        }

        this.createTransferWindowsForSeasonSync(databaseInstance, seasonId, gameState.current_date, end_date)

        return seasonId;
    }

    public static insertNewSeasonSync(startDate: string, endDate: string): number {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const result = databaseInstance.prepare(`
            INSERT INTO season (start_date, end_date, status) VALUES (?, ?, 'in_progress');
        `).run(startDate, endDate);
        return result.lastInsertRowid as number;
    }
}

export default SeasonService;