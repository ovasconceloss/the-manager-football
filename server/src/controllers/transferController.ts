import fastify from "../fastify";
import { AppError } from "../errors/errors";
import { FastifyReply, FastifyRequest } from "fastify";
import TransferService from "../services/transferService";

class TransferController {
    public static async getTransferWindowStatus(request: FastifyRequest, reply: FastifyReply) {
        try {
            const isOpen = await TransferService.isTransferWindowOpen();
            return reply.status(200).send({ isOpen });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error("Error checking transfer window status:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to check transfer window status." });
            }
            fastify.log.error("Unknown error checking transfer window status:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to check transfer window status." });
        }
    }

    public static async getPlayerDetailsForTransfer(request: FastifyRequest<{ Params: { playerId: number } }>, reply: FastifyReply) {
        const { playerId } = request.params;
        try {
            const player = await TransferService.getPlayerDetailsForTransfer(playerId);
            if (!player) {
                return reply.status(404).send({ message: "Player not found or not eligible for transfer details." });
            }
            return reply.status(200).send({ player });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error fetching player ${playerId} for transfer:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve player details for transfer." });
            }
            fastify.log.error(`Unknown error fetching player ${playerId} for transfer:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve player details for transfer." });
        }
    }

    public static async getAvailablePlayersForTransfer(
        request: FastifyRequest<{ Querystring: { limit?: number, offset?: number } }>,
        reply: FastifyReply
    ) {
        const { limit, offset } = request.query;
        try {
            const players = await TransferService.getAvailablePlayersForTransfer(limit, offset);
            return reply.status(200).send({ players });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error("Error fetching available players for transfer:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve available players for transfer." });
            }
            fastify.log.error("Unknown error fetching available players for transfer:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve available players for transfer." });
        }
    }

    public static async makeTransferOffer(
        request: FastifyRequest<{
            Body: {
                offererClubId: number;
                targetPlayerId: number;
                offerFee: number;
                proposedPlayerSalary: number;
                proposedPlayerContractLength: number;
                agentFee?: number;
                signingBonus?: number;
                transferTypeName: 'Permanent' | 'Loan' | 'Free Transfer';
                loanDetails?: { loanStartDate: string, loanEndDate: string, loanFee: number, wageContributionPercentage: number, optionToBuyFee?: number, isMandatoryBuyOption?: boolean };
            };
        }>,
        reply: FastifyReply
    ) {
        try {
            const transferId = await TransferService.makeTransferOffer(request.body);
            return reply.status(201).send({ message: "Transfer offer created successfully.", transferId });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error("Error making transfer offer:", err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to make transfer offer." });
            }
            fastify.log.error("Unknown error making transfer offer:", err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to make transfer offer." });
        }
    }

    public static async getPendingTransfersForClub(request: FastifyRequest<{ Params: { clubId: number } }>, reply: FastifyReply) {
        const { clubId } = request.params;
        try {
            const pendingTransfers = await TransferService.getPendingTransfersForClub(clubId);
            return reply.status(200).send({ pendingTransfers });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error fetching pending transfers for club ${clubId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to retrieve pending transfers." });
            }
            fastify.log.error(`Unknown error fetching pending transfers for club ${clubId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to retrieve pending transfers." });
        }
    }

    public static async processTransferOfferResponse(request: FastifyRequest<{ Params: { transferId: number } }>, reply: FastifyReply) {
        const { transferId } = request.params;
        try {
            const status = await TransferService.evaluateTransferOffer(transferId);
            return reply.status(200).send({ message: `Transfer offer ${transferId} status: ${status}.` });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error processing transfer offer response for ${transferId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to process transfer offer response." });
            }
            fastify.log.error(`Unknown error processing transfer offer response for ${transferId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to process transfer offer response." });
        }
    }

    public static async acceptUserTransferOffer(request: FastifyRequest<{ Params: { transferId: number } }>, reply: FastifyReply) {
        const { transferId } = request.params;
        try {
            await TransferService.acceptUserTransferOffer(transferId);
            return reply.status(200).send({ message: `Transfer offer ${transferId} accepted and completed.` });
        } catch (err: unknown) {
            if (err instanceof AppError) {
                return reply.status(err.statusCode).send({ error: err.message });
            } else if (err instanceof Error) {
                fastify.log.error(`Error accepting user transfer offer ${transferId}:`, err.message);
                return reply.status(500).send({ error: err.message, message: "Failed to accept transfer offer." });
            }
            fastify.log.error(`Unknown error accepting user transfer offer ${transferId}:`, err);
            return reply.status(500).send({ error: "An unknown error occurred.", message: "Failed to accept transfer offer." });
        }
    }
}

export default TransferController;