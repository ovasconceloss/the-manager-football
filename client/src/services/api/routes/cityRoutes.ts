import { City } from "@/types/manager";
import axiosClient from "../config/axiosConfig";

export async function getCitiesByNation(nationId: number): Promise<{ success: boolean; response?: { data: { cities: City[] } }; error?: string }> {
    try {
        const response = await axiosClient.get(`/nation/cities/${nationId}`);
        console.log(response);
        return { success: true, response: { data: { cities: response.data.nation } } };
    } catch (error) {
        return { success: false, error: "Failed to fetch cities" };
    }
}