import Database from "better-sqlite3";
import fastify from "../../../fastify";
import { randomValues } from "../../../utils/utils";
import { MatchDbInfo } from "../../../interfaces/engine";
import { LeagueStandingData } from "../../../interfaces/league";
import { PlayerLineupInfo, PlayerMatchStatsInput } from "../../../interfaces/player";

class MatchServiceUtils {
    private static readonly RED_CARD_BASE_PROB = 0.002;
    private static readonly YELLOW_CARD_BASE_PROB = 0.02

    private static readonly POSITION_CATEGORIES: Record<string, 'attack' | 'midfield' | 'defense' | 'goalkeeper'> = {
        'ST': 'attack', 'CF': 'attack', 'LW': 'attack', 'RW': 'attack', 'CAM': 'attack',
        'LM': 'midfield', 'RM': 'midfield', 'CM': 'midfield', 'CDM': 'midfield',
        'LB': 'defense', 'RB': 'defense', 'LWB': 'defense', 'RWB': 'defense', 'CB': 'defense',
        'GK': 'goalkeeper'
    };

    private static readonly GOAL_PROB_BY_POSITION: { [key: string]: number } = {
        ST: 0.35, CF: 0.25, LW: 0.15, RW: 0.15, CAM: 0.08, CM: 0.04, CDM: 0.01,
        LM: 0.03, RM: 0.03, LB: 0.005, RB: 0.005, LWB: 0.01, RWB: 0.01, CB: 0.005, GK: 0.0
    };

    private static readonly ASSIST_PROB_BY_POSITION: { [key: string]: number } = {
        ST: 0.05, CF: 0.10, LW: 0.15, RW: 0.15, CAM: 0.25, CM: 0.15, CDM: 0.08,
        LM: 0.12, RM: 0.12, LB: 0.05, RB: 0.05, LWB: 0.08, RWB: 0.08, CB: 0.01, GK: 0.0
    };

    public static lineupExists(databaseInstance: Database.Database, matchId: number, clubId: number): boolean {
        const result = databaseInstance.prepare(
            `SELECT COUNT(*) as count FROM match_lineup WHERE match_id = ? AND club_id = ? AND is_starter = 1`
        ).get(matchId, clubId) as { count: number };
        return result.count >= 11;
    }

    public static generateAIAutoLineup(databaseInstance: Database.Database, matchId: number, clubId: number): void {
        const players = databaseInstance.prepare(`
            SELECT
                p.id,
                p.overall,
                pp.name as position_name,
                pp.id as position_id
            FROM player p
            JOIN player_contract pc ON pc.player_id = p.id
            JOIN player_position pp ON pp.id = p.position_id
            WHERE pc.club_id = ?
            ORDER BY p.overall DESC
            LIMIT 11
        `).all(clubId) as { id: number, overall: number, position_name: string, position_id: number }[];

        if (players.length < 11) {
            fastify.log.warn(`Not enough players (${players.length}) to form a full lineup for club ${clubId} in match ${matchId}.`);
            return;
        }

        databaseInstance.transaction(() => {
            databaseInstance.prepare(`DELETE FROM match_lineup WHERE match_id = ? AND club_id = ?`).run(matchId, clubId);

            const insertLineupStmt = databaseInstance.prepare(
                `INSERT INTO match_lineup (match_id, club_id, player_id, is_starter, position_played_id, is_captain) 
                VALUES (?, ?, ?, 1, ?, ?)`
            );

            for (let i = 0; i < players.length; i++) {
                const player = players[i];
                const isCaptain = i === 0 ? 1 : 0;
                insertLineupStmt.run(matchId, clubId, player.id, player.position_id, isCaptain);
            }
        })();
    }

    public static getStartingPlayers(databaseInstance: Database.Database, matchId: number, clubId: number): PlayerLineupInfo[] {
        const playersRaw = databaseInstance.prepare(`
                SELECT
                    p.id,
                    p.overall,
                    pp.name as position_name,
                    pat.name as attribute_name,
                    pa.value as attribute_value
                FROM player p
                JOIN match_lineup ml ON ml.player_id = p.id
                JOIN player_position pp ON pp.id = ml.position_played_id
                LEFT JOIN player_attribute pa ON pa.player_id = p.id
                LEFT JOIN attribute_type pat ON pat.id = pa.attribute_type_id
                WHERE ml.match_id = ? AND ml.club_id = ? AND ml.is_starter = 1
            `).all(matchId, clubId) as { id: number, overall: number, position_name: string, attribute_name: string, attribute_value: number }[];

        const playersMap = new Map<number, PlayerLineupInfo>();

        for (const row of playersRaw) {
            if (!playersMap.has(row.id)) {
                playersMap.set(row.id, {
                    id: row.id,
                    overall: row.overall,
                    position_name: row.position_name,
                    attributes: new Map<string, number>()
                });
            }
            if (row.attribute_name && row.attribute_value !== null) {
                playersMap.get(row.id)!.attributes.set(row.attribute_name, row.attribute_value);
            }
        }
        return Array.from(playersMap.values());
    }

    public static getTeamAttackDefense(players: PlayerLineupInfo[]): { attack: number, defense: number } {
        let totalAttackRating = 0;
        let totalDefenseRating = 0;
        let attackPlayersCount = 0;
        let defensePlayersCount = 0;

        for (const p of players) {
            const positionCategory = MatchServiceUtils.POSITION_CATEGORIES[p.position_name];

            const finishing = p.attributes.get('Finishing') || 0;
            const dribbling = p.attributes.get('Dribbling') || 0;
            const passing = p.attributes.get('Passing') || 0;
            const vision = p.attributes.get('Vision') || 0;
            const pace = p.attributes.get('Pace') || 0;

            const tackling = p.attributes.get('Tackling') || 0;
            const marking = p.attributes.get('Marking') || 0;
            const strength = p.attributes.get('Strength') || 0;
            const composure = p.attributes.get('Composure') || 0;
            const goalkeeping = p.attributes.get('Goalkeeping') || 0;

            if (positionCategory === 'attack') {
                totalAttackRating += (finishing * 0.3 + dribbling * 0.25 + passing * 0.2 + vision * 0.15 + pace * 0.1);
                attackPlayersCount++;
            } else if (positionCategory === 'midfield') {
                totalAttackRating += (passing * 0.3 + vision * 0.25 + dribbling * 0.15 + (tackling * 0.15) + (composure * 0.15));
                attackPlayersCount++;
                totalDefenseRating += ((tackling * 0.3) + (marking * 0.2) + (passing * 0.2) + (composure * 0.15) + (strength * 0.15));
                defensePlayersCount++;
            } else if (positionCategory === 'defense') {
                totalDefenseRating += (tackling * 0.35 + marking * 0.35 + strength * 0.15 + composure * 0.15);
                defensePlayersCount++;
            } else if (positionCategory === 'goalkeeper') {
                totalDefenseRating += goalkeeping * 1.0;
                defensePlayersCount++;
            }
        }

        const finalAttack = attackPlayersCount > 0 ? totalAttackRating / attackPlayersCount : 12;
        const finalDefense = defensePlayersCount > 0 ? totalDefenseRating / defensePlayersCount : 12;

        return {
            attack: finalAttack * 4.95,
            defense: finalDefense * 4.95
        };
    }

    public static simulateScore(
        teamAttack: number,
        opponentDefense: number,
        homeAdvantage: number = 0
    ): number {
        const baseExpectedGoals = 1.5;
        const strengthDifference = (teamAttack + homeAdvantage) - opponentDefense;
        const goalsPerStrengthPoint = 0.025;

        const expectedGoals = Math.max(
            0,
            baseExpectedGoals + (strengthDifference * goalsPerStrengthPoint)
        );

        let L = Math.exp(-expectedGoals);
        let k = 0;
        let p = 1;
        do {
            k++;
            p *= Math.random();
        } while (p > L);
        return k - 1;
    }

    public static generatePlayerStats(
        players: PlayerLineupInfo[],
        matchId: number,
        clubId: number,
        teamGoals: number
    ): PlayerMatchStatsInput[] {
        const stats: PlayerMatchStatsInput[] = players.map(p => ({
            player_id: p.id,
            club_id: clubId,
            match_id: matchId,
            rating: 6.0,
            goals: 0,
            assists: 0,
            defenses: 0,
            passes: 0,
            interceptions: 0,
            is_motm: 0,
            shots: 0,
            shots_on_target: 0,
            tackles_won: 0,
            fouls_committed: 0,
            yellow_cards: 0,
            red_cards: 0,
        }));

        for (let i = 0; i < teamGoals; i++) {
            const weights = players.map(p => {
                const goalProb = MatchServiceUtils.GOAL_PROB_BY_POSITION[p.position_name] || 0.001;
                const finishing = p.attributes.get('Finishing') || 1;
                return goalProb * (finishing / 20) * (p.overall / 100);
            });
            const totalWeight = weights.reduce((a, b) => a + b, 0);

            if (totalWeight > 0) {
                let r = Math.random() * totalWeight;
                let chosenPlayerIdx = 0;
                while (r > 0 && chosenPlayerIdx < weights.length) {
                    r -= weights[chosenPlayerIdx++];
                }
                chosenPlayerIdx = Math.max(0, chosenPlayerIdx - 1);
                stats.find(s => s.player_id === players[chosenPlayerIdx].id)!.goals += 1;
            }
        }

        for (let i = 0; i < teamGoals; i++) {
            if (Math.random() < 0.85) {
                const scorer = stats.find(s => s.goals > 0);
                const possibleAssisters = players.filter(p => !scorer || p.id !== scorer.player_id);

                if (possibleAssisters.length === 0) continue;

                const weights = possibleAssisters.map(p => {
                    const assistProb = MatchServiceUtils.ASSIST_PROB_BY_POSITION[p.position_name] || 0.001;
                    const passing = p.attributes.get('Passing') || 1;
                    const vision = p.attributes.get('Vision') || 1;
                    return assistProb * ((passing + vision) / 40) * (p.overall / 100);
                });
                const totalWeight = weights.reduce((a, b) => a + b, 0);

                if (totalWeight > 0) {
                    let r = Math.random() * totalWeight;
                    let chosenPlayerIdx = 0;
                    while (r > 0 && chosenPlayerIdx < weights.length) {
                        r -= weights[chosenPlayerIdx++];
                    }
                    chosenPlayerIdx = Math.max(0, chosenPlayerIdx - 1);
                    stats.find(s => s.player_id === possibleAssisters[chosenPlayerIdx].id)!.assists += 1;
                }
            }
        }

        for (const s of stats) {
            const playerInfo = players.find(p => p.id === s.player_id)!;
            const positionCategory = MatchServiceUtils.POSITION_CATEGORIES[playerInfo.position_name];

            const finishingAttr = playerInfo.attributes.get('Finishing') || 1;
            const visionAttr = playerInfo.attributes.get('Vision') || 1;
            s.shots = Math.round((finishingAttr + visionAttr) / 2 * randomValues(0.1, 1.5));
            if (positionCategory === 'attack') s.shots += randomValues(0, 3);
            if (positionCategory === 'midfield') s.shots += randomValues(0, 1);
            s.shots_on_target = Math.round(s.shots * randomValues(0.3, 0.7));

            const passingAttr = playerInfo.attributes.get('Passing') || 1;
            s.passes = Math.round(passingAttr * randomValues(1, 4) + (positionCategory === 'midfield' || positionCategory === 'defense' ? 10 : 0));

            if (positionCategory === 'defense' || playerInfo.position_name === 'CDM') {
                const tacklingAttr = playerInfo.attributes.get('Tackling') || 1;
                const markingAttr = playerInfo.attributes.get('Marking') || 1;
                s.tackles_won = Math.round((tacklingAttr + markingAttr) / 2 * randomValues(0.5, 2));
                s.defenses = s.tackles_won;
                s.interceptions = Math.round((playerInfo.attributes.get('Vision') || 1) * randomValues(0.2, 1.5));
            } else if (positionCategory === 'goalkeeper') {
                s.defenses = Math.round((playerInfo.attributes.get('Goalkeeping') || 1) * randomValues(0.5, 3));
                s.shots_on_target = teamGoals + randomValues(0, 3);
            }

            const disciplineAttr = playerInfo.attributes.get('Discipline') || 20;
            s.fouls_committed = Math.round(randomValues(0, 3) + (20 - disciplineAttr) / 10);
            s.fouls_committed = Math.min(s.fouls_committed, 5);

            if (Math.random() < (MatchServiceUtils.YELLOW_CARD_BASE_PROB + (s.fouls_committed * 0.01) + (20 - disciplineAttr) * 0.005)) {
                s.yellow_cards = 1;
                if (Math.random() < (MatchServiceUtils.RED_CARD_BASE_PROB + (s.fouls_committed * 0.005) + (20 - disciplineAttr) * 0.001)) {
                    s.red_cards = 1;
                }
            }
        }

        for (const s of stats) {
            const playerInfo = players.find(p => p.id === s.player_id)!;
            const baseRating = 6.0 + (playerInfo.overall - 60) / 20;
            const goalBonus = s.goals * 0.8;
            const assistBonus = s.assists * 0.5;
            const defenseBonus = (s.defenses + s.interceptions + (s.tackles_won || 0)) / 15 * 0.1;
            const passBonus = s.passes / 50 * 0.05;
            const shotBonus = (s.shots_on_target || 0) / 5 * 0.05;
            const cardPenalty = (s.yellow_cards || 0) * 0.3 + (s.red_cards || 0) * 1.0;

            s.rating = Math.min(10, parseFloat((baseRating + goalBonus + assistBonus + defenseBonus + passBonus + shotBonus - cardPenalty).toFixed(1)));
            s.rating = Math.max(4.0, s.rating);
        }

        return stats;
    }

    public static recordMatchEvent(
        databaseInstance: Database.Database,
        matchId: number,
        eventTime: number,
        eventType: string,
        playerId: number | null = null,
        clubId: number | null = null,
        details: string | null = null
    ): void {
        databaseInstance.prepare(`
                INSERT INTO match_event (match_id, event_time, event_type, player_id, club_id, details)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(matchId, eventTime, eventType, playerId, clubId, details);
    }

    public static selectMOTMPlayers(playerStats: PlayerMatchStatsInput[], count = 1): number[] {
        return playerStats.sort((a, b) => b.rating - a.rating).slice(0, count).map(p => p.player_id);
    }

    public static savePlayerStats(databaseInstance: Database.Database, stats: PlayerMatchStatsInput[]): void {
        const insertStmt = databaseInstance.prepare(`
                INSERT INTO player_match_stats (match_id, player_id, club_id, rating, goals, assists, defenses, passes, interceptions, is_motm, shots, shots_on_target, tackles_won, fouls_committed, yellow_cards, red_cards)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

        databaseInstance.transaction(() => {
            for (const stat of stats) {
                insertStmt.run(
                    stat.match_id,
                    stat.player_id,
                    stat.club_id,
                    stat.rating,
                    stat.goals,
                    stat.assists,
                    stat.defenses,
                    stat.passes,
                    stat.interceptions,
                    stat.is_motm,
                    stat.shots,
                    stat.shots_on_target,
                    stat.tackles_won,
                    stat.fouls_committed,
                    stat.yellow_cards,
                    stat.red_cards
                );
            }
        })();
    }

    public static updateLeagueStandings(databaseInstance: Database.Database, match: MatchDbInfo & { home_score: number, away_score: number }): void {
        const { competition_id, season_id, leg_number, home_club_id, away_club_id, home_score, away_score } = match;
        const currentMatchDay = leg_number;

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

                const prevStanding = databaseInstance.prepare<[number, number, number]>(`
                    SELECT played, wins, draws, losses, goals_for, goals_against, goal_difference, points
                    FROM league_standing
                    WHERE competition_id = ? AND season_id = ? AND club_id = ?
                    ORDER BY match_day DESC
                    LIMIT 1
                `).get(competition_id, season_id, clubId) as LeagueStandingData | undefined;

                const currentPlayed = (prevStanding?.played || 0) + 1;
                const currentWins = (prevStanding?.wins || 0) + wins;
                const currentDraws = (prevStanding?.draws || 0) + draws;
                const currentLosses = (prevStanding?.losses || 0) + losses;
                const currentGoalsFor = (prevStanding?.goals_for || 0) + score;
                const currentGoalsAgainst = (prevStanding?.goals_against || 0) + opponentScore;
                const currentGoalDifference = currentGoalsFor - currentGoalsAgainst;
                const currentPoints = (prevStanding?.points || 0) + points;

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
            }

            const standingsForCurrentDay = databaseInstance.prepare<[number, number, number]>(`
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
            }
        })();
    }
}

export default MatchServiceUtils;