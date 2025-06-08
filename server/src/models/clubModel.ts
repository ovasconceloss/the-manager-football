import { Buffer } from "buffer";
import GameLoaderService from "../core/gameLoader";

function convertClubLogoToBase64(obj: any): void {
    if (obj && obj.logo_image instanceof Buffer) {
        try {
            obj.logo_image = obj.logo_image.toString("base64");
        } catch (e) {
            console.error("Error converting club logo to base64:", e);
            obj.logo_image = null;
        }
    } else if (obj && typeof obj.logo_image === 'string' && obj.logo_image.startsWith('data:image')) {
    } else if (obj && obj.logo_image !== null && obj.logo_image !== undefined) {
        console.warn("Unexpected type for club_logo_image, not a Buffer or already base64:", typeof obj.logo_image);
    }
}

class ClubModel {
    public static async getClubById(clubId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation,
                c.reputation,
                c.foundation_year,
                n.id AS nation_id,
                n.name AS nation_name,
                city.id AS city_id,
                city.name AS city_name,
                s.id AS stadium_id,
                s.name AS stadium_name,
                s.capacity AS stadium_capacity,
                c.logo_image
            FROM club c
            LEFT JOIN nation n ON c.nation_id = n.id
            LEFT JOIN city ON c.city_id = city.id
            LEFT JOIN stadium s ON c.stadium_id = s.id
            WHERE c.id = ?;
        `;

        const result = databaseInstance.prepare(sql).get(clubId);
        convertClubLogoToBase64(result);
        return result;
    }

    public static async getClubsByCompetition(competitionId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT DISTINCT
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation,
                c.reputation,
                c.foundation_year,
                c.logo_image, -- Logo do clube
                n.id AS nation_id,
                n.name AS nation_name,
                city.id AS city_id,
                city.name AS city_name,
                s.id AS stadium_id,
                s.name AS stadium_name,
                s.capacity AS stadium_capacity
            FROM club c
            JOIN match m ON c.id = m.home_club_id OR c.id = m.away_club_id
            LEFT JOIN nation n ON c.nation_id = n.id
            LEFT JOIN city ON c.city_id = city.id
            LEFT JOIN stadium s ON c.stadium_id = s.id
            WHERE m.competition_id = ?
            ORDER BY c.name;
        `;

        const results = databaseInstance.prepare(sql).all(competitionId);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getAllClubs() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation,
                c.reputation,
                c.foundation_year,
                c.logo_image,
                n.name AS nation_name,
                city.name AS city_name,
                s.name AS stadium_name
            FROM club c
            LEFT JOIN nation n ON c.nation_id = n.id
            LEFT JOIN city ON c.city_id = city.id
            LEFT JOIN stadium s ON c.stadium_id = s.id;
        `;

        const results = databaseInstance.prepare(sql).all();
        results.forEach(convertClubLogoToBase64);
        return results;
    }
}

export default ClubModel;