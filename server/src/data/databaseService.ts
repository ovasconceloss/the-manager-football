import fs from "fs";
import path from "path";
import fastify from "../fastify";
import Database from "better-sqlite3";
import SaveService from "./saveService";
import { AppError } from "../errors/errors";

class DatabaseService {
    private static getMigrationsPath(): string {
        try {
            return path.resolve(__dirname, "migrations");
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to resolve the path of migrations:", err.message);
            } else {
                fastify.log.error("Unknown error resolving the path to migrations");
            }

            throw new AppError("Failed to obtain the path to migrations.", 500);
        }
    }

    private static executeMigrations(database: Database.Database): void {
        try {
            const migrationsPath = this.getMigrationsPath();
            if (!fs.existsSync(migrationsPath)) throw new AppError("Migrations folder not found", 500);

            const migrationsFiles = fs.readdirSync(migrationsPath).filter(file => file.endsWith(".sql")).sort();

            for (const file of migrationsFiles) {
                const filePath = path.join(migrationsPath, file);
                const sqlFile = fs.readFileSync(filePath, "utf-8");

                database.exec(sqlFile);
            }
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Migration error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected migration error: ${err.message}`);
                throw new AppError("Unexpected error during migrations.", 500);
            } else {
                fastify.log.error("Unknown error during migrations");
                throw new AppError("Unknown error during migrations.", 500);
            }
        }
    }

    public static createDatabase(): Database.Database {
        try {
            const databasePath = SaveService.createNewSavePath();
            const database = new Database(databasePath);

            //this.executeMigrations(database);

            return database;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Database creation error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected database creation error: ${err.message}`);
                throw new AppError("Unexpected error during database creation.", 500);
            } else {
                fastify.log.error("Unknown error during database creation");
                throw new AppError("Unknown error during database creation.", 500);
            }
        }
    }

    public static loadDatabase(filename: string): Database.Database {
        try {
            if (!filename) throw new Error("The file name is required to load a save.");

            const databasePath = SaveService.getSavePath(filename);
            return new Database(databasePath);
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Database loading error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected database loading error: ${err.message}`);
                throw new AppError("Unexpected error during database loading.", 500);
            } else {
                fastify.log.error("Unknown error during database loading");
                throw new AppError("Unknown error during database loading.", 500);
            }
        }
    }

    public static connectDatabase(action: "load" | "create", filename?: string): Database.Database {
        try {
            if (action === "create") {
                const databaseInstance = this.createDatabase();
                return databaseInstance;
            }

            const databaseInstance = this.loadDatabase(filename!);
            return databaseInstance;
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Database connect error: ${err.message}`);
                throw err;
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected database connect error: ${err.message}`);
                throw new AppError("Unexpected error during database connection.", 500);
            } else {
                fastify.log.error("Unknown error during database connection");
                throw new AppError("Unknown error during database connection.", 500);
            }
        }
    }
}

export default DatabaseService;