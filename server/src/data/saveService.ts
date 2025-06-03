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
}

export default SaveService;