import Database from "better-sqlite3";
import fastify from "../../../fastify";
import FinanceService from "../../../services/financeService";

class MatchFinanceService {
    private static readonly BASE_TICKET_PRICE = 30;

    public static async processMatchFinancials(match: any, databaseInstance: Database.Database) {
        const clubId = match.home_club_id;

        const stadiumInfo = databaseInstance.prepare(`
            SELECT s.capacity
            FROM club c
            JOIN stadium s ON c.stadium_id = s.id
            WHERE c.id = ?
        `).get(clubId) as { capacity: number } | undefined;

        if (!stadiumInfo) {
            fastify.log.warn(`Stadium not found for club ${clubId}. Cannot calculate ticket revenue.`);
            return;
        }

        const stadiumCapacity = stadiumInfo.capacity;
        const attendancePercentage = 0.6 + (Math.random() * 0.3);
        const numberOfSpectators = Math.floor(stadiumCapacity * attendancePercentage);

        const ticketPrice = MatchFinanceService.BASE_TICKET_PRICE + (match.home_club_reputation / 100);
        const ticketRevenue = numberOfSpectators * ticketPrice;

        try {
            await FinanceService.recordTransaction(
                clubId,
                'Ticket Sales',
                ticketRevenue,
                `Ticket sales for the match vs. ${match.away_name} (Round ${match.leg_number})`,
                'balance'
            );
            //fastify.log.info(`Ticket revenue from ${match.home_name}: ${ticketRevenue.toFixed(2)}`);
        } catch (error) {
            console.log(error);
            fastify.log.error(`Error registering ticket revenue for ${match.home_name}:`, error);
        }
    }
}

export default MatchFinanceService;