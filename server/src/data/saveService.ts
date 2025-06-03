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
}

export default SaveService;