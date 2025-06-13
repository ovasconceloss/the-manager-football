import axiosClient from "../config/axiosConfig";

export const getAllNations = async () => {
    try {
        const response = await axiosClient.get(`/nations/all`);
        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failure to list all nations" };
    }
}

export const getNationById = async (nationId: number) => {
    try {
        const response = await axiosClient.get(`/nation/${nationId}`);
        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failure to list all nations" };
    }
}