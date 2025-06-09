import { FastifyInstance } from "fastify";
import TransferController from "../controllers/transferController";

export default async function transferRoutes(fastify: FastifyInstance) {
    fastify.get('/transfer/window-status', TransferController.getTransferWindowStatus);
    fastify.get('/transfer/player/:playerId', TransferController.getPlayerDetailsForTransfer);
    fastify.get('/transfer/available-players', TransferController.getAvailablePlayersForTransfer);
    fastify.post('/transfer/make-offer', TransferController.makeTransferOffer);
    fastify.get('/transfer/pending-offers/:clubId', TransferController.getPendingTransfersForClub);
    fastify.post('/transfer/process-offer-response/:transferId', TransferController.processTransferOfferResponse);
    fastify.patch('/transfer/accept-offer/:transferId', TransferController.acceptUserTransferOffer);
}