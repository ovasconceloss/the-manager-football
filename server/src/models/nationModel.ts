import { Buffer } from "buffer";
import fastify from "../fastify";
import GameLoaderService from "../core/gameLoader";

function convertNationImagesToBase64(obj: any): void {
    if (!obj) return;

    if (obj.flag_image instanceof Buffer) {
        try {
            obj.flag_image = obj.flag_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting flag_image to base64:", e);
            obj.flag_image = null;
        }
    } else if (typeof obj.flag_image === 'string' && obj.flag_image.startsWith('data:image')) {
    } else if (obj.flag_image !== null && obj.flag_image !== undefined) {
        fastify.log.warn("Unexpected type for flag_image, not a Buffer or already base64:", typeof obj.flag_image);
    }

    if (obj.federation_image instanceof Buffer) {
        try {
            obj.federation_image = obj.federation_image.toString("base64");
        } catch (e) {
            fastify.log.error("Error converting federation_image to base64:", e);
            obj.federation_image = null;
        }
    } else if (typeof obj.federation_image === 'string' && obj.federation_image.startsWith('data:image')) {
    } else if (obj.federation_image !== null && obj.federation_image !== undefined) {
        fastify.log.warn("Unexpected type for federation_image, not a Buffer or already base64:", typeof obj.federation_image);
    }
}

class NationModel {
    public static async getAllNations() {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT
                n.id AS nation_id,
                n.name AS nation_name,
                n.reputation,
                n.federation_name,
                n.confederation_id,
                c.name AS confederation_name,
                n.flag_image,
                n.federation_image
            FROM nation n
            LEFT JOIN confederation c ON n.confederation_id = c.id;
        `;

        const nations = databaseInstance.prepare(sql).all();
        nations.forEach(convertNationImagesToBase64);
        return nations;
    }

    public static async getNationById(nationId: number) {
        const databaseInstance = GameLoaderService.getCurrentDatabase();
        const sql = `
            SELECT
                n.id AS nation_id,
                n.name AS nation_name,
                n.reputation,
                n.federation_name,
                n.confederation_id,
                c.name AS confederation_name,
                n.flag_image,
                n.federation_image
            FROM nation n
            LEFT JOIN confederation c ON n.confederation_id = c.id
            WHERE n.id = ?;
        `;

        const nation = databaseInstance.prepare(sql).get(nationId);
        convertNationImagesToBase64(nation);
        return nation;
    }
}

export default NationModel;