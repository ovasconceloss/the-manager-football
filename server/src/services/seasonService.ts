import FinanceService from "./financeService";
import SeasonModel from "../models/seasonModel";
import GameLoaderService from "../core/gameLoader";
import FixtureService from "../core/engine/fixturesService";

class SeasonService {
    public static async fetchCurrentSeason() {
        return await SeasonModel.getCurrentSeason();
    }

    public static async insertNewSeason(start_date: string, end_date: string) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const seasonId = await SeasonModel.insertNewSeason(start_date, end_date);

        FinanceService.initializeClubFinances();
        FixtureService.createFixtures(databaseInstance, seasonId as number);

        databaseInstance.prepare(`INSERT INTO game_state (current_date, season_id) VALUES (?, ?)`).run("2025-08-01", seasonId);

        return seasonId;
    }
}

export default SeasonService;