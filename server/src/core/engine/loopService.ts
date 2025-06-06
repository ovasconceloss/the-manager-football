import path from 'path';
import fastify from "../../fastify";
import Database from "better-sqlite3";
import { Worker } from 'worker_threads';

class LoopService {
    public static async advanceGameDay(database: Database.Database) {
        const state = database.prepare("SELECT * FROM game_state LIMIT 1").get() as {
            id: number, current_date: string; season_id: number
        };

        if (!state) {
            fastify.log.error("Game State not initialized. Please ensure the 'game_state' table has an entry.");
            throw new Error("Game State not initialized");
        }

        const today = state.current_date;
        const seasonId = state.season_id;

        fastify.log.info(`Current game date: ${today}, Season ID: ${seasonId}`);

        const scheduledMatches = database.prepare(`
            SELECT id FROM match WHERE match_date = ? AND status = 'scheduled' AND season_id = ?
        `).all(today, seasonId) as Array<{ id: number }>;

        fastify.log.info(`Found ${scheduledMatches.length} scheduled matches for today.`);

        const databasePath = database.name;
        const simulationPromises: Promise<any>[] = [];

        for (const match of scheduledMatches) {
            const simulationPromise = new Promise((resolve, reject) => {
                const worker = new Worker(
                    path.resolve(__dirname, '../../workers/matchSimulationWorker.ts'),
                    { execArgv: ['-r', 'ts-node/register'] }
                )

                worker.on('message', (message) => {
                    if (message.success) {
                        fastify.log.info(`Successfully simulated match ID: ${message.matchId}`);
                        resolve(message.result);
                    } else {
                        console.log(message)
                        fastify.log.error(`Error simulating match ID ${message.matchId}: ${message.error}`);
                        reject(new Error(message.error));
                    }
                });

                worker.on('error', (err) => {
                    fastify.log.error(`Worker error for match ID ${match.id}:`, err);
                    reject(err);
                    worker.terminate();
                });

                worker.on('exit', (code) => {
                    if (code !== 0) {
                        fastify.log.error(`Worker stopped with exit code ${code} for match ID ${match.id}`);
                        reject(new Error(`Worker stopped with exit code ${code}`));
                    }
                });

                worker.postMessage({ databasePath: databasePath, matchId: match.id });
            });
            simulationPromises.push(simulationPromise);
        }

        await Promise.allSettled(simulationPromises);

        const nextDate = new Date(today);
        nextDate.setDate(nextDate.getDate() + 1);
        const nextDateFormatted = nextDate.toISOString().split("T")[0];

        database.prepare(`UPDATE game_state SET current_date = ? WHERE id = ?`).run(nextDateFormatted, state.id);

        fastify.log.info(`Game date advanced to: ${nextDateFormatted}.`);

        return {
            playedMatches: scheduledMatches.length,
            nextDate: nextDateFormatted
        };
    }
}

export default LoopService;