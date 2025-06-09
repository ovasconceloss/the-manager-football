import fastify from "../fastify";
import FinanceModel from "./financeModel";
import { AppError } from "../errors/errors";
import GameLoaderService from "../core/gameLoader";

class TransferModel {
    public static getCurrentGameDate = (): string => {
        const db = GameLoaderService.getCurrentDatabase();
        const gameState = db.prepare(`SELECT * FROM game_state LIMIT 1`).get() as { current_date: string };
        if (!gameState) {
            throw new AppError("Game state not found. Cannot determine current game date.", 500);
        }
        return gameState.current_date;
    };

    public static async isTransferWindowOpen(date: string): Promise<boolean> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const checkWindowSql = `
            SELECT COUNT(id) AS count
            FROM transfer_window
            WHERE ? BETWEEN start_date AND end_date;
        `;
        const result = databaseInstance.prepare(checkWindowSql).get(date) as { count: number };
        return result.count > 0;
    }

    public static async getPlayerForTransfer(playerId: number): Promise<any | undefined> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameDate = this.getCurrentGameDate();

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name,
                p.last_name,
                p.overall,
                p.potential,
                p.market_value,
                pc.club_id AS current_club_id,
                c.name AS current_club_name,
                pc.salary AS current_salary,
                pc.end_date AS contract_end_date,
                n.name AS nation_name,
                n.flag_image AS nation_flag_image
            FROM player p
            JOIN player_contract pc ON p.id = pc.player_id
            JOIN club c ON pc.club_id = c.id
            JOIN nation n ON p.nation_id = n.id
            WHERE p.id = ? AND ? BETWEEN pc.start_date AND pc.end_date;
        `;
        const playerDetails = databaseInstance.prepare(sql).get(playerId, gameDate) as {
            nation_flag_image?: Buffer | string;
            [key: string]: any;
        } | undefined;

        if (playerDetails && playerDetails.nation_flag_image instanceof Buffer) {
            playerDetails.nation_flag_image = playerDetails.nation_flag_image.toString('base64');
        }
        return playerDetails;
    }

    public static async getTransferListedPlayers(limit: number = 20, offset: number = 0): Promise<any[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameDate = this.getCurrentGameDate();

        const futureDate = new Date(gameDate);
        futureDate.setMonth(futureDate.getMonth() + 6);
        const sixMonthsLater = futureDate.toISOString().split('T')[0];

        const sql = `
            SELECT
                p.id AS player_id,
                p.first_name,
                p.last_name,
                p.overall,
                p.market_value,
                pc.club_id AS current_club_id,
                c.name AS current_club_name,
                pc.salary AS current_salary,
                pc.end_date AS contract_end_date,
                n.name AS nation_name,
                n.flag_image AS nation_flag_image
            FROM player p
            JOIN player_contract pc ON p.id = pc.player_id
            JOIN club c ON pc.club_id = c.id
            JOIN nation n ON p.nation_id = n.id
            WHERE ? BETWEEN pc.start_date AND pc.end_date
              AND pc.end_date <= ? 
            ORDER BY p.market_value DESC
            LIMIT ? OFFSET ?;
        `;

        const players = databaseInstance.prepare(sql).all(gameDate, sixMonthsLater, limit, offset);

        players.forEach((player: any) => {
            if (player.nation_flag_image instanceof Buffer) {
                player.nation_flag_image = player.nation_flag_image.toString('base64');
            }
        });
        return players;
    }

    public static async createTransferOffer(
        offererClubId: number,
        targetPlayerId: number,
        offerFee: number,
        proposedPlayerSalary: number,
        proposedPlayerContractLength: number,
        agentFee: number = 0,
        signingBonus: number = 0,
        transferTypeName: 'Permanent' | 'Loan' | 'Free Transfer',
        loanDetails: { loanStartDate: string, loanEndDate: string, loanFee: number, wageContributionPercentage: number, optionToBuyFee?: number, isMandatoryBuyOption?: boolean } | null = null
    ): Promise<number> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameDate = this.getCurrentGameDate();

        const transferType = databaseInstance.prepare(`
            SELECT id FROM transfer_type WHERE name = ?
        `).get(transferTypeName) as { id: number } | undefined;

        if (!transferType) {
            throw new AppError(`Transfer type '${transferTypeName}' not found.`, 400);
        }

        const playerCurrentDetails = await TransferModel.getPlayerForTransfer(targetPlayerId);
        if (!playerCurrentDetails) {
            throw new AppError(`Player with ID ${targetPlayerId} not found or has no active contract.`, 404);
        }

        const clubFromId = playerCurrentDetails.current_club_id;
        const clubToId = offererClubId;

        const clubSummary = await FinanceModel.getClubFinancialSummary(offererClubId);
        if (!clubSummary || clubSummary.transfer_budget_available < offerFee + agentFee + signingBonus) {
            throw new AppError("Insufficient transfer budget available for this offer.", 400);
        }

        return databaseInstance.transaction(() => {
            const insertTransferSql = `
                INSERT INTO transfer (player_id, club_from_id, club_to_id, transfer_type_id,
                                      transfer_fee, agent_fee, signing_bonus, transfer_date, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending');
            `;
            const transferResult = databaseInstance.prepare(insertTransferSql).run(
                targetPlayerId, clubFromId, clubToId, transferType.id,
                offerFee, agentFee, signingBonus, gameDate
            );
            const newTransferId = transferResult.lastInsertRowid as number;

            if (transferTypeName === 'Loan' && loanDetails) {
                const insertLoanDetailsSql = `
                    INSERT INTO loan_details (transfer_id, loan_start_date, loan_end_date,
                                              loan_fee, wage_contribution_percentage,
                                              option_to_buy_fee, is_mandatory_buy_option)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                `;
                databaseInstance.prepare(insertLoanDetailsSql).run(
                    newTransferId, loanDetails.loanStartDate, loanDetails.loanEndDate,
                    loanDetails.loanFee, loanDetails.wageContributionPercentage,
                    loanDetails.optionToBuyFee || null, loanDetails.isMandatoryBuyOption ? 1 : 0
                );
            }

            return newTransferId;
        })();
    }

    public static async processTransferOfferResponse(transferId: number): Promise<'Accepted' | 'Rejected'> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameDate = this.getCurrentGameDate();

        const transferDetails = databaseInstance.prepare(`
            SELECT
                t.player_id, t.club_from_id, t.club_to_id, t.transfer_fee, t.agent_fee, t.signing_bonus,
                t.transfer_type_id, tt.name AS transfer_type_name
            FROM transfer t
            JOIN transfer_type tt ON t.transfer_type_id = tt.id
            WHERE t.id = ? AND t.status = 'Pending';
        `).get(transferId) as any;

        if (!transferDetails) {
            throw new AppError(`Transfer offer with ID ${transferId} not found or not pending.`, 404);
        }

        const playerDetails = await TransferModel.getPlayerForTransfer(transferDetails.player_id);
        if (!playerDetails) {
            throw new AppError(`Player ${transferDetails.player_id} not found for transfer response.`, 404);
        }

        const sellingClubReputation = databaseInstance.prepare(`SELECT reputation FROM club WHERE id = ?`).get(transferDetails.club_from_id) as { reputation: number };
        const buyingClubReputation = databaseInstance.prepare(`SELECT reputation FROM club WHERE id = ?`).get(transferDetails.club_to_id) as { reputation: number };

        let offerAccepted = false;
        const marketValue = playerDetails.market_value;
        const offerRatio = transferDetails.transfer_fee / marketValue;

        const contractEndDate = new Date(playerDetails.contract_end_date);
        const msRemaining = contractEndDate.getTime() - new Date(gameDate).getTime();
        const daysRemaining = msRemaining / (1000 * 60 * 60 * 24);

        if (offerRatio >= 0.9) {
            offerAccepted = true;
        } else if (daysRemaining < 90 && offerRatio >= 0.5) {
            offerAccepted = true;
        } else if (Math.random() < 0.1 && offerRatio >= 0.7) {
            offerAccepted = true;
        }

        const playerAccepts = (transferDetails.signing_bonus > 0 && Math.random() > 0.3) ||
            (buyingClubReputation.reputation > sellingClubReputation.reputation && Math.random() > 0.2);

        if (offerAccepted && playerAccepts) {
            await TransferModel.completeTransfer(transferId);
            return 'Accepted';
        } else {
            databaseInstance.prepare(`UPDATE transfer SET status = 'Failed' WHERE id = ?`).run(transferId);
            fastify.log.info(`Transfer offer ${transferId} for ${playerDetails.first_name} ${playerDetails.last_name} rejected.`);
            return 'Rejected';
        }
    }

    public static async completeTransfer(transferId: number): Promise<void> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const gameDate = this.getCurrentGameDate();

        const transfer = databaseInstance.prepare(`
            SELECT
                t.id, t.player_id, t.club_from_id, t.club_to_id, t.transfer_fee, t.agent_fee, t.signing_bonus,
                tt.name AS transfer_type_name,
                ld.loan_start_date, ld.loan_end_date, ld.loan_fee, ld.wage_contribution_percentage
            FROM transfer t
            JOIN transfer_type tt ON t.transfer_type_id = tt.id
            LEFT JOIN loan_details ld ON t.id = ld.transfer_id
            WHERE t.id = ? AND t.status = 'Pending';
        `).get(transferId) as any;

        if (!transfer) {
            throw new AppError(`Transfer with ID ${transferId} not found or not in 'Pending' status.`, 404);
        }

        const { player_id, club_from_id, club_to_id, transfer_fee, agent_fee, signing_bonus, transfer_type_name } = transfer;

        databaseInstance.transaction(() => {
            if (transfer_type_name === 'Permanent' || transfer_type_name === 'Free Transfer' || transfer_type_name === 'Release') {
                const currentContract = databaseInstance.prepare(`
                    SELECT id FROM player_contract
                    WHERE player_id = ? AND club_id = ? AND ? BETWEEN start_date AND end_date;
                `).get(player_id, club_from_id, gameDate) as { id: number } | undefined;

                if (currentContract) {
                    databaseInstance.prepare(`
                        UPDATE player_contract SET end_date = ? WHERE id = ?;
                    `).run(gameDate, currentContract.id);
                    fastify.log.info(`Old contract of player ${player_id} with club ${club_from_id} terminated.`);
                }
            }

            if (transfer_type_name === 'Permanent' || transfer_type_name === 'Loan' || transfer_type_name === 'Free Transfer') {
                let newPlayerSalary = 10000;
                let newContractEndDate = new Date(gameDate);
                newContractEndDate.setFullYear(newContractEndDate.getFullYear() + 3);

                if (transfer_type_name === 'Loan') {
                    newContractEndDate = new Date(transfer.loan_end_date);
                    newPlayerSalary = transfer.wage_contribution_percentage ? player_id * 0.1 : 0;
                }

                databaseInstance.prepare(`
                    INSERT INTO player_contract (player_id, club_id, start_date, end_date, salary)
                    VALUES (?, ?, ?, ?, ?);
                `).run(player_id, club_to_id, gameDate, newContractEndDate.toISOString().split('T')[0], newPlayerSalary);
                fastify.log.info(`New contract for player ${player_id} with club ${club_to_id} created.`);
            }

            databaseInstance.prepare(`UPDATE transfer SET status = 'Completed', updated_at = ? WHERE id = ?`)
                .run(gameDate, transferId);
            fastify.log.info(`Transfer ${transferId} successfully completed.`);
        })();

        if (club_to_id) {
            if (transfer_fee > 0 && transfer_type_name === 'Permanent') {
                await FinanceModel.recordTransaction(
                    club_to_id, 'Transfer Fees Paid', transfer_fee,
                    `Payment of transfer fee per player ${player_id}.`, 'balance'
                );
            }

            if (agent_fee > 0) {
                await FinanceModel.recordTransaction(
                    club_to_id, 'Transfer Fees Paid', agent_fee,
                    `Payment of agent fee per player ${player_id}.`, 'balance'
                );
            }

            if (signing_bonus > 0) {
                await FinanceModel.recordTransaction(
                    club_to_id, 'Transfer Fees Paid', signing_bonus,
                    `Signing bonus payment for player ${player_id}.`, 'balance'
                );
            }

            if (transfer_type_name === 'Loan' && transfer.loan_fee > 0) {
                await FinanceModel.recordTransaction(
                    club_to_id, 'Loan Payments Made', transfer.loan_fee,
                    `Payment of loan fee per player ${player_id}.`, 'balance'
                );
            }
        }

        if (club_from_id) {
            if (transfer_fee > 0 && transfer_type_name === 'Permanent') {
                await FinanceModel.recordTransaction(
                    club_from_id, 'Player Sales', transfer_fee,
                    `Receipt of transfer fee for sale of player ${player_id}.`, 'balance'
                );
            }

            if (transfer_type_name === 'Loan' && transfer.loan_fee > 0) {
                await FinanceModel.recordTransaction(
                    club_from_id, 'Loan Fees Received', transfer.loan_fee,
                    `Receipt of loan fee per player ${player_id}.`, 'balance'
                );
            }
        }
    }

    public static async getPendingTransfersForClub(clubId: number): Promise<any[]> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT
                t.id AS transfer_id,
                t.transfer_fee,
                t.agent_fee,
                t.signing_bonus,
                t.transfer_date,
                p.first_name || ' ' || p.last_name AS player_name,
                p.overall,
                c_from.name AS club_from_name,
                c_to.name AS club_to_name,
                tt.name AS transfer_type,
                ld.loan_start_date,
                ld.loan_end_date,
                ld.loan_fee,
                ld.wage_contribution_percentage
            FROM transfer t
            JOIN player p ON t.player_id = p.id
            LEFT JOIN club c_from ON t.club_from_id = c_from.id
            LEFT JOIN club c_to ON t.club_to_id = c_to.id
            JOIN transfer_type tt ON t.transfer_type_id = tt.id
            LEFT JOIN loan_details ld ON t.id = ld.transfer_id
            WHERE (t.club_from_id = ? OR t.club_to_id = ?) AND t.status = 'Pending'
            ORDER BY t.transfer_date DESC;
        `;
        return databaseInstance.prepare(sql).all(clubId, clubId);
    }
}

export default TransferModel;