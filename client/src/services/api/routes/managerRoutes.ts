import { Club } from "@/types/club";
import { ManagerData } from "@/types/manager";
import axiosClient from "../config/axiosConfig";

export const insertNewManager = async (managerData: ManagerData, selectedClub: Club | undefined) => {
    try {
        const response = await axiosClient.post(`/manager/insert`, {
            nationId: managerData.personalDetails.nationalityId,
            firstName: managerData.personalDetails.firstName,
            lastName: managerData.personalDetails.lastName,
            birthDate: managerData.personalDetails.dateOfBirth,
            tacticalStyleId: managerData.tacticalStyle.playingStyle,
            clubId: selectedClub?.club_id
        });

        return { success: true, response }
    } catch (err: unknown) {
        return { success: false, message: "Failed to create a new manager" };
    }
}