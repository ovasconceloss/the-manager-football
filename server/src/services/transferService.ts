import { AppError } from "../errors/errors";
import TransferModel from "../models/transferModel";

class TransferService {
    static async isTransferWindowOpen(): Promise<boolean> {
        const gameDate = TransferModel.getCurrentGameDate();
        return await TransferModel.isTransferWindowOpen(gameDate);
    }

    static async getPlayerDetailsForTransfer(playerId: number) {
        if (!playerId) {
            throw new AppError("Player ID is required.", 400);
        }
        return await TransferModel.getPlayerForTransfer(playerId);
    }

    static async getAvailablePlayersForTransfer(limit?: number, offset?: number) {
        return await TransferModel.getTransferListedPlayers(limit, offset);
    }

    static async makeTransferOffer(offerData: {
        offererClubId: number;
        targetPlayerId: number;
        offerFee: number;
        proposedPlayerSalary: number;
        proposedPlayerContractLength: number;
        agentFee?: number;
        signingBonus?: number;
        transferTypeName: 'Permanent' | 'Loan' | 'Free Transfer';
        loanDetails?: { loanStartDate: string, loanEndDate: string, loanFee: number, wageContributionPercentage: number, optionToBuyFee?: number, isMandatoryBuyOption?: boolean };
    }): Promise<number> {
        if (!offerData.offererClubId || !offerData.targetPlayerId || offerData.offerFee < 0 || offerData.proposedPlayerSalary < 0 || offerData.proposedPlayerContractLength <= 0 || !offerData.transferTypeName) {
            throw new AppError("Invalid transfer offer data provided.", 400);
        }

        if (!(await this.isTransferWindowOpen())) {
            throw new AppError("Transfer window is currently closed.", 403);
        }

        return await TransferModel.createTransferOffer(
            offerData.offererClubId,
            offerData.targetPlayerId,
            offerData.offerFee,
            offerData.proposedPlayerSalary,
            offerData.proposedPlayerContractLength,
            offerData.agentFee,
            offerData.signingBonus,
            offerData.transferTypeName,
            offerData.loanDetails
        );
    }

    static async evaluateTransferOffer(transferId: number): Promise<'Accepted' | 'Rejected'> {
        return await TransferModel.processTransferOfferResponse(transferId);
    }

    static async getPendingTransfersForClub(clubId: number): Promise<any[]> {
        if (!clubId) {
            throw new AppError("Club ID is required.", 400);
        }
        return await TransferModel.getPendingTransfersForClub(clubId);
    }

    static async acceptUserTransferOffer(transferId: number): Promise<void> {
        return await TransferModel.completeTransfer(transferId);
    }
}

export default TransferService;