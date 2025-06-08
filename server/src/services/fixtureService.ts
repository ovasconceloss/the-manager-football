import FixtureModel from "../models/fixtureModel";

class FixtureService {
    public static async fetchTodayMatches(competitionId: number) {
        return await FixtureModel.getTodayMatches(competitionId);
    }

    public static async fetchMatchesByLegNumber(legNumber: number, competitionId: number) {
        return await FixtureModel.getMatchesByLegNumber(legNumber, competitionId);
    }

    public static async fetchTodayMatchesByClub(clubId: number) {
        return await FixtureModel.getTodayMatchesByClub(clubId);
    }

    public static async fetchClubMatchesByLegNumber(legNumber: number, clubId: number) {
        return await FixtureModel.getClubMatchesByLegNumber(legNumber, clubId);
    }

    public static async fetchClubFullCalendar(clubId: number) {
        return await FixtureModel.getClubFullCalendar(clubId);
    }

    public static async fetchClubNextMatch(clubId: number) {
        return await FixtureModel.getClubNextMatch(clubId);
    }
}

export default FixtureService;