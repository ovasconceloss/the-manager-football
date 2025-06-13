import axiosClient from "../config/axiosConfig"

export const insertNewSeason = async () => {
    try {
        const response = await axiosClient.post('/season/start', {
            end_date: "2026",
            start_date: "2025",
        });

        return { success: true, response: response.data };
    } catch (err: unknown) {
        return { success: false, error: "Failure to insert a season" };
    }
}

export const getCurrentSeason = async () => {
    try {
        const response = await axiosClient.get('/season/current');

        return { success: true, response: response.data };
    } catch (err: unknown) {
        return { success: false, error: "Failed to get the current season" };
    }
}

export const advanceSeasonDay = async () => {
    try {
        const response = await axiosClient.post('/season/advance-day');
        return { success: true, response: response.data };
    } catch (err: unknown) {
        return { success: false, error: "Failure to advance the day of the season" };
    }
}