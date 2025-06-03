import fs from "fs";
import path from "path";
import fastify from "../fastify";
import { AppError } from "../errors/errors";
import SaveService from "../data/saveService";
import GameLoaderService from "../core/gameLoader";
import { FastifyReply, FastifyRequest } from "fastify";

class SaveController {
    public static async listSaves(request: FastifyRequest, reply: FastifyReply) {
        try {
            const saveDirectory = SaveService.getSaveDirectory();

            const saveFiles = fs.readdirSync(saveDirectory).filter(file => file.endsWith(".tm"));
            return reply.status(200).send({ saveFiles });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`List saves error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected list saves error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while listing saves." });
            } else {
                fastify.log.error("Unknown error while listing saves");
                return reply.status(500).send({ error: "Unknown error while listing saves." });
            }
        }
    }

    public static async createSave(request: FastifyRequest, reply: FastifyReply) {
        try {
            GameLoaderService.newGame();
            return reply.status(201).send({ statusCode: 201, message: "New save created successfully." });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Create save error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected create save error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while creating save." });
            } else {
                fastify.log.error("Unknown error while creating save");
                return reply.status(500).send({ error: "Unknown error while creating save." });
            }
        }
    }

    public static async loadSave(request: FastifyRequest<{ Body: { filename: string } }>, reply: FastifyReply) {
        try {
            const { filename } = request.body;
            if (!filename || typeof filename !== "string") return reply.status(400).send({ error: "Name of save is mandatory." });

            GameLoaderService.loadGame(filename);
            return reply.status(201).send({ statusCode: 200, message: `Save ${filename} loaded` });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Load save error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected load save error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while loading save." });
            } else {
                fastify.log.error("Unknown error while loading save");
                return reply.status(500).send({ error: "Unknown error while loading save." });
            }
        }
    }

    public static async deleteSave(request: FastifyRequest<{ Body: { filename: string } }>, reply: FastifyReply) {
        try {
            const { filename } = request.body;

            const savesDirectory = SaveService.getSaveDirectory();
            const filePath = path.join(savesDirectory, filename);

            if (!filename.endsWith(".tm")) return reply.status(400).send({ message: "Failed to delete save: Invalid file." });

            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                return reply.status(200).send({ statusCode: 200, message: "Save successfully deleted." });
            }
        } catch (err: unknown) {
            if (err instanceof AppError) {
                fastify.log.error(`Delete save error: ${err.message}`);
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Unexpected delete save error: ${err.message}`);
                return reply.status(500).send({ error: "Unexpected error while deleting save." });
            } else {
                fastify.log.error("Unknown error while deleting save");
                return reply.status(500).send({ error: "Unknown error while deleting save." });
            }
        }
    }
}

export default SaveController;