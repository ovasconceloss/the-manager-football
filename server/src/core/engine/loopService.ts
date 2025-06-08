import * as path from 'path';
import fastify from '../../fastify';
import Database from "better-sqlite3";
import { Worker } from 'worker_threads';
import FinanceModel from '../../models/financeModel';
import MatchServiceUtils from './match/matchServiceUtils';
import MatchFinanceService from './match/matchFinanceService';
import { PreloadedEngineData, SimulatedMatchResult, GameLoopResult, PlayerData, ClubData, MatchDbInfo } from "../../interfaces/engine";

class LoopService {
    private static async preloadEngineData(databaseInstance: Database.Database, currentMatchDate: string): Promise<PreloadedEngineData> {
        fastify.log.info("Preloading engine data into memory...");

        const playersRaw = databaseInstance.prepare(`
            SELECT
                p.id, p.overall, p.position_id, p.first_name, p.last_name,
                p.birth_date, p.potential, p.market_value, p.nation_id
            FROM player p
        `).all() as PlayerData[];

        const players = new Map<number, PlayerData>();
        playersRaw.forEach(p => players.set(p.id, p));

        const playerContractsRaw = databaseInstance.prepare(`
            SELECT player_id, club_id FROM player_contract
            WHERE date(?) BETWEEN start_date AND end_date
        `).all(currentMatchDate) as { player_id: number, club_id: number }[];

        const playerContracts = new Map<number, { club_id: number, player_id: number }[]>();
        playerContractsRaw.forEach(pc => {
            if (!playerContracts.has(pc.club_id)) {
                playerContracts.set(pc.club_id, []);
            }
            playerContracts.get(pc.club_id)!.push(pc);
        });

        const playerAttributesRaw = databaseInstance.prepare(`
            SELECT pa.player_id, at.name as attribute_name, pa.value
            FROM player_attribute pa
            JOIN attribute_type at ON pa.attribute_type_id = at.id
        `).all() as { player_id: number, attribute_name: string, value: number }[];

        const playerAttributes = new Map<number, Map<string, number>>();
        playerAttributesRaw.forEach(pa => {
            if (!playerAttributes.has(pa.player_id)) {
                playerAttributes.set(pa.player_id, new Map<string, number>());
            }
            playerAttributes.get(pa.player_id)!.set(pa.attribute_name, pa.value);
        });

        const attributeTypesRaw = databaseInstance.prepare(`
            SELECT id, name FROM attribute_type
        `).all() as { id: number, name: string }[];
        const attributeTypes = new Map<number, string>();
        attributeTypesRaw.forEach(at => attributeTypes.set(at.id, at.name));

        const playerPositionsRaw = databaseInstance.prepare(`
            SELECT id, name FROM player_position
        `).all() as { id: number, name: string }[];
        const playerPositions = new Map<number, string>();
        playerPositionsRaw.forEach(pp => playerPositions.set(pp.id, pp.name));

        const clubsRaw = databaseInstance.prepare(`
            SELECT id, name, abbreviation, nation_id, city_id, stadium_id, reputation, foundation_year FROM club
        `).all() as ClubData[];
        const clubs = new Map<number, ClubData>();
        clubsRaw.forEach(c => clubs.set(c.id, c));

        const matchLineups = new Map<number, Map<number, { player_id: number; position_played_id: number; is_starter: number; is_captain: number; }[]>>();

        fastify.log.info(`Preloaded data: ${players.size} players, ${clubs.size} clubs, ${playerAttributes.size} player attribute maps.`);
        return { players, playerContracts, playerAttributes, attributeTypes, playerPositions, clubs, matchLineups };
    }

    public static async advanceGameDay(databaseInstance: Database.Database): Promise<GameLoopResult> {
        const state = databaseInstance.prepare("SELECT * FROM game_state LIMIT 1").get() as { id: number, current_date: string; season_id: number };

        if (!state) {
            fastify.log.error("Game State not initialized. Please ensure the 'game_state' table has an entry.");
            throw new Error("Game State not initialized");
        }

        const today = state.current_date;
        const seasonId = state.season_id;

        fastify.log.info(`Current game date: ${today}, Season ID: ${seasonId}`);

        const preloadedData = await this.preloadEngineData(databaseInstance, today);

        const scheduledMatches = databaseInstance.prepare(`
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                ch.name as home_name,
                ca.name as away_name,
                m.competition_id,
                m.season_id,
                m.stage_id,
                m.leg_number
            FROM match m
            JOIN club ch ON ch.id = m.home_club_id
            JOIN club ca ON ca.id = m.away_club_id
            WHERE m.match_date = ? AND m.status = 'scheduled' AND m.season_id = ?
        `).all(today, seasonId) as MatchDbInfo[];

        if (scheduledMatches.length === 0) {
            fastify.log.info(`No scheduled matches for today. Advancing date.`);
            const nextDate = new Date(today);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateFormatted = nextDate.toISOString().split("T")[0];

            databaseInstance.prepare(`
                UPDATE game_state SET current_date = ? WHERE id = ?
            `).run(nextDateFormatted, state.id);

            return {
                played: 0,
                newDate: nextDateFormatted
            };
        }

        fastify.log.info(`Found ${scheduledMatches.length} scheduled matches for today. Checking/Generating lineups.`);

        const matchesToSimulate: MatchDbInfo[] = [];
        const matchLineupsData: Map<number, Map<number, { player_id: number; position_played_id: number; is_starter: number; is_captain: number; }[]>> = new Map();

        for (const match of scheduledMatches) {
            let homeLineupReady = MatchServiceUtils.lineupExists(databaseInstance, match.id, match.home_club_id);
            let awayLineupReady = MatchServiceUtils.lineupExists(databaseInstance, match.id, match.away_club_id);

            if (!homeLineupReady) {
                MatchServiceUtils.generateAIAutoLineup(databaseInstance, match.id, match.home_club_id);
                homeLineupReady = true;
            }
            if (!awayLineupReady) {
                MatchServiceUtils.generateAIAutoLineup(databaseInstance, match.id, match.away_club_id);
                awayLineupReady = true;
            }

            if (homeLineupReady && awayLineupReady) {
                matchesToSimulate.push(match);

                const lineupRaw = databaseInstance.prepare(`
                    SELECT player_id, club_id, position_played_id, is_starter, is_captain
                    FROM match_lineup
                    WHERE match_id = ? AND is_starter = 1
                `).all(match.id) as { player_id: number; club_id: number; position_played_id: number; is_starter: number; is_captain: number; }[];

                if (!matchLineupsData.has(match.id)) {
                    matchLineupsData.set(match.id, new Map());
                }
                for (const entry of lineupRaw) {
                    if (!matchLineupsData.get(match.id)!.has(entry.club_id)) {
                        matchLineupsData.get(match.id)!.set(entry.club_id, []);
                    }
                    matchLineupsData.get(match.id)!.get(entry.club_id)!.push(entry);
                }

            } else {
                fastify.log.warn(`Skipping match ${match.id} due to incomplete lineups.`);
            }
        }


        preloadedData.matchLineups = matchLineupsData;

        fastify.log.info(`Found ${matchesToSimulate.length} matches with complete lineups to simulate.`);

        if (matchesToSimulate.length === 0) {
            fastify.log.info(`No matches with complete lineups to simulate today. Advancing date.`);
            const nextDate = new Date(today);
            nextDate.setDate(nextDate.getDate() + 1);
            const nextDateFormatted = nextDate.toISOString().split("T")[0];

            databaseInstance.prepare(`
                UPDATE game_state SET current_date = ? WHERE id = ?
            `).run(nextDateFormatted, state.id);

            return {
                played: 0,
                newDate: nextDateFormatted
            };
        }


        const numWorkers = Math.min(matchesToSimulate.length, require('os').cpus().length);
        const matchesPerWorker = Math.ceil(matchesToSimulate.length / numWorkers);

        const simulationPromises: Promise<SimulatedMatchResult[]>[] = [];
        const allSimulatedResults: SimulatedMatchResult[] = [];

        for (let i = 0; i < numWorkers; i++) {
            const startIndex = i * matchesPerWorker;
            const endIndex = Math.min(startIndex + matchesPerWorker, matchesToSimulate.length);
            const matchesChunk = matchesToSimulate.slice(startIndex, endIndex);

            if (matchesChunk.length === 0) continue;

            const workerPromise = new Promise<SimulatedMatchResult[]>((resolve, reject) => {
                const workerPath = path.resolve(__dirname, './match/matchEngineService.ts');
                const worker = new Worker(workerPath, {
                    workerData: {
                        matches: matchesChunk,
                        preloadedData: {
                            players: [...preloadedData.players.entries()],
                            playerContracts: [...preloadedData.playerContracts.entries()].map(([id, arr]) => [id, arr]),
                            playerAttributes: [...preloadedData.playerAttributes.entries()].map(([id, map]) => [id, [...map.entries()]]),
                            attributeTypes: [...preloadedData.attributeTypes.entries()],
                            playerPositions: [...preloadedData.playerPositions.entries()],
                            clubs: [...preloadedData.clubs.entries()],
                            matchLineups: [...preloadedData.matchLineups.entries()].map(([matchId, clubLineupsMap]) => [matchId, [...clubLineupsMap.entries()]]),
                        },
                        logLevel: 'info'
                    },
                    execArgv: ['-r', 'ts-node/register']
                });

                worker.on('message', (workerResults: SimulatedMatchResult[]) => {
                    resolve(workerResults);
                });

                worker.on('error', (err) => {
                    console.log(err);
                    fastify.log.error(`Worker error: ${err.message}`);
                    reject(err);
                });

                worker.on('exit', (code) => {
                    if (code !== 0) {
                        fastify.log.warn(`Worker exited with code ${code}`);
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });
            });
            simulationPromises.push(workerPromise);
        }

        try {
            const resultsFromWorkers = await Promise.all(simulationPromises);
            resultsFromWorkers.forEach(chunk => allSimulatedResults.push(...chunk));

            fastify.log.info(`All ${allSimulatedResults.length} matches simulated by workers. Saving results to DB.`);

            databaseInstance.transaction(() => {
                const savePlayerStatsStmt = databaseInstance.prepare(`
                    INSERT INTO player_match_stats (match_id, player_id, club_id, rating, goals, assists, defenses, passes, interceptions, is_motm)
                    VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
                `);
                const recordMatchLogStmt = databaseInstance.prepare(`
                    INSERT INTO match_log (match_id, log_text) VALUES (?, ?)
                `);
                const updateMatchStatusStmt = databaseInstance.prepare(`
                    UPDATE match SET home_score = ?, away_score = ?, status = 'played' WHERE id = ?
                `);

                for (const result of allSimulatedResults) {
                    for (const stat of result.playerStats) {
                        savePlayerStatsStmt.run(
                            stat.match_id, stat.player_id, stat.club_id, stat.rating,
                            stat.goals, stat.assists, stat.defenses, stat.is_motm
                        );
                    }

                    recordMatchLogStmt.run(result.matchId, result.matchLogText);
                    updateMatchStatusStmt.run(result.home_score, result.away_score, result.matchId);
                    this.updateLeagueStandingsForMatch(databaseInstance, result);
                }
            })();

            for (const result of allSimulatedResults) {
                const homeClub = preloadedData.clubs.get(result.home_club_id);
                const home_club_reputation = homeClub?.reputation ?? 0;

                const matchResultWithReputation = { ...result, home_club_reputation };

                await MatchFinanceService.processMatchFinancials(matchResultWithReputation, databaseInstance);
            }

            fastify.log.info("All simulated match data saved to database successfully.");

        } catch (error: any) {
            console.log(error);
            fastify.log.error(`Error during worker simulation or database saving: ${error.message}`);
            throw error;
        }

        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateFormatted = nextDate.toISOString().split("T")[0];

        if (nextDate.getDate() === 1) {
            fastify.log.info(`Processing monthly payments for ${nextDateFormatted}...`);
            const clubs = databaseInstance.prepare(`SELECT id, reputation, name FROM club`).all() as { id: number, reputation: number, name: string }[];

            for (const club of clubs) {
                try {
                    await FinanceModel.processSalaryPayments(club.id, nextDateFormatted);
                } catch (error) {
                    fastify.log.error(`Failed to process salaries for club ${club.id}:`, error);
                }

                const baseMerchandiseRevenue = club.reputation * 500;
                const monthlyMerchandiseRevenue = baseMerchandiseRevenue + Math.floor(Math.random() * 2000);

                try {
                    await FinanceModel.recordTransaction(
                        club.id,
                        'Merchandise Sales',
                        monthlyMerchandiseRevenue,
                        `Monthly merchandising revenue.`,
                        'balance'
                    );
                } catch (error) {
                    fastify.log.error(`Error registering merchandising revenue for ${club.name}:`, error);
                }

                const monthlySponsorship = club.reputation * 300;

                try {
                    await FinanceModel.recordTransaction(
                        club.id,
                        'Sponsorship',
                        monthlySponsorship,
                        `Monthly sponsorship income.`,
                        'balance'
                    );
                } catch (error) {
                    fastify.log.error(`Error registering sponsorship for ${club.name}:`, error);
                }

                const monthlyBroadcastRevenue = club.reputation * 400;

                try {
                    await FinanceModel.recordTransaction(
                        club.id,
                        'Broadcast Revenue',
                        monthlyBroadcastRevenue,
                        `Monthly income from broadcasting rights`,
                        'balance'
                    );
                } catch (error) {
                    fastify.log.error(`Error registering broadcasting rights for ${club.name}:`, error);
                }
            }
        }

        databaseInstance.prepare(`
            UPDATE game_state SET current_date = ? WHERE id = ?
        `).run(nextDateFormatted, state.id);

        fastify.log.info(`Game date advanced to: ${nextDateFormatted}. Total matches played today: ${allSimulatedResults.length}`);

        return {
            played: allSimulatedResults.length,
            newDate: nextDateFormatted
        };
    }

    private static updateLeagueStandingsForMatch(databaseInstance: Database.Database, simulatedResult: SimulatedMatchResult): void {
        const { competition_id, season_id, leg_number, home_club_id, away_club_id, home_score, away_score } = simulatedResult;
        const currentMatchDay = leg_number;

        fastify.log.info(`Updating league standings for Competition ID: ${competition_id}, Season ID: ${season_id}, Match Day: ${currentMatchDay}`);

        const clubsInMatch = [home_club_id, away_club_id];

        databaseInstance.transaction(() => {
            for (const clubId of clubsInMatch) {
                const isHomeTeam = (clubId === home_club_id);
                const score = isHomeTeam ? home_score : away_score;
                const opponentScore = isHomeTeam ? away_score : home_score;

                let wins = 0;
                let draws = 0;
                let losses = 0;
                let points = 0;

                if (score > opponentScore) {
                    wins = 1;
                    points = 3;
                } else if (score === opponentScore) {
                    draws = 1;
                    points = 1;
                } else {
                    losses = 1;
                    points = 0;
                }

                const prevStanding = databaseInstance.prepare(`
                    SELECT played, wins, draws, losses, goals_for, goals_against, goal_difference, points
                    FROM league_standing
                    WHERE competition_id = ? AND season_id = ? AND club_id = ? AND match_day = (
                        SELECT MAX(match_day) FROM league_standing
                        WHERE competition_id = ? AND season_id = ? AND club_id = ?
                    )
                `).get(competition_id, season_id, clubId, competition_id, season_id, clubId) as { played: number, wins: number, draws: number, losses: number, goals_for: number, goals_against: number, goal_difference: number, points: number } | undefined;

                const currentPlayed = (prevStanding?.played || 0) + 1;
                const currentWins = (prevStanding?.wins || 0) + wins;
                const currentDraws = (prevStanding?.draws || 0) + draws;
                const currentLosses = (prevStanding?.losses || 0) + losses;
                const currentGoalsFor = (prevStanding?.goals_for || 0) + score;
                const currentGoalsAgainst = (prevStanding?.goals_against || 0) + opponentScore;
                const currentGoalDifference = currentGoalsFor - currentGoalsAgainst;
                const currentPoints = (prevStanding?.points || 0) + points;

                databaseInstance.prepare(`
                    DELETE FROM league_standing
                    WHERE competition_id = ? AND season_id = ? AND club_id = ? AND match_day = ?
                `).run(competition_id, season_id, clubId, currentMatchDay);


                databaseInstance.prepare(`
                    INSERT INTO league_standing (
                        competition_id, season_id, club_id, match_day,
                        played, wins, draws, losses, goals_for, goals_against,
                        goal_difference, points, position
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
                `).run(
                    competition_id, season_id, clubId, currentMatchDay,
                    currentPlayed, currentWins, currentDraws, currentLosses, currentGoalsFor, currentGoalsAgainst,
                    currentGoalDifference, currentPoints
                );
                fastify.log.debug(`Club ${clubId} stats updated for match day ${currentMatchDay}.`);
            }

            const standingsForCurrentDay = databaseInstance.prepare(`
                SELECT id, club_id, points, goal_difference, goals_for
                FROM league_standing
                WHERE competition_id = ? AND season_id = ? AND match_day = ?
                ORDER BY points DESC, goal_difference DESC, goals_for DESC, club_id ASC
            `).all(competition_id, season_id, currentMatchDay) as { id: number, club_id: number, points: number, goal_difference: number, goals_for: number }[];

            const updatePositionStmt = databaseInstance.prepare(`
                UPDATE league_standing SET position = ?
                WHERE id = ?
            `);

            for (let i = 0; i < standingsForCurrentDay.length; i++) {
                const standingEntry = standingsForCurrentDay[i];
                updatePositionStmt.run(i + 1, standingEntry.id);
                fastify.log.debug(`Club ${standingEntry.club_id} is now position ${i + 1} for match day ${currentMatchDay}.`);
            }
            fastify.log.info(`League positions updated for Match Day: ${currentMatchDay}.`);

        })();
    }
}

export default LoopService;