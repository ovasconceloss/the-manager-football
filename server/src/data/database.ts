import fs from "fs";
import path from "path";
import fastify from "../fastify";
import Database from "better-sqlite3";
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
}

export default DatabaseService;