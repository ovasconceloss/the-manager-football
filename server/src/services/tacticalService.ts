import TacticalModel from "../models/tacticalModel";

class TacticalService {
    public static async fetchAllTacticalTypes() {
        return await TacticalModel.getAllTacticalTypes();
    }

    public static async fetchAllTacticalFormations() {
        return await TacticalModel.getAllTacticalFormations();
    }
}

export default TacticalService;