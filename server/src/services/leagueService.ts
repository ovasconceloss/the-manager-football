import fastify from "../fastify";
import LeagueModel from "../models/leagueModel";
import GameLoaderService from "../core/gameLoader";

class LeagueService {
    static async fetchAllLeagues() {
        return LeagueModel.getAllLeagues();
    }

    static async fetchLeagueById(competitionId: number) {
        return LeagueModel.getLeagueById(competitionId);
    }

    static async fetchStandingsByLeague(competitionId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentSeason = databaseInstance.prepare("SELECT id FROM season WHERE status = 'in_progress' LIMIT 1").get() as { id: number } | undefined;

        if (!currentSeason) {
            fastify.log.warn("No season currently in progress found. Cannot fetch league standings.");
            return [];
        }

        return LeagueModel.getStandingsByLeague(competitionId, currentSeason.id);
    }
}

export default LeagueService;