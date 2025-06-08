import { Buffer } from "buffer";
import fastify from "../fastify";
import GameLoaderService from "../core/gameLoader";

function convertClubLogoToBase64(obj: any): void {
    if (obj && obj.club_logo_image) {
        try {
            obj.club_logo_image = Buffer.from(obj.club_logo_image).toString("base64");
        } catch (e) {
            fastify.log.error("Error converting club logo to base64:", e);
            obj.club_logo_image = null;
        }
    }
}

class PlayerModel {
    public static async getPlayerById(playerId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentDate = new Date().toISOString().split('T')[0];

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name,
                p.last_name,
                p.birth_date,
                p.overall,
                p.potential,
                p.market_value,
                pp.name AS position_name,
                n.id AS nation_id,
                n.name AS nationality,
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation AS club_abbreviation,
                c.logo_image AS club_logo_image,
                pc.id AS contract_id,
                pc.start_date AS contract_start_date,
                pc.end_date AS contract_end_date,
                pc.salary AS contract_salary
            FROM player p
            JOIN player_position pp ON p.position_id = pp.id
            JOIN nation n ON p.nation_id = n.id
            LEFT JOIN player_contract pc ON p.id = pc.player_id
            LEFT JOIN club c ON pc.club_id = c.id
            WHERE p.id = ?;
        `;

        const result = databaseInstance.prepare(sql).get(playerId);
        convertClubLogoToBase64(result);
        return result;
    }

    public static async getPlayersByName(playerName: string) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentDate = new Date().toISOString().split('T')[0];
        const queryNameLike = `%${playerName}%`;

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name,
                p.last_name,
                p.overall,
                pp.name AS position_name,
                c.name AS club_name,
                c.logo_image AS club_logo_image,
                n.name AS nationality
            FROM player p
            JOIN player_position pp ON p.position_id = pp.id
            JOIN nation n ON p.nation_id = n.id
            LEFT JOIN player_contract pc ON p.id = pc.player_id
            LEFT JOIN club c ON pc.club_id = c.id
            WHERE
                p.first_name LIKE ?
                OR p.last_name LIKE ?
                OR (p.first_name || ' ' || p.last_name) LIKE ?;
        `;

        const results = databaseInstance.prepare(sql).all(queryNameLike, queryNameLike, queryNameLike);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getPlayersByClub(clubId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentDate = new Date().toISOString().split('T')[0];

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name,
                p.last_name,
                p.birth_date,
                p.overall,
                p.potential,
                p.market_value,
                pp.name AS position_name,
                n.name AS nationality,
                c.name AS club_name,
                c.abbreviation AS club_abbreviation,
                c.logo_image AS club_logo_image,
                pc.start_date AS contract_start_date,
                pc.end_date AS contract_end_date,
                pc.salary AS contract_salary
            FROM player p
            JOIN player_position pp ON p.position_id = pp.id
            JOIN nation n ON p.nation_id = n.id
            JOIN player_contract pc ON p.id = pc.player_id
            JOIN club c ON pc.club_id = c.id
            WHERE pc.club_id = ?
        `;

        const results = databaseInstance.prepare(sql).all(clubId);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getAllPlayerSeasonStats(seasonId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_full_name,
                pp.name AS position_name,
                p.overall,
                c.name AS club_name,
                COUNT(pms.match_id) AS matches_played,
                SUM(pms.goals) AS goals,
                SUM(pms.assists) AS assists,
                SUM(pms.defenses) AS defenses,
                (SUM(pms.goals) + SUM(pms.assists)) AS goals_and_assists,
                ROUND(AVG(pms.rating), 1) AS avg_rating,
                SUM(CASE WHEN pms.is_motm = 1 THEN 1 ELSE 0 END) AS motm_count,
                c.logo_image AS club_logo_image
            FROM player_match_stats pms
            JOIN match m ON m.id = pms.match_id
            JOIN player p ON p.id = pms.player_id
            JOIN player_position pp ON p.position_id = pp.id
            JOIN club c ON c.id = pms.club_id
            WHERE m.season_id = ?
            GROUP BY p.id, p.first_name, p.last_name, pp.name, p.overall, c.name, c.logo_image
            ORDER BY avg_rating DESC;
        `;

        const results = databaseInstance.prepare(sql).all(seasonId);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getTopScorers(competitionId: number, seasonId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_full_name,
                pp.name AS position_name,
                p.overall,
                c.name AS club_name,
                SUM(pms.goals) AS goals,
                COUNT(pms.match_id) AS matches_played,
                c.logo_image AS club_logo_image
            FROM player_match_stats pms
            JOIN match m ON m.id = pms.match_id
            JOIN player p ON p.id = pms.player_id
            JOIN player_position pp ON p.position_id = pp.id
            JOIN club c ON c.id = pms.club_id
            WHERE m.competition_id = ? AND m.season_id = ?
            GROUP BY p.id, p.first_name, p.last_name, pp.name, p.overall, c.name, c.logo_image
            ORDER BY goals DESC
            LIMIT ?;
        `;

        const results = databaseInstance.prepare(sql).all(competitionId, seasonId, limit);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getTopAssists(competitionId: number, seasonId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_full_name,
                pp.name AS position_name,
                p.overall,
                c.name AS club_name,
                SUM(pms.assists) AS assists,
                COUNT(pms.match_id) AS matches_played,
                c.logo_image AS club_logo_image
            FROM player_match_stats pms
            JOIN match m ON m.id = pms.match_id
            JOIN player p ON p.id = pms.player_id
            JOIN player_position pp ON p.position_id = pp.id
            JOIN club c ON c.id = pms.club_id
            WHERE m.competition_id = ? AND m.season_id = ?
            GROUP BY p.id, p.first_name, p.last_name, pp.name, p.overall, c.name, c.logo_image
            ORDER BY assists DESC
            LIMIT ?;
        `;

        const results = databaseInstance.prepare(sql).all(competitionId, seasonId, limit);
        results.forEach(convertClubLogoToBase64);
        return results;
    }

    public static async getTopRatings(competitionId: number, seasonId: number, limit = 10) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name || ' ' || p.last_name AS player_full_name,
                pp.name AS position_name,
                p.overall,
                c.name AS club_name,
                ROUND(AVG(pms.rating), 1) AS avg_rating,
                COUNT(pms.match_id) AS matches_played,
                c.logo_image AS club_logo_image
            FROM player_match_stats pms
            JOIN match m ON m.id = pms.match_id
            JOIN player p ON p.id = pms.player_id
            JOIN player_position pp ON p.position_id = pp.id
            JOIN club c ON c.id = pms.club_id
            WHERE m.competition_id = ? AND m.season_id = ?
            GROUP BY p.id, p.first_name, p.last_name, pp.name, p.overall, c.name, c.logo_image
            HAVING matches_played >= 3
            ORDER BY avg_rating DESC
            LIMIT ?;
        `;

        const results = databaseInstance.prepare(sql).all(competitionId, seasonId, limit);
        results.forEach(convertClubLogoToBase64);
        return results;
    }
}

export default PlayerModel;