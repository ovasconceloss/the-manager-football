import fastify from "../../fastify";
import Database from "better-sqlite3";

class FixtureService {
    public static createFixtures(databaseInstance: Database.Database, seasonId: number) {
        try {
            const seasonInformation = databaseInstance.prepare(`
                SELECT id, start_date, end_date FROM season WHERE id = ?`
            ).get(seasonId) as { id: number, start_date: string, end_date: string };

            const seasonStartDate = new Date(seasonInformation.start_date + 'T12:00:00Z');
            const nationalLeagueCompetitions = databaseInstance.prepare(`
                SELECT id, name, type, nation_id FROM competition WHERE type = 'league' AND nation_id IS NOT NULL    
            `).all() as { id: number, name: string, type: string, nation_id: number }[];

            const leagueDetailsMap = new Map<number, { name: string, nationId: number }>();

            for (const league of nationalLeagueCompetitions) {
                if (league.nation_id !== null) leagueDetailsMap.set(league.id, { name: league.name, nationId: league.nation_id });
            }

            const allClubs = databaseInstance.prepare(`
                SELECT id, nation_id FROM club
            `).all() as { id: number, nation_id: number }[];

            const insertCompetitionStageStatement = databaseInstance.prepare(`
                INSERT INTO competition_stage (competition_id, season_id, name, stage_order, stage_type, number_of_legs, is_current)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMatchStatement = databaseInstance.prepare(`
                INSERT INTO match (competition_id, season_id, stage_id, home_club_id, away_club_id, home_score, away_score, match_date, status, leg_number)
                VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'scheduled', ?)
            `);

            const generateFixturesTransaction = databaseInstance.transaction(() => {
                for (const [competitionId, leagueInfo] of leagueDetailsMap.entries()) {
                    const leagueName = leagueInfo.name;
                    const leagueNationId = leagueInfo.nationId;

                    fastify.log.info(`Generating fixtures for ${leagueName} (ID: ${competitionId}, Nation ID: ${leagueNationId})`);

                    const clubIdsOriginal = allClubs
                        .filter(club => club.nation_id === leagueNationId)
                        .map(club => club.id);

                    const clubIds = [...clubIdsOriginal];

                    if (clubIds.length < 2) {
                        fastify.log.warn(`
                            Warning: League '${leagueName}' has less than 2 clubs from its nation. Skipping fixture generation.
                        `);
                        continue;
                    }

                    const stageInsertResult = insertCompetitionStageStatement.run(
                        competitionId,
                        seasonId,
                        'League Stage',
                        1,
                        'league',
                        'two_legs',
                        1
                    ) as { lastInsertRowid: number };

                    const leagueStageId = stageInsertResult.lastInsertRowid;
                    fastify.log.info(`Created League Stage (ID: ${leagueStageId}) for ${leagueName}.`);

                    if (clubIds.length % 2 !== 0) clubIds.push(-1);

                    const totalTeams = clubIds.length;
                    const totalRoundsPerLeg = (totalTeams - 1);
                    const half = totalTeams / 2;

                    let currentMatchDate = new Date(seasonStartDate);

                    for (let round = 1; round <= totalRoundsPerLeg; round++) {
                        const matchDateString = currentMatchDate.toISOString().split("T")[0];

                        for (let i = 0; i < half; i++) {
                            const homeIdx = i;
                            const awayIdx = totalTeams - 1 - i;

                            const homeClubId = clubIds[homeIdx];
                            const awayClubId = clubIds[awayIdx];

                            if (homeClubId === -1 || awayClubId === -1) continue;

                            insertMatchStatement.run(
                                competitionId,
                                seasonId,
                                leagueStageId,
                                homeClubId,
                                awayClubId,
                                matchDateString,
                                round
                            );
                        }

                        const fixedTeam = clubIds[0];
                        const rotatingTeams = clubIds.slice(1);
                        rotatingTeams.unshift(rotatingTeams.pop()!);
                        clubIds.splice(1, rotatingTeams.length, ...rotatingTeams);
                        clubIds[0] = fixedTeam;

                        currentMatchDate.setDate(currentMatchDate.getDate() + 7);
                    }

                    for (let round = 1; round <= totalRoundsPerLeg; round++) {
                        const matchDateString = currentMatchDate.toISOString().split("T")[0];

                        for (let i = 0; i < half; i++) {
                            const homeIdx = i;
                            const awayIdx = totalTeams - 1 - i;

                            const homeClubIdOriginal = clubIds[homeIdx];
                            const awayClubIdOriginal = clubIds[awayIdx];

                            if (homeClubIdOriginal === -1 || awayClubIdOriginal === -1) continue;

                            const homeClubId = awayClubIdOriginal;
                            const awayClubId = homeClubIdOriginal;

                            insertMatchStatement.run(
                                competitionId,
                                seasonId,
                                leagueStageId,
                                homeClubId,
                                awayClubId,
                                matchDateString,
                                round + totalRoundsPerLeg
                            );
                        }

                        const fixedTeam = clubIds[0];
                        const rotatingTeams = clubIds.slice(1);
                        rotatingTeams.unshift(rotatingTeams.pop()!);
                        clubIds.splice(1, rotatingTeams.length, ...rotatingTeams);
                        clubIds[0] = fixedTeam;

                        currentMatchDate.setDate(currentMatchDate.getDate() + 7);
                    }
                }
            });

            generateFixturesTransaction();
            fastify.log.info("All league fixtures successfully created.");
        } catch (err: unknown) {
            fastify.log.error(`Error generating season fixtures for season ID ${seasonId}:`, err);
            throw err;
        }
    }
}

export default FixtureService;