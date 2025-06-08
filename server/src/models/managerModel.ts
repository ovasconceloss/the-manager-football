import { Buffer } from "buffer";
import fastify from "../fastify";
import GameLoaderService from "../core/gameLoader";

function convertImagesToBase64(obj: any): void {
    if (!obj) return;

    if (obj.nation_flag_image instanceof Buffer) {
        try {
            obj.nation_flag_image = obj.nation_flag_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting nation_flag_image to base64:", e);
            obj.nation_flag_image = null;
        }
    } else if (typeof obj.nation_flag_image === 'string' && obj.nation_flag_image.startsWith('data:image')) {
    } else if (obj.nation_flag_image !== null && obj.nation_flag_image !== undefined) {
        fastify.log.warn("Unexpected type for nation_flag_image:", typeof obj.nation_flag_image);
    }

    if (obj.club_logo_image instanceof Buffer) {
        try {
            obj.club_logo_image = obj.club_logo_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting club_logo_image to base64:", e);
            obj.club_logo_image = null;
        }
    } else if (typeof obj.club_logo_image === 'string' && obj.club_logo_image.startsWith('data:image')) {
    } else if (obj.club_logo_image !== null && obj.club_logo_image !== undefined) {
        fastify.log.warn("Unexpected type for club_logo_image:", typeof obj.club_logo_image);
    }
}

class ManagerModel {
    public static async insertAndAssignManager(
        nationId: number,
        firstName: string,
        lastName: string,
        birthDate: string,
        tacticalStyleName: string,
        clubId: number
    ): Promise<number> {
        const databaseInstance = GameLoaderService.getCurrentDatabase();

        const currentGameState = databaseInstance.prepare(`SELECT current_date, season_id FROM game_state LIMIT 1`).get() as { current_date: string, season_id: number } | undefined;
        if (!currentGameState) {
            throw new Error("Game state not found. Ensure game_state is initialized before creating a manager.");
        }
        const gameCurrentDate = currentGameState.current_date;

        const newManagerStaffId = databaseInstance.transaction(() => {
            const managerFunction = databaseInstance.prepare(`
                SELECT id FROM staff_function_type WHERE name = 'Manager'
            `).get() as { id: number } | undefined;

            if (!managerFunction) {
                throw new Error("Staff function 'Manager' not found in database. Please ensure initial data is loaded.");
            }

            const tacticalStyle = databaseInstance.prepare(`
                SELECT id FROM tactical_style_type WHERE name = ?
            `).get(tacticalStyleName) as { id: number } | undefined;

            if (!tacticalStyle) {
                throw new Error(`Tactical style '${tacticalStyleName}' not found in database.`);
            }

            databaseInstance.prepare(`
                DELETE FROM staff_contract
                WHERE club_id = ?
                  AND staff_id IN (
                      SELECT s.id
                      FROM staff s
                      WHERE s.function_id = ? -- Apenas managers
                  );
            `).run(clubId, managerFunction.id);

            const birthDateISO = new Date(birthDate).toISOString().split('T')[0];
            const sqlInsertStaff = `
                INSERT INTO staff
                    (nation_id, first_name, last_name, birth_date, function_id, tactical_style_id, is_user)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;

            const staffResult = databaseInstance.prepare(sqlInsertStaff).run(
                nationId,
                firstName,
                lastName,
                birthDateISO,
                managerFunction.id,
                tacticalStyle.id,
                1
            );
            const insertedStaffId = staffResult.lastInsertRowid as number;

            const club = databaseInstance.prepare("SELECT reputation FROM club WHERE id = ?")
                .get(clubId) as { reputation: number } | undefined;

            if (!club) {
                throw new Error(`Club with ID ${clubId} not found.`);
            }

            const baseSalary = club.reputation * 100;
            const randomBonus = Math.floor(Math.random() * (baseSalary * 0.1));
            const salary = baseSalary + randomBonus;

            const currentSeason = databaseInstance.prepare(`
                SELECT start_date, end_date FROM season WHERE id = ?
            `).get(currentGameState.season_id) as { start_date: string, end_date: string } | undefined;

            if (!currentSeason) {
                throw new Error("Current season not found. Cannot determine contract dates.");
            }

            const contractStartDate = gameCurrentDate;
            const contractEndDate = currentSeason.end_date;

            const sqlInsertStaffContract = `
                INSERT INTO staff_contract
                    (staff_id, club_id, start_date, end_date, salary)
                VALUES (?, ?, ?, ?, ?)
            `;

            databaseInstance.prepare(sqlInsertStaffContract).run(
                insertedStaffId,
                clubId,
                contractStartDate,
                contractEndDate,
                salary
            );

            const existingUserSave = databaseInstance.prepare(`SELECT id FROM user_save LIMIT 1`).get() as { id: number } | undefined;

            if (existingUserSave) {
                databaseInstance.prepare(`
                    UPDATE user_save
                    SET user_staff_id = ?, user_club_id = ?
                    WHERE id = ?;
                `).run(insertedStaffId, clubId, existingUserSave.id);
            } else {
                databaseInstance.prepare(`
                    INSERT INTO user_save (user_staff_id, user_club_id)
                    VALUES (?, ?);
                `).run(insertedStaffId, clubId);
            }

            return insertedStaffId;
        })();

        return newManagerStaffId;
    }

    public static async getUserManagerDetails() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentDate = new Date().toISOString().split('T')[0];

        const userSave = databaseInstance.prepare(`
            SELECT user_staff_id, user_club_id FROM user_save LIMIT 1
        `).get() as { user_staff_id: number, user_club_id: number } | undefined;

        if (!userSave) {
            return null;
        }

        const { user_staff_id, user_club_id } = userSave;

        const sql = `
            SELECT
                s.id AS manager_staff_id,
                s.first_name,
                s.last_name,
                s.birth_date,
                sft.name AS function_name,
                tst.name AS tactical_style_name,
                n.name AS nation_name,
                n.flag_image AS nation_flag_image,
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation AS club_abbreviation,
                c.logo_image AS club_logo_image,
                sc.salary AS contract_salary,
                sc.start_date AS contract_start_date,
                sc.end_date AS contract_end_date
            FROM staff s
            JOIN staff_function_type sft ON s.function_id = sft.id
            JOIN tactical_style_type tst ON s.tactical_style_id = tst.id
            JOIN nation n ON s.nation_id = n.id
            LEFT JOIN staff_contract sc ON s.id = sc.staff_id
                AND sc.club_id = ? -- Adicionado para garantir que o contrato é do clube correto
                AND ? BETWEEN sc.start_date AND sc.end_date
            LEFT JOIN club c ON sc.club_id = c.id
            WHERE s.id = ? AND s.is_user = 1 AND sft.name = 'Manager'
            LIMIT 1;
        `;

        const result = databaseInstance.prepare(sql).get(user_club_id, currentDate, user_staff_id);

        convertImagesToBase64(result);

        return result;
    }

    public static async getAvailableClubs() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const currentDate = new Date().toISOString().split('T')[0];

        const sql = `
            SELECT
                c.id AS club_id,
                c.name AS club_name,
                c.abbreviation,
                c.reputation,
                c.logo_image,
                n.name AS nation_name,
                s.name AS stadium_name
            FROM club c
            LEFT JOIN nation n ON c.nation_id = n.id
            LEFT JOIN stadium s ON c.stadium_id = s.id
            WHERE c.id NOT IN (
                SELECT sc.club_id
                FROM staff_contract sc
                JOIN staff s_contract ON sc.staff_id = s_contract.id
                WHERE sc.end_date >= ? AND s_contract.function_id = (SELECT id FROM staff_function_type WHERE name = 'Manager')
            )
            ORDER BY c.reputation DESC;
        `;

        const results = databaseInstance.prepare(sql).all(currentDate) as Array<{
            club_id: number,
            club_name: string,
            abbreviation: string,
            reputation: number,
            logo_image: Buffer | string | null,
            nation_name: string,
            stadium_name: string
        }>;

        results.forEach(club => {
            if (club.logo_image instanceof Buffer) {
                club.logo_image = club.logo_image.toString("base64");
            }
        });
        return results;
    }

    public static async getTacticalStyleTypes() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `SELECT id, name, description FROM tactical_style_type`;
        return databaseInstance.prepare(sql).all();
    }
}

export default ManagerModel;