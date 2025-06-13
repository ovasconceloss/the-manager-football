import ManagerModel from "../models/managerModel";

class ManagerService {
    public static async insertAndAssignManager(
        nationId: number,
        firstName: string,
        lastName: string,
        birthDate: string,
        tacticalStyleId: number,
        clubId: number
    ): Promise<number> {
        return await ManagerModel.insertAndAssignManager(
            nationId,
            firstName,
            lastName,
            birthDate,
            tacticalStyleId,
            clubId
        );
    }

    public static async getUserManagerDetails() {
        return await ManagerModel.getUserManagerDetails();
    }

    public static async getAvailableClubs() {
        return await ManagerModel.getAvailableClubs();
    }

    public static async getTacticalStyleTypes() {
        return await ManagerModel.getTacticalStyleTypes();
    }
}

export default ManagerService;