import fastify from "../../fastify";
import Database from "better-sqlite3";
import { MatchDbInfo } from "../../interfaces/match";
import { LeagueStandingData } from "../../interfaces/league";
import { PlayerLineupInfo, PlayerMatchStatsInput } from "../../interfaces/player";

class MatchEngineService {
    private static readonly HOME_ADVANTAGE_FACTOR = 3;
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

    private static readonly YELLOW_CARD_BASE_PROB = 0.02;
    private static readonly RED_CARD_BASE_PROB = 0.002;
    private static readonly INJURY_BASE_PROB = 0.01;

    private static randomValues(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static lineupExists(databaseInstance: Database.Database, matchId: number, clubId: number): boolean {
        const result = databaseInstance.prepare(
            `SELECT COUNT(*) as count FROM match_lineup WHERE match_id = ? AND club_id = ? AND is_starter = 1`
        ).get(matchId, clubId) as { count: number };
        return result.count >= 11;
    }

    private static generateAIAutoLineup(databaseInstance: Database.Database, matchId: number, clubId: number): void {
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

    private static getStartingPlayers(databaseInstance: Database.Database, matchId: number, clubId: number): PlayerLineupInfo[] {
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

    private static getTeamAttackDefense(players: PlayerLineupInfo[]): { attack: number, defense: number } {
        let totalAttackRating = 0;
        let totalDefenseRating = 0;
        let attackPlayersCount = 0;
        let defensePlayersCount = 0;

        for (const p of players) {
            const positionCategory = MatchEngineService.POSITION_CATEGORIES[p.position_name];

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

    private static simulateScore(
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

    private static generatePlayerStats(
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
                const goalProb = MatchEngineService.GOAL_PROB_BY_POSITION[p.position_name] || 0.001;
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
                    const assistProb = MatchEngineService.ASSIST_PROB_BY_POSITION[p.position_name] || 0.001;
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
            const positionCategory = MatchEngineService.POSITION_CATEGORIES[playerInfo.position_name];

            const finishingAttr = playerInfo.attributes.get('Finishing') || 1;
            const visionAttr = playerInfo.attributes.get('Vision') || 1;
            s.shots = Math.round((finishingAttr + visionAttr) / 2 * this.randomValues(0.1, 1.5));
            if (positionCategory === 'attack') s.shots += this.randomValues(0, 3);
            if (positionCategory === 'midfield') s.shots += this.randomValues(0, 1);
            s.shots_on_target = Math.round(s.shots * this.randomValues(0.3, 0.7));

            const passingAttr = playerInfo.attributes.get('Passing') || 1;
            s.passes = Math.round(passingAttr * this.randomValues(1, 4) + (positionCategory === 'midfield' || positionCategory === 'defense' ? 10 : 0));

            if (positionCategory === 'defense' || playerInfo.position_name === 'CDM') {
                const tacklingAttr = playerInfo.attributes.get('Tackling') || 1;
                const markingAttr = playerInfo.attributes.get('Marking') || 1;
                s.tackles_won = Math.round((tacklingAttr + markingAttr) / 2 * this.randomValues(0.5, 2));
                s.defenses = s.tackles_won;
                s.interceptions = Math.round((playerInfo.attributes.get('Vision') || 1) * this.randomValues(0.2, 1.5));
            } else if (positionCategory === 'goalkeeper') {
                s.defenses = Math.round((playerInfo.attributes.get('Goalkeeping') || 1) * this.randomValues(0.5, 3));
                s.shots_on_target = teamGoals + this.randomValues(0, 3);
            }

            const disciplineAttr = playerInfo.attributes.get('Discipline') || 20;
            s.fouls_committed = Math.round(this.randomValues(0, 3) + (20 - disciplineAttr) / 10);
            s.fouls_committed = Math.min(s.fouls_committed, 5);

            if (Math.random() < (MatchEngineService.YELLOW_CARD_BASE_PROB + (s.fouls_committed * 0.01) + (20 - disciplineAttr) * 0.005)) {
                s.yellow_cards = 1;
                if (Math.random() < (MatchEngineService.RED_CARD_BASE_PROB + (s.fouls_committed * 0.005) + (20 - disciplineAttr) * 0.001)) {
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

    private static recordMatchEvent(
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

    private static selectMOTMPlayers(playerStats: PlayerMatchStatsInput[], count = 1): number[] {
        return playerStats.sort((a, b) => b.rating - a.rating).slice(0, count).map(p => p.player_id);
    }

    private static savePlayerStats(databaseInstance: Database.Database, stats: PlayerMatchStatsInput[]): void {
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

    private static updateLeagueStandings(databaseInstance: Database.Database, match: MatchDbInfo & { home_score: number, away_score: number }): void {
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

    public static simulateMatch(databaseInstance: Database.Database, matchId: number): {
        matchId: number,
        homeScore: number,
        awayScore: number,
        highlightPlayerIds: number[],
        log: string
    } {
        fastify.log.info(`Simulating match ID: ${matchId}`);

        const match = databaseInstance.prepare(`
            SELECT
                m.id,
                m.home_club_id,
                m.away_club_id,
                ch.name as home_name,
                ca.name as away_name,
                m.competition_id,
                m.season_id,
                m.leg_number
            FROM match m
            JOIN club ch ON ch.id = m.home_club_id
            JOIN club ca ON ca.id = m.away_club_id
            WHERE m.id = ?
        `).get(matchId) as MatchDbInfo;

        if (!match) {
            fastify.log.error(`Match with ID ${matchId} not found.`);
            throw new Error(`Match with ID ${matchId} not found.`);
        }

        if (!MatchEngineService.lineupExists(databaseInstance, match.id, match.home_club_id)) {
            MatchEngineService.generateAIAutoLineup(databaseInstance, match.id, match.home_club_id);
        }
        if (!MatchEngineService.lineupExists(databaseInstance, match.id, match.away_club_id)) {
            MatchEngineService.generateAIAutoLineup(databaseInstance, match.id, match.away_club_id);
        }

        const homePlayers = MatchEngineService.getStartingPlayers(databaseInstance, match.id, match.home_club_id);
        const awayPlayers = MatchEngineService.getStartingPlayers(databaseInstance, match.id, match.away_club_id);

        if (homePlayers.length < 11 || awayPlayers.length < 11) {
            fastify.log.error(`Insufficient players for match ${match.id}. Home: ${homePlayers.length}, Away: ${awayPlayers.length}`);
            throw new Error("Insufficient players for match simulation.");
        }

        const homeTeamStrength = MatchEngineService.getTeamAttackDefense(homePlayers);
        const awayTeamStrength = MatchEngineService.getTeamAttackDefense(awayPlayers);

        const homeScore = MatchEngineService.simulateScore(homeTeamStrength.attack, awayTeamStrength.defense, MatchEngineService.HOME_ADVANTAGE_FACTOR);
        const awayScore = MatchEngineService.simulateScore(awayTeamStrength.attack, homeTeamStrength.defense);

        const homePlayerStats = MatchEngineService.generatePlayerStats(homePlayers, match.id, match.home_club_id, homeScore);
        const awayPlayerStats = MatchEngineService.generatePlayerStats(awayPlayers, match.id, match.away_club_id, awayScore);

        const allPlayerStats = [...homePlayerStats, ...awayPlayerStats];
        const motmPlayerIds = MatchEngineService.selectMOTMPlayers(allPlayerStats, 2);

        for (const motmId of motmPlayerIds) {
            const statEntry = allPlayerStats.find(s => s.player_id === motmId);
            if (statEntry) {
                statEntry.is_motm = 1;
            }
        }

        MatchEngineService.savePlayerStats(databaseInstance, allPlayerStats);

        const playersById = new Map<number, PlayerLineupInfo>();
        homePlayers.forEach(p => playersById.set(p.id, p));
        awayPlayers.forEach(p => playersById.set(p.id, p));

        MatchEngineService.recordMatchEvent(databaseInstance, match.id, 0, 'match_start', null, null, `Início da partida entre ${match.home_name} e ${match.away_name}.`);

        homePlayerStats.forEach(stat => {
            for (let g = 0; g < stat.goals; g++) {
                const scorer = playersById.get(stat.player_id);
                if (scorer) {
                    const eventTime = this.randomValues(1, 90);
                    const assistPlayer = allPlayerStats.find(s => s.assists > 0 && s.match_id === match.id && s.club_id === stat.club_id && s.player_id !== stat.player_id);
                    const assistDetails = assistPlayer ? ` (Assistência de ${playersById.get(assistPlayer.player_id)!.position_name})` : '';
                    MatchEngineService.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'goal',
                        stat.player_id,
                        stat.club_id,
                        `Goal scored by ${scorer.position_name} ${scorer.overall}${assistDetails}`
                    );
                }
            }
        });

        awayPlayerStats.forEach(stat => {
            for (let g = 0; g < stat.goals; g++) {
                const scorer = playersById.get(stat.player_id);
                if (scorer) {
                    const eventTime = this.randomValues(1, 90);
                    const assistPlayer = allPlayerStats.find(s => s.assists > 0 && s.match_id === match.id && s.club_id === stat.club_id && s.player_id !== stat.player_id);
                    const assistDetails = assistPlayer ? ` (Assistance from ${playersById.get(assistPlayer.player_id)!.position_name})` : '';
                    MatchEngineService.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'goal',
                        stat.player_id,
                        stat.club_id,
                        `Goal scored by ${scorer.position_name} ${scorer.overall}${assistDetails}`
                    );
                }
            }
        });

        allPlayerStats.forEach(stat => {
            const player = playersById.get(stat.player_id);
            if (!player) return;

            if ((stat.yellow_cards || 0) > 0) {
                const eventTime = this.randomValues(1, 90);
                MatchEngineService.recordMatchEvent(
                    databaseInstance,
                    match.id,
                    eventTime,
                    'yellow_card',
                    stat.player_id,
                    stat.club_id,
                    `${player.position_name} received a yellow card.`
                );
            }
            if ((stat.red_cards || 0) > 0) {
                const eventTime = this.randomValues(1, 90);
                MatchEngineService.recordMatchEvent(
                    databaseInstance,
                    match.id,
                    eventTime,
                    'red_card',
                    stat.player_id,
                    stat.club_id,
                    `${player.position_name} received a red card.`
                );
            }

            const injuryChance = MatchEngineService.INJURY_BASE_PROB + (100 - player.overall) * 0.0005;
            if (Math.random() < injuryChance) {
                const eventTime = this.randomValues(1, 90);
                const injuryTypes = ["Distensão Muscular", "Entorse no Tornozelo", "Lesão no Isquiotibial", "Concussão"];
                const randomInjury = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
                MatchEngineService.recordMatchEvent(
                    databaseInstance,
                    match.id,
                    eventTime,
                    'injury',
                    stat.player_id,
                    stat.club_id,
                    `${player.position_name} sofreu uma ${randomInjury}.`
                );
                // Você pode adicionar a lógica para inserir na tabela `player_injury` aqui se desejar
            }

            if ((stat.shots_on_target || 0) > 0 && player.position_name !== 'GK') {
                for (let s = 0; s < (stat.shots_on_target || 0); s++) {
                    const eventTime = this.randomValues(1, 90);
                    MatchEngineService.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'shot_on_target',
                        stat.player_id,
                        stat.club_id,
                        `${player.position_name} teve um chute a gol.`
                    );
                }
            }

            if (player.position_name === 'GK' && (stat.defenses || 0) > 0) {
                for (let s = 0; s < (stat.defenses || 0); s++) {
                    const eventTime = this.randomValues(1, 90);
                    MatchEngineService.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'goalkeeper_save',
                        stat.player_id,
                        stat.club_id,
                        `${player.position_name} fez uma defesa crucial.`
                    );
                }
            }
        });

        MatchEngineService.recordMatchEvent(databaseInstance, match.id, 90, 'match_end', null, null, `End of game: ${match.home_name} ${homeScore} - ${awayScore} ${match.away_name}.`);

        databaseInstance.prepare(`UPDATE match SET home_score = ?, away_score = ?, status = 'played' WHERE id = ?`)
            .run(homeScore, awayScore, match.id);

        MatchEngineService.updateLeagueStandings(databaseInstance, { ...match, home_score: homeScore, away_score: awayScore });

        return {
            matchId: match.id,
            homeScore,
            awayScore,
            highlightPlayerIds: motmPlayerIds,
            log: `Match Simulated: ${match.home_name} ${homeScore} - ${awayScore} ${match.away_name}.`
        };
    }
}

export default MatchEngineService;