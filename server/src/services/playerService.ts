import fastify from "../fastify";
import PlayerModel from "../models/playerModel";
import GameLoaderService from "../core/gameLoader";

class PlayerService {
    public static async fetchPlayerById(playerId: number) {
        return PlayerModel.getPlayerById(playerId);
    }

    public static async fetchPlayersByName(playerName: string) {
        return PlayerModel.getPlayersByName(playerName);
    }

    public static async fetchPlayersByClub(clubId: number) {
        return PlayerModel.getPlayersByClub(clubId);
    }

    public static async fetchAllPlayerSeasonStats() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentSeason = await databaseInstance.prepare("SELECT id FROM season WHERE status = 'in_progress' LIMIT 1").get() as { id: number } | undefined;

        if (!currentSeason) {
            fastify.log.warn("No season currently in progress found. Cannot fetch all player season stats.");
            return [];
        }

        return await PlayerModel.getAllPlayerSeasonStats(currentSeason.id);
    }

    public static async fetchTopScorers(competitionId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentSeason = databaseInstance.prepare("SELECT id FROM season WHERE status = 'in_progress' LIMIT 1").get() as { id: number } | undefined;

        if (!currentSeason) {
            fastify.log.warn("No season currently in progress found. Cannot fetch top scorers.");
            return [];
        }

        return await PlayerModel.getTopScorers(competitionId, currentSeason.id, limit);
    }

    public static async fetchTopAssists(competitionId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentSeason = databaseInstance.prepare("SELECT id FROM season WHERE status = 'in_progress' LIMIT 1").get() as { id: number } | undefined;

        if (!currentSeason) {
            fastify.log.warn("No season currently in progress found. Cannot fetch top assists.");
            return [];
        }

        return await PlayerModel.getTopAssists(competitionId, currentSeason.id, limit);
    }

    public static async fetchTopRatings(competitionId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentSeason = databaseInstance.prepare("SELECT id FROM season WHERE status = 'in_progress' LIMIT 1").get() as { id: number } | undefined;

        if (!currentSeason) {
            fastify.log.warn("No season currently in progress found. Cannot fetch top ratings.");
            return [];
        }

        return await PlayerModel.getTopRatings(competitionId, currentSeason.id, limit);
    }
}

export default PlayerService;