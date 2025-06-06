import Database from "better-sqlite3";
import fastify from "../../../fastify";
import { randomValues } from "../../../utils/utils";
import { MatchDbInfo } from "../../../interfaces/match";
import MatchServiceUtils from "./utils/matchServiceUtils";
import { PlayerLineupInfo } from "../../../interfaces/player";

class MatchEngineService {
    private static readonly INJURY_BASE_PROB = 0.01;
    private static readonly HOME_ADVANTAGE_FACTOR = 3;

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

        if (!MatchServiceUtils.lineupExists(databaseInstance, match.id, match.home_club_id)) {
            MatchServiceUtils.generateAIAutoLineup(databaseInstance, match.id, match.home_club_id);
        }
        if (!MatchServiceUtils.lineupExists(databaseInstance, match.id, match.away_club_id)) {
            MatchServiceUtils.generateAIAutoLineup(databaseInstance, match.id, match.away_club_id);
        }

        const homePlayers = MatchServiceUtils.getStartingPlayers(databaseInstance, match.id, match.home_club_id);
        const awayPlayers = MatchServiceUtils.getStartingPlayers(databaseInstance, match.id, match.away_club_id);

        if (homePlayers.length < 11 || awayPlayers.length < 11) {
            fastify.log.error(`Insufficient players for match ${match.id}. Home: ${homePlayers.length}, Away: ${awayPlayers.length}`);
            throw new Error("Insufficient players for match simulation.");
        }

        const homeTeamStrength = MatchServiceUtils.getTeamAttackDefense(homePlayers);
        const awayTeamStrength = MatchServiceUtils.getTeamAttackDefense(awayPlayers);

        const homeScore = MatchServiceUtils.simulateScore(homeTeamStrength.attack, awayTeamStrength.defense, MatchEngineService.HOME_ADVANTAGE_FACTOR);
        const awayScore = MatchServiceUtils.simulateScore(awayTeamStrength.attack, homeTeamStrength.defense);

        const homePlayerStats = MatchServiceUtils.generatePlayerStats(homePlayers, match.id, match.home_club_id, homeScore);
        const awayPlayerStats = MatchServiceUtils.generatePlayerStats(awayPlayers, match.id, match.away_club_id, awayScore);

        const allPlayerStats = [...homePlayerStats, ...awayPlayerStats];
        const motmPlayerIds = MatchServiceUtils.selectMOTMPlayers(allPlayerStats, 2);

        for (const motmId of motmPlayerIds) {
            const statEntry = allPlayerStats.find(s => s.player_id === motmId);
            if (statEntry) {
                statEntry.is_motm = 1;
            }
        }

        MatchServiceUtils.savePlayerStats(databaseInstance, allPlayerStats);

        const playersById = new Map<number, PlayerLineupInfo>();
        homePlayers.forEach(p => playersById.set(p.id, p));
        awayPlayers.forEach(p => playersById.set(p.id, p));

        MatchServiceUtils.recordMatchEvent(databaseInstance, match.id, 0, 'match_start', null, null, `Start of the match between ${match.home_name} e ${match.away_name}.`);

        homePlayerStats.forEach(stat => {
            for (let g = 0; g < stat.goals; g++) {
                const scorer = playersById.get(stat.player_id);
                if (scorer) {
                    const eventTime = randomValues(1, 90);
                    const assistPlayer = allPlayerStats.find(s => s.assists > 0 && s.match_id === match.id && s.club_id === stat.club_id && s.player_id !== stat.player_id);
                    const assistDetails = assistPlayer ? ` (Assistance from ${playersById.get(assistPlayer.player_id)!.position_name})` : '';
                    MatchServiceUtils.recordMatchEvent(
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
                    const eventTime = randomValues(1, 90);
                    const assistPlayer = allPlayerStats.find(s => s.assists > 0 && s.match_id === match.id && s.club_id === stat.club_id && s.player_id !== stat.player_id);
                    const assistDetails = assistPlayer ? ` (Assistance from ${playersById.get(assistPlayer.player_id)!.position_name})` : '';
                    MatchServiceUtils.recordMatchEvent(
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
                const eventTime = randomValues(1, 90);
                MatchServiceUtils.recordMatchEvent(
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
                const eventTime = randomValues(1, 90);
                MatchServiceUtils.recordMatchEvent(
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
                const eventTime = randomValues(1, 90);
                const injuryTypes = ["Muscle Strain", "Ankle Sprain", "ACL Tear", "Hamstring Injury", "Concussion", "Fracture", "Tendonitis"];
                const randomInjury = injuryTypes[Math.floor(Math.random() * injuryTypes.length)];
                MatchServiceUtils.recordMatchEvent(
                    databaseInstance,
                    match.id,
                    eventTime,
                    'injury',
                    stat.player_id,
                    stat.club_id,
                    `${player.position_name} suffered a ${randomInjury}.`
                );
            }

            if ((stat.shots_on_target || 0) > 0 && player.position_name !== 'GK') {
                for (let s = 0; s < (stat.shots_on_target || 0); s++) {
                    const eventTime = randomValues(1, 90);
                    MatchServiceUtils.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'shot_on_target',
                        stat.player_id,
                        stat.club_id,
                        `${player.position_name} had a shot on goal.`
                    );
                }
            }

            if (player.position_name === 'GK' && (stat.defenses || 0) > 0) {
                for (let s = 0; s < (stat.defenses || 0); s++) {
                    const eventTime = randomValues(1, 90);
                    MatchServiceUtils.recordMatchEvent(
                        databaseInstance,
                        match.id,
                        eventTime,
                        'goalkeeper_save',
                        stat.player_id,
                        stat.club_id,
                        `${player.position_name} made a crucial save.`
                    );
                }
            }
        });

        MatchServiceUtils.recordMatchEvent(databaseInstance, match.id, 90, 'match_end', null, null, `End of game: ${match.home_name} ${homeScore} - ${awayScore} ${match.away_name}.`);

        databaseInstance.prepare(`UPDATE match SET home_score = ?, away_score = ?, status = 'played' WHERE id = ?`)
            .run(homeScore, awayScore, match.id);

        MatchServiceUtils.updateLeagueStandings(databaseInstance, { ...match, home_score: homeScore, away_score: awayScore });

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