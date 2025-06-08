import { randomValues } from '../../../utils/utils';
import { parentPort, workerData } from 'worker_threads';
import { ClubData, MatchDbInfo, PlayerData, PlayerLineupInfo, PlayerMatchStatsInput, PreloadedEngineData, SimulatedMatchResult } from '../../../interfaces/engine';

interface WorkerPreloadedData {
    players: [number, PlayerData][];
    playerContracts: [number, { club_id: number, player_id: number }[]][];
    playerAttributes: [number, [string, number][]][];
    attributeTypes: [number, string][];
    playerPositions: [number, string][];
    clubs: [number, ClubData][];
    matchLineups: [number, [number, { player_id: number; position_played_id: number; is_starter: number; is_captain: number; }[]][]][];
}

interface WorkerInput {
    matches: MatchDbInfo[];
    preloadedData: WorkerPreloadedData;
    logLevel: string;
}

const workerLogger = {
    info: (...args: any[]) => { if (workerData.logLevel === 'info' || workerData.logLevel === 'debug') console.log('[WORKER INFO]', ...args); },
    debug: (...args: any[]) => { if (workerData.logLevel === 'debug') console.log('[WORKER DEBUG]', ...args); },
    warn: (...args: any[]) => console.warn('[WORKER WARN]', ...args),
    error: (...args: any[]) => console.error('[WORKER ERROR]', ...args)
};

class MatchSimulator {
    private preloadedData: PreloadedEngineData;
    private static readonly HOME_ADVANTAGE = 5;

    private static readonly POSITION_CATEGORIES: Record<string, 'attack' | 'midfield' | 'defense' | 'goalkeeper'> = {
        'ST': 'attack', 'CF': 'attack', 'LW': 'attack', 'RW': 'attack', 'CAM': 'attack',
        'LM': 'midfield', 'RM': 'midfield', 'CM': 'midfield', 'CDM': 'midfield',
        'LB': 'defense', 'RB': 'defense', 'LWB': 'defense', 'RWB': 'defense', 'CB': 'defense',
        'GK': 'goalkeeper'
    };

    private static readonly GOAL_PROB_BY_POSITION: { [key: string]: number } = { ST: 0.28, CF: 0.22, LW: 0.15, RW: 0.15, CAM: 0.08, CM: 0.06, CDM: 0.02, LM: 0.03, RM: 0.03, LB: 0.01, RB: 0.01, CB: 0.01, GK: 0.0 };
    private static readonly ASSIST_PROB_BY_POSITION: { [key: string]: number } = { ST: 0.10, CF: 0.13, LW: 0.18, RW: 0.18, CAM: 0.18, CM: 0.10, CDM: 0.04, LM: 0.10, RM: 0.10, LB: 0.02, RB: 0.02, CB: 0.01, GK: 0.0 };

    constructor(preloadedData: WorkerPreloadedData) {
        this.preloadedData = {
            players: new Map(preloadedData.players),
            playerContracts: new Map(preloadedData.playerContracts.map(([id, arr]) => [id, arr])),
            playerAttributes: new Map(preloadedData.playerAttributes.map(([id, arr]) => [id, new Map(arr)])),
            attributeTypes: new Map(preloadedData.attributeTypes),
            playerPositions: new Map(preloadedData.playerPositions),
            clubs: new Map(preloadedData.clubs),
            matchLineups: new Map(preloadedData.matchLineups.map(([matchId, clubLineupsArr]) => [matchId, new Map(clubLineupsArr)]))
        };
    }

    private getStartingPlayersFromPreloadedData(matchId: number, clubId: number): PlayerLineupInfo[] {
        const lineupEntries = this.preloadedData.matchLineups.get(matchId)?.get(clubId);
        if (!lineupEntries) {
            workerLogger.warn(`Lineup data not found for match ${matchId}, club ${clubId}.`);
            return [];
        }

        const playersInLineup: PlayerLineupInfo[] = [];
        for (const entry of lineupEntries) {
            const player = this.preloadedData.players.get(entry.player_id);
            const positionName = this.preloadedData.playerPositions.get(entry.position_played_id);

            if (player && positionName) {
                playersInLineup.push({
                    id: player.id,
                    overall: player.overall,
                    position: positionName,
                });
            } else {
                workerLogger.warn(`Incomplete data for player ${entry.player_id} in lineup for match ${matchId}, club ${clubId}.`);
            }
        }
        return playersInLineup;
    }

    private getTeamAttackDefense(players: PlayerLineupInfo[]): { attack: number, defense: number } {
        let attack = 0, defense = 0, countA = 0, countD = 0;
        for (const p of players) {
            if (["ST", "CF", "LW", "RW", "CAM"].includes(p.position)) {
                attack += p.overall; countA++;
            } else if (["CB", "LB", "RB", "CDM", "GK"].includes(p.position)) {
                defense += p.overall; countD++;
            }
        }

        const att = countA ? attack / countA : 60;
        const def = countD ? defense / countD : 60;
        return { attack: att, defense: def };
    }

    private simulateScore(
        teamAttack: number,
        opponentDefense: number,
        homeAdvantage: number = 0
    ): number {
        const avgGoalsBase = 1.15;
        const attackVsDefense = teamAttack + homeAdvantage - opponentDefense;
        const strengthFactor = 0.018;
        const expectedGoals = Math.max(
            0,
            avgGoalsBase + (attackVsDefense) * strengthFactor
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

    private generatePlayerStats(
        players: PlayerLineupInfo[],
        matchId: number,
        clubId: number,
        teamGoals: number,
        opponentGoals: number
    ): PlayerMatchStatsInput[] {
        const goalProb = MatchSimulator.GOAL_PROB_BY_POSITION;
        const assistProb = MatchSimulator.ASSIST_PROB_BY_POSITION;

        const sortedPlayersByOverall = [...players].sort((a, b) => b.overall - a.overall);

        const stats = players.map(p => ({
            player_id: p.id,
            club_id: clubId,
            match_id: matchId,
            rating: 6.0,
            goals: 0,
            assists: 0,
            defenses: 0,
            is_motm: 0,
        }));

        for (let i = 0; i < teamGoals; i++) {
            const weights = sortedPlayersByOverall.map(p => (goalProb[p.position] || 0.01) * (p.overall / 100));
            const total = weights.reduce((a, b) => a + b, 0);
            let r = Math.random() * total;
            let idx = 0;

            while (r > 0 && idx < weights.length) {
                r -= weights[idx++];
            }

            idx = Math.max(0, idx - 1);
            const playerStat = stats.find(s => s.player_id === sortedPlayersByOverall[idx].id);
            if (playerStat) {
                playerStat.goals += 1;
            }
        }

        for (let i = 0; i < teamGoals; i++) {
            if (Math.random() < 0.85) {
                const scorer = stats.find(s => s.goals > 0);
                let possibleAssisters = sortedPlayersByOverall.filter(p => !scorer || p.id !== scorer.player_id);

                if (possibleAssisters.length === 0) {
                    possibleAssisters = sortedPlayersByOverall;
                }

                const weights = possibleAssisters.map(p => (assistProb[p.position] || 0.01) * (p.overall / 100));
                const total = weights.reduce((a, b) => a + b, 0);

                let r = Math.random() * total;
                let idx = 0;

                while (r > 0 && idx < weights.length) {
                    r -= weights[idx++];
                }

                idx = Math.max(0, idx - 1);
                const playerStat = stats.find(s => s.player_id === possibleAssisters[idx].id);
                if (playerStat) {
                    playerStat.assists += 1;
                }
            }
        }

        const goalkeeperStat = stats.find(s => {
            const player = players.find(p => p.id === s.player_id);
            return player && player.position === 'GK';
        });

        if (goalkeeperStat) {
            const goalkeeperInfo = players.find(p => p.id === goalkeeperStat.player_id);
            if (goalkeeperInfo) {

                const baseSaves = randomValues(3, 7);
                const overallImpact = (goalkeeperInfo.overall / 100);

                const savesFromConcededGoals = Math.max(0, opponentGoals - randomValues(0, 2));

                goalkeeperStat.defenses = Math.round((baseSaves * overallImpact) + (savesFromConcededGoals * overallImpact));
                goalkeeperStat.defenses = Math.max(goalkeeperStat.defenses, 0);
            }
        }

        for (const s of stats) {
            const playerInfo = players.find(p => p.id === s.player_id);
            if (playerInfo) {
                const base = 6.0 + (playerInfo.overall - 60) / 25;
                const goalBonus = s.goals * 0.8;
                const assistBonus = s.assists * 0.5;
                const defenseBonus = (s.defenses || 0) * 0.15;

                s.rating = Math.min(10, parseFloat((base + goalBonus + assistBonus + defenseBonus).toFixed(1)));
                s.rating = Math.max(4.0, s.rating);
            }
        }

        return stats;
    }

    private selectMOTMPlayers(playerStats: PlayerMatchStatsInput[], count = 1): number[] {
        return playerStats.sort((a, b) => b.rating - a.rating).slice(0, count).map(p => p.player_id);
    }

    public simulateMatch(matchInfo: MatchDbInfo): SimulatedMatchResult {
        workerLogger.info(`Worker simulating match ID: ${matchInfo.id}`);

        const homePlayers = this.getStartingPlayersFromPreloadedData(matchInfo.id, matchInfo.home_club_id);
        const awayPlayers = this.getStartingPlayersFromPreloadedData(matchInfo.id, matchInfo.away_club_id);

        if (homePlayers.length < 11 || awayPlayers.length < 11) {
            workerLogger.error(`Insufficient players for match ${matchInfo.id}. Home: ${homePlayers.length}, Away: ${awayPlayers.length}. Returning default result.`);
            return {
                matchId: matchInfo.id,
                home_score: 0,
                away_score: 0,
                motmPlayerIds: [],
                playerStats: [],
                matchLogText: `Match ${matchInfo.home_name} vs ${matchInfo.away_name} skipped due to incomplete line-ups.`,
                competition_id: matchInfo.competition_id,
                season_id: matchInfo.season_id,
                leg_number: matchInfo.leg_number,
                home_club_id: matchInfo.home_club_id,
                away_club_id: matchInfo.away_club_id,
                home_name: matchInfo.home_name,
                away_name: matchInfo.away_name,
            };
        }

        const homeTeamStrength = this.getTeamAttackDefense(homePlayers);
        const awayTeamStrength = this.getTeamAttackDefense(awayPlayers);

        const homeScore = this.simulateScore(homeTeamStrength.attack, awayTeamStrength.defense, MatchSimulator.HOME_ADVANTAGE);
        const awayScore = this.simulateScore(awayTeamStrength.attack, homeTeamStrength.defense);

        const homePlayerStats = this.generatePlayerStats(homePlayers, matchInfo.id, matchInfo.home_club_id, homeScore, awayScore);
        const awayPlayerStats = this.generatePlayerStats(awayPlayers, matchInfo.id, matchInfo.away_club_id, awayScore, homeScore);

        const allPlayerStats = [...homePlayerStats, ...awayPlayerStats];
        const motmPlayerIds = this.selectMOTMPlayers(allPlayerStats, 2);

        for (const motmId of motmPlayerIds) {
            const statEntry = allPlayerStats.find(s => s.player_id === motmId);
            if (statEntry) {
                statEntry.is_motm = 1;
            }
        }

        const matchLogText = `${matchInfo.home_name} ${homeScore} x ${awayScore} ${matchInfo.away_name}`;

        workerLogger.info(`Worker finished simulating match ID: ${matchInfo.id}. Score: ${homeScore}-${awayScore}`);

        return {
            matchId: matchInfo.id,
            home_score: homeScore,
            away_score: awayScore,
            motmPlayerIds: motmPlayerIds,
            playerStats: allPlayerStats,
            matchLogText: matchLogText,
            competition_id: matchInfo.competition_id,
            season_id: matchInfo.season_id,
            leg_number: matchInfo.leg_number,
            home_club_id: matchInfo.home_club_id,
            away_club_id: matchInfo.away_club_id,
            home_name: matchInfo.home_name,
            away_name: matchInfo.away_name,
        };
    }
}

if (!parentPort) {
    throw new Error('This script must be run as a worker thread.');
}

const { matches, preloadedData } = workerData as WorkerInput;
const simulator = new MatchSimulator(preloadedData);
const simulatedResults: SimulatedMatchResult[] = [];

for (const match of matches) {
    try {
        const result = simulator.simulateMatch(match);
        simulatedResults.push(result);
    } catch (error: any) {
        workerLogger.error(`Error simulating match ${match.id} in worker: ${error.message}`);
    }
}

parentPort.postMessage(simulatedResults);