import fastify from "../../fastify";
import Database from "better-sqlite3";
import MatchEngineService from "./matchEngineService";

class LoopService {
    public static advanceGameDay(database: Database.Database) {
        const state = database.prepare("SELECT * FROM game_state LIMIT 1").get() as {
            id: number, current_date: string; season_id: number
        };

        if (!state) {
            fastify.log.error("Game State not initialized. Please ensure the 'game_state' table has an entry.");
            throw new Error("Game State not initialized");
        }

        const today = state.current_date;
        const seasonId = state.season_id;

        fastify.log.info(`Current game date: ${today}, Season ID: ${seasonId}`);

        const scheduledMatches = database.prepare(`
            SELECT id FROM match WHERE match_date = ? AND status = 'scheduled' AND season_id = ?
        `).all(today, seasonId) as Array<{ id: number }>;

        fastify.log.info(`Found ${scheduledMatches.length} scheduled matches for today.`);

        for (const match of scheduledMatches) {
            try {
                MatchEngineService.simulateMatch(database, match.id);
                fastify.log.info(`Successfully simulated match ID: ${match.id}`);
            } catch (error: any) {
                fastify.log.info(error);
                fastify.log.error(`Error simulating match ID ${match.id}: ${error.message}`);
            }
        }

        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateFormatted = nextDate.toISOString().split("T")[0];

        database.prepare(`UPDATE game_state SET current_date = ? WHERE id = ?`).run(nextDateFormatted, state.id);

        fastify.log.info(`Game date advanced to: ${nextDateFormatted}.`);

        return {
            played: scheduledMatches.length,
            newDate: nextDateFormatted
        };
    }
}

export default LoopService;