import fastify from "../../fastify";
import Database from "better-sqlite3";

interface ClubDbInfo {
    id: number;
    nation_id: number;
}

interface SeasonDbInfo {
    id: number;
    end_date: string;
    start_date: string;
}

interface CompetitionStageInsertResult {
    lastInsertRowid: number;
}

interface CompetitionDbInfo {
    id: number;
    name: string;
    type: string; // 'league', 'cup', 'combination'
    nation_id: number | null;
    confederation_id: number | null;
}

class FixtureService {
    private static readonly HOLIDAYS: string[] = [
        '01-01',
        '12-25'
    ];

    private static isHoliday(date: Date): boolean {
        const monthDay = date.toISOString().substring(5, 10);
        return FixtureService.HOLIDAYS.includes(monthDay);
    }

    private static isWeekend(date: Date): boolean {
        const dayOfWeek = date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6;
    }

    private static getNextValidMatchDate(date: Date, seasonEndDate: Date, logger: any): Date {
        let newDate = new Date(date);
        let attempts = 0;
        const MAX_ATTEMPTS = 365 * 2;
        newDate.setDate(newDate.getDate() + 1);

        while (attempts < MAX_ATTEMPTS) {
            if (newDate > seasonEndDate) {
                logger.warn(`getNextValidMatchDate reached or exceeded season end date ${seasonEndDate.toISOString().split('T')[0]}. No more valid dates.`);
                return newDate;
            }

            if (FixtureService.isHoliday(newDate)) {
                logger.debug(`Skipping holiday: ${newDate.toISOString().split('T')[0]}`);
                newDate.setDate(newDate.getDate() + 1);
                attempts++;
                continue;
            }

            if (!FixtureService.isWeekend(newDate)) {
                logger.debug(`Skipping weekday: ${newDate.toISOString().split('T')[0]}`);
                newDate.setDate(newDate.getDate() + 1);
                attempts++;
                continue;
            }

            return newDate;
        }
        logger.error("Could not find a valid match date within reasonable attempts, season might be too short or holidays too many.");
        return newDate;
    }

    public static createFixtures(
        databaseInstance: Database.Database,
        seasonId: number,
    ) {
        try {
            const end_date = '2026-06-01';
            const start_date = '2025-08-01';

            const seasonInfo = databaseInstance.prepare("SELECT id, start_date, end_date FROM season WHERE id = ?").get(seasonId) as SeasonDbInfo;

            if (!seasonInfo) {
                fastify.log.error(`Error: Season with ID ${seasonId} not found. Cannot generate fixtures.`);
                return;
            }

            const seasonEndDate = new Date(end_date + 'T23:59:59Z');
            const seasonStartDate = new Date(start_date + 'T00:00:00Z');

            const nationalLeagueCompetitions = databaseInstance.prepare("SELECT id, name, type, nation_id FROM competition WHERE type = 'league' AND nation_id IS NOT NULL").all() as CompetitionDbInfo[];

            const leagueDetailsMap = new Map<number, { name: string, nationId: number }>();
            for (const league of nationalLeagueCompetitions) {
                if (league.nation_id !== null) {
                    leagueDetailsMap.set(league.id, { name: league.name, nationId: league.nation_id });
                }
            }

            const allClubs = databaseInstance.prepare("SELECT id, nation_id FROM club").all() as ClubDbInfo[];

            const insertCompetitionSeasonStmt = databaseInstance.prepare(`
                INSERT OR IGNORE INTO competition_season (competition_id, season_id)
                VALUES (?, ?)
            `);

            const insertCompetitionStageStatement = databaseInstance.prepare(`
                INSERT INTO competition_stage (competition_id, season_id, name, stage_order, stage_type, number_of_legs, is_current)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const insertMatchStatement = databaseInstance.prepare(`
                INSERT INTO match (competition_id, season_id, stage_id, home_club_id, away_club_id, home_score, away_score, match_date, status, leg_number)
                VALUES (?, ?, ?, ?, ?, 0, 0, ?, 'scheduled', ?)
            `);

            const generateFixturesTransaction = databaseInstance.transaction(() => {
                const leagueCurrentMatchDate = new Map<number, Date>();

                for (const [competitionId, leagueInfo] of leagueDetailsMap.entries()) {
                    const leagueName = leagueInfo.name;
                    const leagueNationId = leagueInfo.nationId;
                    fastify.log.info(`Generating fixtures for ${leagueName} (ID: ${competitionId}, Nation ID: ${leagueNationId})...`);

                    insertCompetitionSeasonStmt.run(competitionId, seasonId);
                    fastify.log.info(`Ensured competition_season entry for (${competitionId}, ${seasonId}).`);

                    const clubIdsOriginal = allClubs
                        .filter(club => club.nation_id === leagueNationId)
                        .map(club => club.id);

                    const clubIds = [...clubIdsOriginal];
                    if (clubIds.length < 2) {
                        fastify.log.warn(`Warning: League '${leagueName}' has less than 2 clubs from its nation. Skipping fixture generation.`);
                        continue;
                    }

                    const stageInsertResult = insertCompetitionStageStatement.run(
                        competitionId,
                        seasonId,
                        'group_stage',
                        1,
                        'league',
                        'two_legs',
                        1
                    ) as CompetitionStageInsertResult;
                    const leagueStageId = stageInsertResult.lastInsertRowid;

                    if (clubIds.length % 2 !== 0) {
                        clubIds.push(-1);
                    }

                    const totalTeams = clubIds.length;
                    const totalRoundsPerLeg = (totalTeams - 1);
                    const matchesPerRound = totalTeams / 2;
                    const totalRounds = totalRoundsPerLeg * 2;

                    const firstMatchDate = new Date(seasonStartDate);
                    firstMatchDate.setMonth(firstMatchDate.getMonth() + 1);

                    const weeksAvailable = Math.floor(
                        (seasonEndDate.getTime() - firstMatchDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
                    );

                    const weekInterval = Math.max(1, Math.floor(weeksAvailable / totalRounds));

                    let matchDayDate = new Date(firstMatchDate);

                    for (let leg = 0; leg < 2; leg++) {
                        fastify.log.info(`Generating Leg ${leg + 1} for ${leagueName}...`);

                        const currentLegClubIds = [...clubIdsOriginal];
                        if (currentLegClubIds.length % 2 !== 0) {
                            currentLegClubIds.push(-1);
                        }

                        for (let round = 0; round < totalRoundsPerLeg; round++) {
                            while (!FixtureService.isWeekend(matchDayDate) || FixtureService.isHoliday(matchDayDate)) {
                                matchDayDate.setDate(matchDayDate.getDate() + 1);
                            }
                            if (matchDayDate > seasonEndDate) {
                                fastify.log.warn(`Season end reached for ${leagueName} during fixture generation. Stopping.`);
                                break;
                            }
                            const matchDateString = matchDayDate.toISOString().split("T")[0];

                            const roundMatches: { home: number, away: number }[] = [];
                            for (let i = 0; i < matchesPerRound; i++) {
                                let homeClubId = currentLegClubIds[i];
                                let awayClubId = currentLegClubIds[totalTeams - 1 - i];

                                if (leg === 1) {
                                    [homeClubId, awayClubId] = [awayClubId, homeClubId];
                                }

                                if (homeClubId === -1 || awayClubId === -1) {
                                    continue;
                                }
                                roundMatches.push({ home: homeClubId, away: awayClubId });
                            }

                            FixtureService.shuffleArray(roundMatches);

                            let currentMatchDateForThisRound = new Date(matchDayDate);
                            const maxDaysSpread = Math.min(roundMatches.length, 3);

                            for (let i = 0; i < roundMatches.length; i++) {
                                const match = roundMatches[i];
                                let dateToAssign = new Date(currentMatchDateForThisRound);

                                while (FixtureService.isHoliday(dateToAssign)) {
                                    dateToAssign.setDate(dateToAssign.getDate() + 1);
                                }

                                if (i > 0 && i < maxDaysSpread) {
                                    dateToAssign.setDate(dateToAssign.getDate() + 1);
                                    while (FixtureService.isHoliday(dateToAssign)) {
                                        dateToAssign.setDate(dateToAssign.getDate() + 1);
                                    }
                                }

                                const finalMatchDateString = dateToAssign.toISOString().split("T")[0];

                                insertMatchStatement.run(
                                    competitionId,
                                    seasonId,
                                    leagueStageId,
                                    match.home,
                                    match.away,
                                    finalMatchDateString,
                                    (leg * totalRoundsPerLeg) + round + 1
                                );
                            }

                            const fixedTeam = currentLegClubIds[0];
                            const rotatingTeams = currentLegClubIds.slice(1);
                            rotatingTeams.unshift(rotatingTeams.pop()!);
                            currentLegClubIds.splice(1, rotatingTeams.length, ...rotatingTeams);
                            currentLegClubIds[0] = fixedTeam;

                            matchDayDate.setDate(matchDayDate.getDate() + (weekInterval * 7));
                        }
                    }
                }
            });

            generateFixturesTransaction();

            fastify.log.info("All league fixtures successfully created and competition_season entries ensured.");
        } catch (err: unknown) {
            fastify.log.error(`Error generating season fixtures for season ID ${seasonId}:`, err);
            throw err;
        }
    }

    private static shuffleArray<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

export default FixtureService;