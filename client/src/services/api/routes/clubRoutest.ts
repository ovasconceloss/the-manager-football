import axiosClient from "../config/axiosConfig";

export const getClubsByCompetition = async (competitionId: number) => {
    try {
        const response = await axiosClient.get(`/clubs/competition/${competitionId}`);
        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failure to list all available clubs by league" };
    }
}