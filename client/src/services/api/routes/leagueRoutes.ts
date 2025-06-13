import axiosClient from "../config/axiosConfig";

export const getAllLeagues = async () => {
    try {
        const response = await axiosClient.get('/leagues/all');
        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failure to list all available leagues" };
    }
}