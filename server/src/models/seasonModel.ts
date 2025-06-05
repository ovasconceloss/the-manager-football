import GameLoaderService from "../core/gameLoader";

class SeasonModel {
    public static async getCurrentSeason() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        return databaseInstance.prepare(`
            SELECT 
                season.id, 
                season.start_date, 
                season.end_date, 
                season.status
            FROM season
            WHERE status = 'in_progress'
            LIMIT 1;    
        `).get();
    }

    public static async insertNewSeason(start_date: string, end_date: string) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        return databaseInstance.prepare(`
            INSERT INTO season(start_date, end_date, status) VALUES (?, ?, ?)    
        `).run(start_date, end_date, 'in_progress').lastInsertRowid as number
    }
}

export default SeasonModel;