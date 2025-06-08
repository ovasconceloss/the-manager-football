import NationModel from "../models/nationModel";

class NationService {
    public static async fetchAllNations() {
        return await NationModel.getAllNations();
    }

    public static async fetchNationById(nationId: number) {
        return await NationModel.getNationById(nationId);
    }
}

export default NationService;