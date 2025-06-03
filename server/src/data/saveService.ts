import os from "os";
import fs from "fs";
import path from "path";
import fastify from "../fastify";
import { AppError } from "../errors/errors";

class SaveService {
    private static getDefaultDatabasePath = (): string => {
        try {
            return path.resolve(__dirname, "./default/defaultDatabase.tm");
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to resolve the path of default database:", err.message);
            } else {
                fastify.log.error("Unknown error resolving the path to default database");
            }

            throw new AppError("Failed to obtain the path to default database.", 500);
        }
    }

    private static getSaveBasePath(): string {
        try {
            const documents = process.env.DOCUMENTS || path.join(os.homedir(), "Documents");
            return path.resolve(documents, "ProPlay Games", "The Manager 2025", "games");
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to resolve the save base path:", err.message);
            } else {
                fastify.log.error("Unknown error resolving the save base path");
            }
            throw new AppError("Failed to obtain the save base path.", 500);
        }
    }

    private static createSaveName(): string {
        try {
            const dateObject = new Date();
            const [year, month, day, time] = [
                dateObject.getFullYear(),
                String(dateObject.getMonth() + 1).padStart(2, "0"),
                String(dateObject.getDate() + 1).padStart(2, "0"),
                dateObject.getTime()
            ];

            return `save_${year}-${month}-${day}-${time}.tm`;
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to create save name:", err.message);
            } else {
                fastify.log.error("Unknown error creating save name");
            }
            throw new AppError("Failed to create save name.", 500);
        }
    }

    public static createNewSavePath(): string {
        try {
            const fileName = this.createSaveName();
            const fullPath = path.join(this.getSaveBasePath(), fileName);

            const directory = path.dirname(fullPath);
            if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

            return fullPath;
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to create new save path:", err.message);
            } else {
                fastify.log.error("Unknown error creating new save path");
            }
            throw new AppError("Failed to create new save path.", 500);
        }
    }

    public static getSavePath(fileName: string): string {
        try {
            const fullPath = path.join(this.getSaveBasePath(), fileName);
            if (!fs.existsSync(fullPath)) throw new Error(`Save file not found: ${fileName}`);

            return fullPath;
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to get save path:", err.message);
            } else {
                fastify.log.error("Unknown error getting save path");
            }
            throw new AppError("Failed to get save path.", 500);
        }
    }

    public static getSaveDirectory(): string {
        try {
            const userDocumentsPath = process.env.DOCUMENTS || path.join(os.homedir(), 'Documents');
            return path.resolve(userDocumentsPath, "ProPlay Games", "The Manager 2025", "games");
        } catch (err: unknown) {
            if (err instanceof Error) {
                fastify.log.error("Failure to get save directory:", err.message);
            } else {
                fastify.log.error("Unknown error getting save directory path");
            }
            throw new AppError("Failed to get save directory path.", 500);
        }
    }
}

export default SaveService;