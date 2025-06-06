import fastify from "../fastify";
import Database from "better-sqlite3";
import { parentPort } from "worker_threads";
import MatchEngineService from "../core/engine/match/matchEngineService";

interface WorkerInput {
    matchId: number;
    databasePath: string;
}

if (parentPort) {
    parentPort.on('message', async (data: WorkerInput) => {
        try {
            const database = new Database(data.databasePath);

            database.exec('PRAGMA journal_mode = WAL;');
            const result = MatchEngineService.simulateMatch(database, data.matchId);

            database.close();
            parentPort?.postMessage({ success: true, matchId: data.matchId, result });
        } catch (err: any) {
            fastify.log.error(`Error in worker simulating match ID ${data.matchId}:`, err);
            parentPort?.postMessage({ success: false, matchId: data.matchId, error: err.message });
        }
        process.exit(0);
    });
}