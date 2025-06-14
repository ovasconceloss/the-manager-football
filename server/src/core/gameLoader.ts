import fastify from "../fastify";
import Database from "better-sqlite3";
import { AppError } from "../errors/errors";
import DatabaseService from "../data/databaseService";

class GameLoaderService {
    private static currentFilename: string | null = null;
    private static database: Database.Database | null = null;

    public static newGame(): void {
        try {
            if (this.database) this.database.close();

            const database = DatabaseService.connectDatabase("create");

            this.database = database;
            this.currentFilename = null;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`GameLoader newGame error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected error in GameLoader newGame: ${err.message}`);
                throw new AppError("Unexpected error while creating new game.", 500);
            } else {
                fastify.log.error("Unknown error in GameLoader newGame");
                throw new AppError("Unknown error while creating new game.", 500);
            }
        }
    }

    public static loadGame(filename: string): void {
        try {
            if (this.database) this.database.close();

            const database = DatabaseService.connectDatabase("load", filename);

            this.database = database;
            this.currentFilename = null;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`GameLoader loadGame error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected error in GameLoader loadGame: ${err.message}`);
                throw new AppError("Unexpected error while loading a game.", 500);
            } else {
                fastify.log.error("Unknown error in GameLoader loadGame");
                throw new AppError("Unknown error while loading a game.", 500);
            }
        }
    }

    public static getCurrentDatabase(): Database.Database {
        try {
            if (!this.database) throw new Error("No save loaded.");

            return this.database;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`GameLoader getCurrentDatabase error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected error in GameLoader getCurrentDatabase: ${err.message}`);
                throw new AppError("No save loaded.", 400);
            } else {
                fastify.log.error("Unknown error in GameLoader getCurrentDatabase");
                throw new AppError("Unknown error while getting current database.", 500);
            }
        }
    }

    public static getCurrentFile(): string | null {
        try {
            return this.currentFilename;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`GameLoader getCurrentFile error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected error in GameLoader getCurrentFile: ${err.message}`);
                throw new AppError("Unexpected error while getting current file.", 500);
            } else {
                fastify.log.error("Unknown error in GameLoader getCurrentFile");
                throw new AppError("Unknown error while getting current file.", 500);
            }
        }
    }

    public static resetDatabase(): void {
        try {
            if (this.database) {
                this.database.close();
                this.database = null;
                this.currentFilename = null;
            }
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`GameLoader resetDatabase error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected error in GameLoader resetDatabase: ${err.message}`);
                throw new AppError("Unexpected error while resetting database.", 500);
            } else {
                fastify.log.error("Unknown error in GameLoader resetDatabase");
                throw new AppError("Unknown error while resetting database.", 500);
            }
        }
    }
}

export default GameLoaderService;