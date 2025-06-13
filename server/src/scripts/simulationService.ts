import fastify from '../fastify';
import Database from "better-sqlite3";
import { AppError } from '../errors/errors';
import ManagerModel from '../models/managerModel';
import FinanceModel from '../models/financeModel';
import GameLoaderService from '../core/gameLoader';
import LoopService from '../core/engine/loopService';
import SeasonService from '../services/seasonService';

fastify.log.level = 'info';

async function simulateSeason(): Promise<void> {
    console.log("--- STARTING FULL SEASON SIMULATION ---");

    let userClubId: number | null = null;
    let initialSeasonId: number | null = null;
    let databaseInstance: Database.Database | null = null;
    let currentSeason: { id: number; start_date: string; end_date: string; status: string } | undefined;

    try {
        console.log("1. Loading the database...");
        GameLoaderService.newGame();
        databaseInstance = GameLoaderService.getCurrentDatabase();
        console.log("Database loaded.");

        console.log("2. Checking/creating initial season...");
        currentSeason = await SeasonService.fetchCurrentSeason() as { id: number; start_date: string; end_date: string; status: string } | undefined;
        let currentGameState = databaseInstance.prepare("SELECT * FROM game_state LIMIT 1").get() as { id: number, current_date: string; season_id: number } | undefined;

        if (!currentSeason || !currentGameState || currentSeason.status === 'finished') {
            console.warn("No active season or game_state found, or previous season has ended. Creating a new default season...");
            const defaultStartDate = '2025-08-01';
            const defaultEndDateObj = new Date(defaultStartDate + 'T12:00:00Z');
            defaultEndDateObj.setFullYear(defaultEndDateObj.getFullYear() + 1);
            defaultEndDateObj.setMonth(defaultEndDateObj.getMonth() - 1);
            defaultEndDateObj.setDate(0);
            const defaultEndDate = defaultEndDateObj.toISOString().split('T')[0];

            initialSeasonId = await SeasonService.insertNewSeason(defaultStartDate, defaultEndDate);
            console.log(`New season created: ID ${initialSeasonId}, Start: ${defaultStartDate}, End: ${defaultEndDate}`);

            databaseInstance.prepare("UPDATE game_state SET current_date = ?").run(defaultStartDate);

            currentSeason = await SeasonService.fetchCurrentSeason() as { id: number; start_date: string; end_date: string; status: string } | undefined;
            currentGameState = databaseInstance.prepare("SELECT * FROM game_state LIMIT 1").get() as { id: number, current_date: string; season_id: number };
            if (!currentSeason || !currentGameState) {
                throw new AppError("Failed to create and load the initial season.", 500);
            }
        } else {
            initialSeasonId = currentSeason.id;
            console.log(`Using existing season: ID ${currentSeason.id}, Start: ${currentSeason.start_date}, End: ${currentSeason.end_date}`);
        }

        console.log(`Game start date: ${currentGameState.current_date}`);

        interface UserManagerDetails {
            club_id: number;
            first_name: string;
            last_name: string;
            club_name: string;
        }
        const userManagerDetails = await ManagerModel.getUserManagerDetails() as UserManagerDetails | null;

        if (!userManagerDetails) {
            console.log("3. No user manager found. Creating a default manager...");
            const availableClubs = await ManagerModel.getAvailableClubs();
            if (availableClubs.length === 0) {
                console.warn("No clubs available for the manager. Skipping manager creation.");
            } else {
                const selectedClub = availableClubs[0];
                userClubId = selectedClub.club_id;
                console.log(`Assigning manager to club: ${selectedClub.club_name} (ID: ${userClubId})`);

                const managerNationId = 1;
                const tacticalStyleId = 1;
                try {
                    await ManagerModel.insertAndAssignManager(
                        managerNationId,
                        'Simulator',
                        'Manager',
                        '1980-05-15',
                        tacticalStyleId,
                        userClubId
                    );
                    console.log("Default manager created and assigned.");
                } catch (error: any) {
                    console.error("Error creating and assigning default manager:", error.message);
                }
            }
        } else {
            userClubId = userManagerDetails.club_id;
            console.log(`3. Existing manager: ${userManagerDetails.first_name} ${userManagerDetails.last_name} at club ${userManagerDetails.club_name}.`);
        }

        console.log("4. Starting daily simulation...");
        let simulationComplete = false;
        let dayCount = 0;
        const maxDays = 370;

        while (!simulationComplete && dayCount < maxDays) {
            currentGameState = databaseInstance.prepare("SELECT current_date, season_id FROM game_state LIMIT 1").get() as { id: number, current_date: string; season_id: number; };
            if (!currentGameState) {
                throw new AppError("Game state is null within the simulation loop.", 500);
            }
            const currentSimulatedDate = currentGameState.current_date;

            const seasonBeingSimulated = databaseInstance.prepare("SELECT * FROM season WHERE id = ?").get(initialSeasonId) as { id: number, start_date: string, end_date: string, status: string } | undefined;
            if (!seasonBeingSimulated) {
                throw new AppError(`Initial season (ID: ${initialSeasonId}) not found in the current state within the loop.`, 500);
            }

            console.log(`\n--- Day ${dayCount + 1}: Game Date ${currentSimulatedDate}, Season End Date ${seasonBeingSimulated.end_date}, Season Status: ${seasonBeingSimulated.status} ---`);

            if (seasonBeingSimulated.status === 'finished' && currentGameState.season_id !== initialSeasonId) {
                console.log(`Initial season (ID: ${initialSeasonId}) is 'finished' and the game has moved to the next season. Ending simulation.`);
                simulationComplete = true;
            }
            else if (currentSimulatedDate === seasonBeingSimulated.end_date && seasonBeingSimulated.status === 'in_progress') {
                console.log(`\n--- END OF SEASON DETECTED: ${currentSimulatedDate} (Season ID: ${seasonBeingSimulated.id}) ---`);
                const result = await LoopService.advanceGameDay(databaseInstance);
                console.log(`Season ended and new season started. New game date: ${result.newDate}`);
            }
            else {
                const result = await LoopService.advanceGameDay(databaseInstance);
                console.log(`Simulation advanced to ${result.newDate}. Games played today: ${result.played}`);
            }

            if (userClubId && databaseInstance) {
                const isBankrupt = await FinanceModel.checkBankruptcy(userClubId);
                if (isBankrupt) {
                    console.warn(`WARNING: User's club (ID: ${userClubId}) is bankrupt on ${currentSimulatedDate}.`);
                }
            }
            dayCount++;
        }

        if (dayCount >= maxDays) {
            console.warn(`Simulation reached the limit of ${maxDays} days without the initial season being 'finished'. Check the logic.`);
        }

        console.log("\n--- Season simulation completed ---");

        console.log("5. Post-simulation checks:");
        currentGameState = databaseInstance.prepare("SELECT * FROM game_state LIMIT 1").get() as { id: number; current_date: string; season_id: number; } | undefined;
        if (currentGameState) {
            currentSeason = databaseInstance.prepare("SELECT * FROM season WHERE id = ?").get(currentGameState.season_id) as { id: number, start_date: string, end_date: string, status: string } | undefined;
        } else {
            currentSeason = undefined;
        }
        const finishedSeason = databaseInstance.prepare("SELECT * FROM season WHERE id = ?").get(initialSeasonId) as { id: number, start_date: string, end_date: string, status: string } | undefined;

        console.log(`Game end date in game_state: ${currentGameState?.current_date}`);
        console.log(`CURRENT season in game_state: ID ${currentSeason?.id}, Start: ${currentSeason?.start_date}, End: ${currentSeason?.end_date}, Status: ${currentSeason?.status}`);
        if (finishedSeason) {
            console.log(`PREVIOUS season (finished): ID ${finishedSeason.id}, Start: ${finishedSeason.start_date}, End: ${finishedSeason.end_date}, Status: ${finishedSeason.status}`);
        }

        if (userClubId) {
            const userClubSummary = await FinanceModel.getClubFinancialSummary(userClubId);
            console.log(`Final balance of user's club (${userClubId}): ${userClubSummary?.current_balance.toFixed(2)}`);
        }

        console.log("\n--- Trophy Check (Finished Season) ---");
        if (initialSeasonId && databaseInstance) {
            const clubTrophies = databaseInstance.prepare(`
                SELECT
                    ct.id,
                    c.name AS club_name,
                    comp.name AS competition_name,
                    s.start_date AS season_start_date,
                    ct.date_won
                FROM club_trophy ct
                JOIN club c ON ct.club_id = c.id
                JOIN competition comp ON ct.competition_id = comp.id
                JOIN season s ON ct.season_id = s.id
                WHERE ct.season_id = ?;
            `).all(initialSeasonId);

            if (clubTrophies.length > 0) {
                console.log("Trophies awarded in the finished season:");
                clubTrophies.forEach((trophy: any) => {
                    console.log(`- ${trophy.club_name} won ${trophy.competition_name} (Season: ${trophy.season_start_date}) on ${trophy.date_won}`);
                });
            } else {
                console.log("No trophies registered for the finished season.");
            }
        } else {
            console.log("Initial season ID or database instance not available for trophy check.");
        }

        console.log("\n--- Player Awards Check (Finished Season) ---");
        if (initialSeasonId && databaseInstance) {
            const playerAwards = databaseInstance.prepare(`
                SELECT
                    pa.id,
                    p.first_name || ' ' || p.last_name AS player_name,
                    iat.name AS award_name,
                    s.start_date AS season_start_date,
                    pa.award_date
                FROM player_award pa
                JOIN player p ON pa.player_id = p.id
                JOIN individual_award_type iat ON pa.individual_award_type_id = iat.id
                JOIN season s ON pa.season_id = s.id
                WHERE pa.season_id = ?;
            `).all(initialSeasonId);

            if (playerAwards.length > 0) {
                console.log("Player awards in the finished season:");
                playerAwards.forEach((award: any) => {
                    console.log(`- ${award.player_name}: ${award.award_name} (Season: ${award.season_start_date}) on ${award.award_date}`);
                });
            } else {
                console.log("No player awards registered for the finished season.");
            }

            const teamOfTheYearInstances = databaseInstance.prepare(`
                SELECT
                    toty.id AS instance_id,
                    toty.name AS toty_name,
                    s.start_date AS season_start_date,
                    toty.award_date
                FROM team_of_the_year_instance toty
                JOIN season s ON toty.season_id = s.id
                WHERE toty.season_id = ?;
            `).all(initialSeasonId) as {
                instance_id: number;
                toty_name: string;
                season_start_date: string;
                award_date: string;
            }[];

            if (teamOfTheYearInstances.length > 0) {
                console.log("\nRegistered Teams of the Year:");
                for (const instance of teamOfTheYearInstances) {
                    console.log(`     - ${instance.toty_name} (Season: ${instance.season_start_date})`);
                    const totyPlayers = databaseInstance.prepare(`
                        SELECT
                            p.first_name || ' ' || p.last_name AS player_name,
                            pp.name AS position_name
                        FROM team_of_the_year_selection tots
                        JOIN player p ON tots.player_id = p.id
                        JOIN player_position pp ON tots.player_position_id = pp.id
                        WHERE tots.team_of_the_year_instance_id = ?
                        ORDER BY pp.name;
                    `).all(instance.instance_id);

                    if (totyPlayers.length > 0) {
                        totyPlayers.forEach((p: any) => {
                            console.log(`- ${p.player_name} (${p.position_name})`);
                        });
                    } else {
                        console.log("No players selected for this Team of the Year.");
                    }
                }
            } else {
                console.log("No Team of the Year registered for the finished season.");
            }

        } else {
            console.log("Initial season ID or database instance not available for player awards check.");
        }

        console.log("\n--- Expired Contracts / End-of-Season Transfers ---");
        if (initialSeasonId && finishedSeason && databaseInstance) {
            const transfersDueToEndOfSeason = databaseInstance.prepare(`
                SELECT
                    t.id AS transfer_id,
                    p.first_name || ' ' || p.last_name AS player_name,
                    cf.name AS club_from_name,
                    ct.name AS club_to_name,
                    tt.name AS transfer_type_name,
                    t.transfer_date
                FROM transfer t
                LEFT JOIN player p ON t.player_id = p.id
                LEFT JOIN club cf ON t.club_from_id = cf.id
                LEFT JOIN club ct ON t.club_to_id = ct.id
                LEFT JOIN transfer_type tt ON t.transfer_type_id = tt.id
                WHERE t.transfer_date = ?
                  AND (tt.name = 'Retirement' OR tt.name = 'Free Transfer' OR tt.name = 'Release')
                  AND t.status = 'Completed';
            `).all(finishedSeason.end_date);

            if (transfersDueToEndOfSeason.length > 0) {
                console.log(`End-of-season transfers (${finishedSeason.end_date}):`);
                transfersDueToEndOfSeason.forEach((t: any) => {
                    console.log(`- Player: ${t.player_name} | Type: ${t.transfer_type_name} | Previous Club: ${t.club_from_name || 'N/A'} | Description: ${t.description}`);
                });
            } else {
                console.log("No retirement/release transfers registered on the season end date.");
            }
        } else {
            console.log("Initial season ID, finished season data, or database instance not available for contract checks.");
        }

        console.log("\n--- Transfer Windows for the NEW Season ---");
        if (currentSeason && databaseInstance) {
            const newSeasonTransferWindows = databaseInstance.prepare(`
                SELECT
                    tw.start_date,
                    tw.end_date,
                    twt.name AS window_type
                FROM transfer_window tw
                JOIN transfer_window_type twt ON tw.transfer_window_type_id = twt.id
                WHERE tw.season_id = ?
                ORDER BY tw.start_date;
            `).all(currentSeason.id);

            if (newSeasonTransferWindows.length > 0) {
                console.log(`Transfer windows for Season ${currentSeason.id} (Start: ${currentSeason.start_date}):`);
                newSeasonTransferWindows.forEach((window: any) => {
                    console.log(`- Type: ${window.window_type} | Start: ${window.start_date} | End: ${window.end_date}`);
                });
            } else {
                console.log("No transfer windows found for the new season.");
            }
        } else {
            console.log("Current season ID or database instance not available for transfer window check.");
        }

    } catch (error: any) {
        console.log(error);
        console.error("\n--- FATAL ERROR DURING SIMULATION ---");
        if (error instanceof AppError) {
            console.error(`AppError: ${error.message} (Status: ${error.statusCode})`);
        } else if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
            console.error(`Stack: ${error.stack}`);
        } else {
            console.error("Unknown error:", error);
        }
        console.error("Simulation was interrupted due to an error.");
    } finally {
        console.log("--- End of simulation execution ---");
    }
}

simulateSeason();