import path from "path";
import fastify from "../fastify";
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
}

export default DatabaseService;