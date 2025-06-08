import GameLoaderService from "../core/gameLoader";

class GameStateModel {
    public static async getGameState() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `SELECT * FROM game_state LIMIT 1`;

        return databaseInstance.prepare(sql).get();
    }
}

export default GameStateModel;