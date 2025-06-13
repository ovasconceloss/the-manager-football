import axiosClient from "../config/axiosConfig";

export const getAllTacticalTypes = async () => {
    try {
        const response = await axiosClient.get(`/tactical/types`);
        return { success: true, response: response.data.tacticalTypes };
    } catch (error) {
        return { success: false, error: "Failed to fetch tactical types" };
    }
}

export const getAllTacticalFormations = async () => {
    try {
        const response = await axiosClient.get(`/tactical/formations`);
        return { success: true, response: response.data.tacticalFormations };
    } catch (error) {
        return { success: false, error: "Failed to fetch tactical formations" };
    }
}