import fastify from "../../fastify";
import Database from "better-sqlite3";
import FinanceModel from "../../models/financeModel";
import SeasonService from "../../services/seasonService";

class SeasonEndService {
    public static async processSeasonEnd(
        databaseInstance: Database.Database,
        currentSeasonId: number,
    ): Promise<void> {
        fastify.log.info(`Starting end of season process for ${currentSeasonId}`);

        databaseInstance.transaction(() => {
            const currentSeasonEndDate = databaseInstance.prepare(`SELECT end_date FROM season WHERE id = ?`).get(currentSeasonId) as { end_date: string } | undefined;

            if (!currentSeasonEndDate) {
                fastify.log.error(`End date not found for season ${currentSeasonId}. Aborting end of season process.`);
                throw new Error(`End date not found for season ${currentSeasonId}`);
            }

            databaseInstance.prepare(`UPDATE season SET status = 'finished' WHERE id = ?`).run(currentSeasonId);
            fastify.log.info(`Season ${currentSeasonId} marked as 'finished'.`);

            SeasonEndService.processCollectiveAwardsSync(databaseInstance, currentSeasonId);
            SeasonEndService.processIndividualAwardsSync(databaseInstance, currentSeasonId);
            SeasonEndService.handleContractExpirationsSync(databaseInstance, currentSeasonId);

            const lastSeasonEndDate = new Date(currentSeasonEndDate.end_date + 'T12:00:00Z');
            const nextSeasonStartDateObj = new Date(lastSeasonEndDate);
            nextSeasonStartDateObj.setDate(lastSeasonEndDate.getDate() + 7);

            const nextSeasonStartDate = nextSeasonStartDateObj.toISOString().split('T')[0];
            const nextSeasonEndDate = SeasonEndService.calculateNextSeasonEndDate(nextSeasonStartDate);

            const newSeasonId = SeasonService.insertNewSeasonSync(nextSeasonStartDate, nextSeasonEndDate);
            fastify.log.info(`New season ${newSeasonId} started on ${nextSeasonStartDate}.`);

            databaseInstance.prepare(`
                UPDATE game_state SET current_date = ?, season_id = ? WHERE id = (SELECT id FROM game_state LIMIT 1);
            `).run(nextSeasonStartDate, newSeasonId);
            fastify.log.info(`Game state updated for Season ${newSeasonId} and date ${nextSeasonStartDate}.`);

            // TODO: Additional end-of-season logic, such as:
            // - Generation of new junior players (youth intake).
            // - Updating club/league reputations.
            // - Resetting annual statistics that are not saved.

        })();

        fastify.log.info(`End of Season ${currentSeasonId} process COMPLETED.`);
    }

    private static calculateNextSeasonEndDate(nextSeasonStartDate: string): string {
        const startDate = new Date(nextSeasonStartDate + 'T12:00:00Z');
        const endDate = new Date(startDate);
        endDate.setFullYear(startDate.getFullYear() + 1);
        endDate.setDate(endDate.getDate() - 1);
        return endDate.toISOString().split('T')[0];
    }

    private static processCollectiveAwardsSync(databaseInstance: Database.Database, currentSeasonId: number): void {
        fastify.log.info(`Processing collective awards for Season ${currentSeasonId}...`);

        const competitions = databaseInstance.prepare(`
            SELECT comp.id AS competition_id, comp.name AS competition_name, comp.type
            FROM competition_season cs
            JOIN competition comp ON cs.competition_id = comp.id
            WHERE cs.season_id = ?;
        `).all(currentSeasonId) as { competition_id: number, competition_name: string, type: string }[];

        for (const competition of competitions) {
            let winnerClubId: number | null = null;
            let winningClubName: string | null = null;

            if (competition.type === 'league') {
                const leagueWinner = databaseInstance.prepare(`
                    SELECT ls.club_id, c.name AS club_name
                    FROM league_standing ls
                    JOIN club c ON ls.club_id = c.id
                    WHERE ls.competition_id = ? AND ls.season_id = ?
                    ORDER BY ls.match_day DESC, ls.position ASC
                    LIMIT 1;
                `).get(competition.competition_id, currentSeasonId) as { club_id: number, club_name: string } | undefined;

                if (leagueWinner) {
                    winnerClubId = leagueWinner.club_id;
                    winningClubName = leagueWinner.club_name;
                }

            } else if (competition.type === 'cup' || competition.type === 'combination') {
                const finalMatchWinner = databaseInstance.prepare(`
                    SELECT
                        CASE
                            WHEN m.home_score > m.away_score THEN m.home_club_id
                            ELSE m.away_club_id
                        END AS winner_club_id,
                        CASE
                            WHEN m.home_score > m.away_score THEN ch.name
                            ELSE ca.name
                        END AS winner_club_name
                    FROM match m
                    JOIN competition_stage cs ON m.stage_id = cs.id
                    JOIN club ch ON m.home_club_id = ch.id
                    JOIN club ca ON m.away_club_id = ca.id
                    WHERE m.competition_id = ?
                      AND m.season_id = ?
                      AND cs.name = 'final'
                      AND m.status = 'played'
                    LIMIT 1;
                `).get(competition.competition_id, currentSeasonId) as { winner_club_id: number, winner_club_name: string } | undefined;

                if (finalMatchWinner) {
                    winnerClubId = finalMatchWinner.winner_club_id;
                    winningClubName = finalMatchWinner.winner_club_name;
                }
            }

            if (winnerClubId && winningClubName) {
                databaseInstance.prepare(`
                    INSERT OR IGNORE INTO club_trophy (club_id, competition_id, season_id, date_won)
                    VALUES (?, ?, ?, ?);
                `).run(winnerClubId, competition.competition_id, currentSeasonId, new Date().toISOString().split('T')[0]);
                fastify.log.info(`${winningClubName} won the ${competition.competition_name} in the ${currentSeasonId} season!`);

                const prizeMoney = competition.type === 'league' ? 5_000_000 : (competition.type === 'cup' ? 2_000_000 : 10_000_000);
                FinanceModel.recordTransaction(
                    winnerClubId,
                    'Prize Money',
                    prizeMoney,
                    `Award for winning the ${competition.competition_name} in Season ${currentSeasonId}.`,
                    'balance'
                );
            } else {
                fastify.log.info(`No winner found for ${competition.competition_name} in Season ${currentSeasonId} (or not applicable).`);
            }
        }
    }

    private static processIndividualAwardsSync(databaseInstance: Database.Database, currentSeasonId: number): void {
        fastify.log.info(`Processing individual awards for Season ${currentSeasonId}...`);
        const awardDate = new Date().toISOString().split('T')[0];

        const goldenBootAwardTypeId = databaseInstance.prepare("SELECT id FROM individual_award_type WHERE name = 'Golden Boot'").get() as { id: number } | undefined;
        if (goldenBootAwardTypeId) {
            const topScorer = databaseInstance.prepare(`
                SELECT
                    p.id AS player_id,
                    p.first_name,
                    p.last_name,
                    SUM(pms.goals) AS total_goals
                FROM player_match_stats pms
                JOIN match m ON pms.match_id = m.id
                JOIN player p ON pms.player_id = p.id
                WHERE m.season_id = ?
                GROUP BY p.id
                ORDER BY total_goals DESC
                LIMIT 1;
            `).get(currentSeasonId) as { player_id: number, first_name: string, last_name: string, total_goals: number } | undefined;

            if (topScorer && topScorer.total_goals > 0) {
                databaseInstance.prepare(`
                    INSERT OR IGNORE INTO player_award (player_id, individual_award_type_id, season_id, award_date)
                    VALUES (?, ?, ?, ?);
                `).run(topScorer.player_id, goldenBootAwardTypeId.id, currentSeasonId, awardDate);
                fastify.log.info(`Golden Boot: ${topScorer.first_name} ${topScorer.last_name} (${topScorer.total_goals} goals)!`);
            } else {
                fastify.log.info(`No eligible Golden Boot scorers found.`);
            }
        } else {
            fastify.log.warn("Award type 'Golden Boot' not found.");
        }

        const bestPlayerAwardTypeId = databaseInstance.prepare("SELECT id FROM individual_award_type WHERE name = 'Ballon d''Or'").get() as { id: number } | undefined; // ALTERADO
        if (bestPlayerAwardTypeId) {
            const bestPlayer = databaseInstance.prepare(`
                SELECT
                    p.id AS player_id,
                    p.first_name,
                    p.last_name,
                    AVG(pms.rating) AS average_rating,
                    COUNT(pms.match_id) AS matches_played
                FROM player_match_stats pms
                JOIN match m ON pms.match_id = m.id
                JOIN player p ON pms.player_id = p.id
                WHERE m.season_id = ?
                GROUP BY p.id
                HAVING matches_played >= 10
                ORDER BY average_rating DESC
                LIMIT 1;
            `).get(currentSeasonId) as { player_id: number, first_name: string, last_name: string, average_rating: number, matches_played: number } | undefined;

            if (bestPlayer && bestPlayer.average_rating > 0) {
                databaseInstance.prepare(`
                    INSERT OR IGNORE INTO player_award (player_id, individual_award_type_id, season_id, award_date)
                    VALUES (?, ?, ?, ?);
                `).run(bestPlayer.player_id, bestPlayerAwardTypeId.id, currentSeasonId, awardDate);
                fastify.log.info(`Best Player of the Season: ${bestPlayer.first_name} ${bestPlayer.last_name} (Average Rating: ${bestPlayer.average_rating.toFixed(2)})!`);
            } else {
                fastify.log.info(`No better eligible player found.`);
            }
        } else {
            fastify.log.warn("Award type 'Ballon d''Or' not found. Please ensure it is seeded with is_competition_specific = 0.");
        }

        const bestGoalkeeperAwardType = databaseInstance.prepare(`SELECT id FROM individual_award_type WHERE name = 'Best Goalkeeper'`).get() as { id: number } | undefined;
        if (bestGoalkeeperAwardType) {
            const bestGoalkeeper = databaseInstance.prepare<{ seasonId: number }>(`
                SELECT
                    ps.player_id,
                    p.first_name,
                    p.last_name,
                    AVG(ps.rating) AS avg_rating
                FROM player_match_stats ps
                JOIN player p ON ps.player_id = p.id
                JOIN position pos ON ps.position_played_id = pos.id
                JOIN match m ON ps.match_id = m.id
                WHERE m.season_id = :seasonId AND pos.name = 'GK'
                GROUP BY ps.player_id
                ORDER BY avg_rating DESC
                LIMIT 1;
            `).get({ seasonId: currentSeasonId }) as { player_id: number; first_name: string; last_name: string; avg_rating: number } | undefined;

            if (bestGoalkeeper) {
                databaseInstance.prepare(`
                    INSERT INTO player_award (player_id, individual_award_type_id, season_id, date_awarded)
                    VALUES (?, ?, ?, ?)
                `).run(bestGoalkeeper.player_id, bestGoalkeeperAwardType.id, currentSeasonId, awardDate);
                fastify.log.info(`Best Goalkeeper awarded to ${bestGoalkeeper.first_name} ${bestGoalkeeper.last_name} (Player ID: ${bestGoalkeeper.player_id}) with avg rating ${bestGoalkeeper.avg_rating.toFixed(2)}.`);
            } else {
                fastify.log.warn("No goalkeeper found for Best Goalkeeper award.");
            }
        } else {
            fastify.log.warn("Best Goalkeeper award type not found.");
        }

        const bestPlayerCompAwardType = databaseInstance.prepare(`SELECT id FROM individual_award_type WHERE name = 'Best Player of Competition'`).get() as { id: number } | undefined;
        if (bestPlayerCompAwardType) {
            const competitions = databaseInstance.prepare(`SELECT id, name FROM competition`).all() as { id: number, name: string }[];

            for (const competition of competitions) {
                const bestPlayerInComp = databaseInstance.prepare<{ competitionId: number, seasonId: number }>(`
                    SELECT
                        ps.player_id,
                        p.first_name,
                        p.last_name,
                        AVG(ps.rating) as avg_rating
                    FROM player_match_stats ps
                    JOIN player p ON ps.player_id = p.id
                    JOIN match m ON ps.match_id = m.id
                    WHERE m.season_id = :seasonId AND m.competition_id = :competitionId
                    GROUP BY ps.player_id
                    ORDER BY avg_rating DESC
                    LIMIT 1;
                `).get({ competitionId: competition.id, seasonId: currentSeasonId }) as { player_id: number; first_name: string; last_name: string; avg_rating: number } | undefined;

                if (bestPlayerInComp) {
                    databaseInstance.prepare(`
                        INSERT INTO player_award (player_id, individual_award_type_id, season_id, date_awarded, competition_id)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(bestPlayerInComp.player_id, bestPlayerCompAwardType.id, currentSeasonId, awardDate, competition.id);
                    fastify.log.info(`Best Player of ${competition.name} awarded to ${bestPlayerInComp.first_name} ${bestPlayerInComp.last_name} (Player ID: ${bestPlayerInComp.player_id}) with avg rating ${bestPlayerInComp.avg_rating.toFixed(2)}.`);
                } else {
                    fastify.log.warn(`No player found for Best Player of Competition award in ${competition.name}.`);
                }
            }
        } else {
            fastify.log.warn("Best Player of Competition award type not found.");
        }

        const topScorerCompAwardType = databaseInstance.prepare(`SELECT id FROM individual_award_type WHERE name = 'Top Scorer of Competition'`).get() as { id: number } | undefined;
        if (topScorerCompAwardType) {
            const competitions = databaseInstance.prepare(`SELECT id, name FROM competition`).all() as { id: number, name: string }[];

            for (const competition of competitions) {
                const topScorerInComp = databaseInstance.prepare<{ competitionId: number, seasonId: number }>(`
                    SELECT
                        ps.player_id,
                        p.first_name,
                        p.last_name,
                        SUM(ps.goals) as total_goals
                    FROM player_match_stats ps
                    JOIN player p ON ps.player_id = p.id
                    JOIN match m ON ps.match_id = m.id
                    WHERE m.season_id = :seasonId AND m.competition_id = :competitionId
                    GROUP BY ps.player_id
                    ORDER BY total_goals DESC
                    LIMIT 1;
                `).get({ competitionId: competition.id, seasonId: currentSeasonId }) as { player_id: number; first_name: string; last_name: string; total_goals: number } | undefined;

                if (topScorerInComp) {
                    databaseInstance.prepare(`
                        INSERT INTO player_award (player_id, individual_award_type_id, season_id, date_awarded, competition_id)
                        VALUES (?, ?, ?, ?, ?)
                    `).run(topScorerInComp.player_id, topScorerCompAwardType.id, currentSeasonId, awardDate, competition.id);
                    fastify.log.info(`Top Scorer of ${competition.name} awarded to ${topScorerInComp.first_name} ${topScorerInComp.last_name} (Player ID: ${topScorerInComp.player_id}) with ${topScorerInComp.total_goals} goals.`);
                } else {
                    fastify.log.warn(`No player found for Top Scorer of Competition award in ${competition.name}.`);
                }
            }
        } else {
            fastify.log.warn("Top Scorer of Competition award type not found.");
        }

        const teamOfTheYearAwardTypeId = databaseInstance.prepare("SELECT id FROM individual_award_type WHERE name = 'Team of the Year'").get() as { id: number } | undefined;
        if (teamOfTheYearAwardTypeId) {
            const seasonYear = new Date().getFullYear();
            const teamOfTheYearInstanceId = databaseInstance.prepare(`
                INSERT INTO team_of_the_year_instance (individual_award_type_id, season_id, award_date, name)
                VALUES (?, ?, ?, ?);
            `).run(teamOfTheYearAwardTypeId.id, currentSeasonId, awardDate, `Team of the Year ${seasonYear}`).lastInsertRowid as number;

            const playerPositions = databaseInstance.prepare(`SELECT id, name FROM player_position`).all() as { id: number, name: string }[];
            const positionMap = new Map<string, number>();
            playerPositions.forEach(pos => positionMap.set(pos.name, pos.id));

            const playersByPositionCategory: { [key: string]: string[] } = {
                'GK': ['GK'],
                'DEF': ['CB', 'LB', 'RB', 'LWB', 'RWB'],
                'MID': ['CDM', 'CM', 'CAM', 'LM', 'RM'],
                'ATT': ['ST', 'CF', 'LW', 'RW'],
            };

            const selectedPlayers: { playerId: number, positionId: number }[] = [];

            const getBestPlayersForCategory = (positionNames: string[], count: number) => {
                const positionIds = positionNames.map(name => positionMap.get(name)).filter(id => id !== undefined);
                if (positionIds.length === 0) return [];

                return databaseInstance.prepare(`
                    SELECT
                        p.id AS player_id,
                        p.position_id,
                        AVG(pms.rating) AS average_rating,
                        COUNT(pms.match_id) AS matches_played
                    FROM player_match_stats pms
                    JOIN match m ON pms.match_id = m.id
                    JOIN player p ON pms.player_id = p.id
                    WHERE m.season_id = ?
                      AND p.position_id IN (${positionIds.join(',')})
                    GROUP BY p.id, p.position_id
                    HAVING matches_played >= 10
                    ORDER BY average_rating DESC
                    LIMIT ?;
                `).all(currentSeasonId, count) as { player_id: number, position_id: number, average_rating: number, matches_played: number }[];
            };

            const bestGK = getBestPlayersForCategory(playersByPositionCategory['GK'], 1);
            if (bestGK.length > 0) selectedPlayers.push({ playerId: bestGK[0].player_id, positionId: bestGK[0].position_id });

            const bestDEFs = getBestPlayersForCategory(playersByPositionCategory['DEF'], 4);
            bestDEFs.forEach(p => selectedPlayers.push({ playerId: p.player_id, positionId: p.position_id }));

            const bestMIDs = getBestPlayersForCategory(playersByPositionCategory['MID'], 3);
            bestMIDs.forEach(p => selectedPlayers.push({ playerId: p.player_id, positionId: p.position_id }));

            const bestATTs = getBestPlayersForCategory(playersByPositionCategory['ATT'], 3);
            bestATTs.forEach(p => selectedPlayers.push({ playerId: p.player_id, positionId: p.position_id }));

            const insertTotySelectionStmt = databaseInstance.prepare(`
                INSERT OR IGNORE INTO team_of_the_year_selection (team_of_the_year_instance_id, player_id, player_position_id)
                VALUES (?, ?, ?);
            `);
            selectedPlayers.forEach(p => {
                insertTotySelectionStmt.run(teamOfTheYearInstanceId, p.playerId, p.positionId);
            });
            fastify.log.info(`Team of the Year for Season ${currentSeasonId} calculated with ${selectedPlayers.length} players.`);

        } else {
            fastify.log.warn("Award type 'Team of the Year' not found.");
        }
    }

    private static handleContractExpirationsSync(databaseInstance: Database.Database, currentSeasonId: number): void {
        const seasonEndDate = databaseInstance.prepare(`SELECT end_date FROM season WHERE id = ?`).get(currentSeasonId) as { end_date: string } | undefined;

        if (!seasonEndDate) {
            fastify.log.error(`Season end date not found for season ${currentSeasonId}. Cannot process contract expirations.`);
            return;
        }

        const exactSeasonEndDate = seasonEndDate.end_date;

        const expiringPlayerContracts = databaseInstance.prepare(`
            SELECT pc.player_id, pc.club_id, p.first_name, p.last_name, p.overall, p.birth_date
            FROM player_contract pc
            JOIN player p ON pc.player_id = p.id
            WHERE pc.end_date = ?;
        `).all(exactSeasonEndDate) as { player_id: number, club_id: number, first_name: string, last_name: string, overall: number, birth_date: string }[];

        for (const contract of expiringPlayerContracts) {
            const playerAge = new Date().getFullYear() - new Date(contract.birth_date).getFullYear();

            let transferTypeName: 'Retirement' | 'Free Transfer' | 'Permanent' = 'Free Transfer';
            let description = `The contract between ${contract.first_name} ${contract.last_name} and club ${contract.club_id} has expired.`;

            if (playerAge >= 35 && contract.overall < 70 && Math.random() < 0.8) {
                transferTypeName = 'Retirement';
                description = `${contract.first_name} ${contract.last_name} has retired.`;
            } else if (playerAge >= 30 && Math.random() < 0.2) {
                transferTypeName = 'Retirement';
                description = `${contract.first_name} ${contract.last_name} has retired.`;
            }
            // TODO: Contract renewal logic for key players (outside the scope of this MVP, but important)

            const transferTypeId = databaseInstance.prepare(`SELECT id FROM transfer_type WHERE name = ?`).get(transferTypeName) as { id: number };
            if (transferTypeId) {
                databaseInstance.prepare(`
                    INSERT INTO transfer (player_id, club_from_id, transfer_type_id, transfer_date, status, description)
                    VALUES (?, ?, ?, ?, 'Completed', ?);
                `).run(contract.player_id, contract.club_id, transferTypeId.id, exactSeasonEndDate, description);
                fastify.log.info(`Player ${contract.first_name} ${contract.last_name} (${contract.player_id}) ${transferTypeName.toLowerCase()} from club ${contract.club_id}.`);
            }
        }

        const expiringStaffContracts = databaseInstance.prepare(`
            SELECT sc.staff_id, sc.club_id, s.first_name, s.last_name, sft.name AS function_name
            FROM staff_contract sc
            JOIN staff s ON sc.staff_id = s.id
            JOIN staff_function_type sft ON s.function_id = sft.id
            WHERE sc.end_date = ?;
        `).all(exactSeasonEndDate) as { staff_id: number, club_id: number, first_name: string, last_name: string, function_name: string }[];

        for (const contract of expiringStaffContracts) {
            fastify.log.info(`The contract between staff member ${contract.first_name} ${contract.last_name} (${contract.function_name}) and club ${contract.club_id} has expired.`);
        }
    }
}

export default SeasonEndService;