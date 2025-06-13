import { Club } from "@/types/club";
import { ManagerData } from "@/types/manager";
import axiosClient from "../config/axiosConfig";

export const insertNewManager = async (managerData: ManagerData, selectedClub: Club | undefined) => {
    try {
        const response = await axiosClient.post(`/manager/insert`, {
            nation_id: managerData.personalDetails.nationalityId,
            first_name: managerData.personalDetails.firstName,
            last_name: managerData.personalDetails.lastName,
            birth_date: managerData.personalDetails.dateOfBirth,
            tacticalStyleId: managerData.tacticalStyle.playingStyle,
            club_id: selectedClub?.club_id
        });

        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failed to create a new manager" };
    }
}