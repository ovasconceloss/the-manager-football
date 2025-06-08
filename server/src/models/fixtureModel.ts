import { Buffer } from "buffer";
import fastify from "../fastify";
import GameStateModel from "./gameStateModel";
import GameLoaderService from "../core/gameLoader";

function convertMatchLogosToBase64(matches: any[]): void {
    matches.forEach(match => {
        if (match && match.home_logo_image instanceof Buffer) {
            try {
                match.home_logo_image = match.home_logo_image.toString("base64");
            } catch (e) {
                fastify.log.error("Error converting home logo to base64:", e);
                match.home_logo_image = null;
            }
        } else if (match && match.home_logo_image !== null && match.home_logo_image !== undefined) {
        }

        if (match && match.away_logo_image instanceof Buffer) {
            try {
                match.away_logo_image = match.away_logo_image.toString("base64");
            } catch (e) {
                fastify.log.error("Error converting away logo to base64:", e);
                match.away_logo_image = null;
            }
        } else if (match && match.away_logo_image !== null && match.away_logo_image !== undefined) {
            fastify.log.warn("Unexpected type for away_logo_image:", typeof match.away_logo_image);
        }
    });
}

class FixtureModel {
    public static async getTodayMatches(competitionId: number) {
        const gameState = await GameStateModel.getGameState() as { current_date: string; season_id: number };
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date, -- Corrigido para match_date
                m.status,
                m.leg_number, -- Corrigido para leg_number (equivalente ao 'round' anterior)
                comp.name AS competition_name, -- Nome da competição
                c1.name AS home_name,
                c2.name AS away_name,
                c1.logo_image AS home_logo_image, -- Corrigido para logo_image
                c2.logo_image AS away_logo_image -- Corrigido para logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id -- Corrigido para home_club_id
            JOIN club c2 ON m.away_club_id = c2.id -- Corrigido para away_club_id
            JOIN competition comp ON m.competition_id = comp.id -- Adicionado JOIN para competition
            WHERE m.match_date = ?
              AND m.season_id = ?
              AND m.competition_id = ? -- Corrigido para competition_id
            ORDER BY m.leg_number; -- Corrigido para leg_number
        `;

        const matches = databaseInstance.prepare(sql).all(gameState.current_date, gameState.season_id, competitionId);

        convertMatchLogosToBase64(matches);

        return { current_date: gameState.current_date, competition_id: competitionId, matches };
    }

    public static async getMatchesByLegNumber(legNumber: number, competitionId: number) {
        const gameState = await GameStateModel.getGameState() as { current_date: string; season_id: number };

        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date,
                m.status,
                m.leg_number,
                comp.name AS competition_name,
                c1.name AS home_name,
                c2.name AS away_name,
                c1.logo_image AS home_logo_image,
                c2.logo_image AS away_logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id
            JOIN club c2 ON m.away_club_id = c2.id
            JOIN competition comp ON m.competition_id = comp.id
            WHERE m.leg_number = ? -- Corrigido para leg_number
              AND m.competition_id = ? -- Corrigido para competition_id
              AND m.season_id = ?
            ORDER BY m.match_date; -- Corrigido para match_date
        `;

        const matches = databaseInstance.prepare(sql).all(legNumber, competitionId, gameState.season_id);

        convertMatchLogosToBase64(matches);

        return { current_date: gameState.current_date, matches, competition_id: competitionId }; // Retorna competition_id
    }

    public static async getTodayMatchesByClub(clubId: number) {
        const gameState = await GameStateModel.getGameState() as { current_date: string; season_id: number };

        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date,
                m.status,
                m.leg_number,
                comp.name AS competition_name,
                c1.name AS home_name,
                c2.name AS away_name,
                c1.logo_image AS home_logo_image,
                c2.logo_image AS away_logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id
            JOIN club c2 ON m.away_club_id = c2.id
            JOIN competition comp ON m.competition_id = comp.id
            WHERE m.match_date = ?
              AND m.season_id = ?
              AND (m.home_club_id = ? OR m.away_club_id = ?) -- Corrigido para home/away_club_id
            ORDER BY m.leg_number; -- Corrigido para leg_number
        `;

        const matches = databaseInstance.prepare(sql).all(gameState.current_date, gameState.season_id, clubId, clubId);

        convertMatchLogosToBase64(matches);

        return { current_date: gameState.current_date, matches, clubId: clubId };
    }

    public static async getClubMatchesByLegNumber(legNumber: number, clubId: number) {
        const gameState = await GameStateModel.getGameState() as { current_date: string; season_id: number };

        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date,
                m.status,
                m.leg_number,
                comp.name AS competition_name,
                c1.name AS home_name,
                c2.name AS away_name,
                c1.logo_image AS home_logo_image,
                c2.logo_image AS away_logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id
            JOIN club c2 ON m.away_club_id = c2.id
            JOIN competition comp ON m.competition_id = comp.id
            WHERE m.leg_number = ? -- Corrigido para leg_number
              AND m.season_id = ?
              AND (m.home_club_id = ? OR m.away_club_id = ?)
            ORDER BY m.match_date;
        `;

        const matches = databaseInstance.prepare(sql).all(legNumber, gameState.season_id, clubId, clubId);

        convertMatchLogosToBase64(matches);

        return { current_date: gameState.current_date, matches, clubId: clubId };
    }

    public static async getClubFullCalendar(clubId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date,
                m.status,
                m.leg_number,
                comp.name AS competition_name, -- Nome da competição (liga/copa)
                c1.name AS home_name,
                c2.name AS away_name,
                c1.logo_image AS home_logo_image,
                c2.logo_image AS away_logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id
            JOIN club c2 ON m.away_club_id = c2.id
            JOIN competition comp ON m.competition_id = comp.id -- Corrigido para competition e competition_id
            WHERE m.home_club_id = ? OR m.away_club_id = ?
            ORDER BY m.match_date ASC;
        `;

        const matches = databaseInstance.prepare(sql).all(clubId, clubId);

        convertMatchLogosToBase64(matches);

        return { club_id: clubId, matches };
    }

    public static async getClubNextMatch(clubId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameState = await GameStateModel.getGameState() as { current_date: string; season_id: number };

        const sql = `
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                m.home_score,
                m.away_score,
                m.match_date,
                m.status,
                m.leg_number,
                comp.name AS competition_name, -- Nome da competição
                c1.name AS home_name,
                c2.name AS away_name,
                s.name AS stadium_name, -- Nome do estádio
                c1.logo_image AS home_logo_image,
                c2.logo_image AS away_logo_image
            FROM match m
            JOIN club c1 ON m.home_club_id = c1.id
            JOIN club c2 ON m.away_club_id = c2.id
            JOIN competition comp ON m.competition_id = comp.id
            JOIN stadium s ON c1.stadium_id = s.id -- JOIN para o estádio
            WHERE (m.home_club_id = ? OR m.away_club_id = ?)
              AND m.season_id = ?
              AND m.match_date >= ? -- Corrigido para match_date
              AND m.status = 'scheduled'
            ORDER BY m.match_date ASC
            LIMIT 1;
        `;

        // O método .all() é usado aqui porque prepare().get() não funcionaria se não houvesse resultados,
        // resultando em erro. .all() retorna um array vazio.
        const matches = databaseInstance.prepare(sql).all(clubId, clubId, gameState.season_id, gameState.current_date);

        convertMatchLogosToBase64(matches);

        return matches; // Retorna o array (com 0 ou 1 partida)
    }
}

export default FixtureModel;