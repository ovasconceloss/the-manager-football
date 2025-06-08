import ClubModel from "../models/clubModel";

class ClubService {
    static async fetchClubById(clubId: number) {
        return ClubModel.getClubById(clubId);
    }

    static async fetchClubsByCompetition(competitionId: number) {
        return ClubModel.getClubsByCompetition(competitionId);
    }

    static async fetchAllClubs() {
        return ClubModel.getAllClubs();
    }
}

export default ClubService;