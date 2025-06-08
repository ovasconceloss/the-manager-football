import { Buffer } from "buffer";
import fastify from "../fastify";
import GameLoaderService from "../core/gameLoader";

function convertLeagueLogoToBase64(obj: any): void {
    if (obj && obj.league_logo_image instanceof Buffer) {
        try {
            obj.league_logo_image = obj.league_logo_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting club logo to base64:", e);
            obj.league_logo_image = null;
        }
    } else if (obj && typeof obj.league_logo_image === 'string' && obj.league_logo_image.startsWith('data:image')) {
    } else if (obj && obj.league_logo_image !== null && obj.league_logo_image !== undefined) {
        fastify.log.warn("Unexpected type for league_logo_image, not a Buffer or already base64:", typeof obj.league_logo_image);
    }
}

function convertClubLogoToBase64(obj: any): void {
    if (obj && obj.club_logo_image instanceof Buffer) {
        try {
            obj.club_logo_image = obj.club_logo_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting club logo to base64:", e);
            obj.club_logo_image = null;
        }
    } else if (obj && typeof obj.club_logo_image === 'string' && obj.club_logo_image.startsWith('data:image')) {
    } else if (obj && obj.club_logo_image !== null && obj.club_logo_image !== undefined) {
        fastify.log.warn("Unexpected type for club_logo_image, not a Buffer or already base64:", typeof obj.club_logo_image);
    }
}

class LeagueModel {
    public static async getAllLeagues() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                comp.id AS league_id,
                comp.name AS league_name,
                comp.reputation,
                comp.nation_id,
                n.name AS nation_name,
                comp.competition_logo AS league_logo_image
            FROM competition comp
            LEFT JOIN nation n ON n.id = comp.nation_id
            WHERE comp.type = 'league';
        `;

        const results = databaseInstance.prepare(sql).all();
        results.forEach(convertLeagueLogoToBase64);
        return results;
    }

    public static async getLeagueById(leagueId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                comp.id AS league_id,
                comp.name AS league_name,
                comp.reputation,
                comp.nation_id,
                n.name AS nation_name,
                comp.competition_logo AS league_logo_image
            FROM competition comp
            LEFT JOIN nation n ON n.id = comp.nation_id
            WHERE comp.id = ? AND comp.type = 'league';
        `;

        const result = databaseInstance.prepare(sql).get(leagueId);
        convertLeagueLogoToBase64(result);
        return result;
    }

    public static async getStandingsByLeague(competitionId: number, seasonId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                c.id AS club_id,
                c.name AS club_name,
                ls.position,
                ls.played,
                ls.wins,
                ls.draws,
                ls.losses,
                ls.goals_for,
                ls.goals_against,
                ls.goal_difference,
                ls.points,
                c.logo_image AS club_logo_image
            FROM
                league_standing ls
            JOIN
                club c ON ls.club_id = c.id
            WHERE
                ls.competition_id = ?
                AND ls.season_id = ?
                AND ls.match_day = (
                    SELECT MAX(match_day)
                    FROM league_standing
                    WHERE competition_id = ?
                    AND season_id = ?
                )
            ORDER BY
                ls.position ASC;
        `;

        const results = databaseInstance.prepare(sql).all(competitionId, seasonId, competitionId, seasonId);
        results.forEach(convertClubLogoToBase64);

        return results;
    }
}

export default LeagueModel;