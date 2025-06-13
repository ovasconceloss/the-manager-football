import GameLoaderService from "../core/gameLoader";

class TacticalModel {
    public static async getAllTacticalTypes() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `SELECT * FROM tactical_style_type ORDER BY name`;

        return databaseInstance.prepare(sql).all();
    }

    public static async getAllTacticalFormations() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `SELECT * FROM formation ORDER BY name`;

        return databaseInstance.prepare(sql).all();
    }
}

export default TacticalModel;