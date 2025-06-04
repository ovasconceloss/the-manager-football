import * as os from "os";
import * as fs from "fs";
import * as path from "path";
import fastify from "../fastify";
import Database from "better-sqlite3";
import { ClubDatabaseInfo } from "../interfaces/club";
import { NationDatabaseInfo } from "../interfaces/nation";
import { CompetitionDatabaseInfo } from "../interfaces/competition";
import { ConfederationDatabaseInfo } from "../interfaces/confederation";
import SeedService from "../data/seedService";

const databasePath = path.join(__dirname, '..', 'data', 'default', 'default.tm');
const databaseInstance = new Database(databasePath);

databaseInstance.exec("PRAGMA foreign_keys = ON;");

databaseInstance.transaction(() => {
    const getConfederationsStatement = databaseInstance.prepare("SELECT id, name FROM confederation");
    const getAllNationsStatement = databaseInstance.prepare("SELECT id, name, federation_name FROM nation");
    const getNationalCompetitionsStatement = databaseInstance.prepare("SELECT id, name, nation_id, confederation_id FROM competition WHERE nation_id = ?");
    const getContinentalCompetitionsStatement = databaseInstance.prepare("SELECT id, name, nation_id, confederation_id FROM competition WHERE confederation_id IS NOT NULL AND nation_id IS NULL");
    const getClubsByNationStatement = databaseInstance.prepare("SELECT id, name, nation_id, reputation FROM club WHERE nation_id = ?");

    const clubUpdateLogoStatement = databaseInstance.prepare("UPDATE club SET logo_image = ? WHERE id = ?");
    const competitionUpdateLogoStatement = databaseInstance.prepare("UPDATE competition SET competition_logo = ? WHERE id = ?");
    const nationUpdateBlobsStatement = databaseInstance.prepare("UPDATE nation SET flag_image = ?, federation_image = ? WHERE id = ?");
    const confederationUpdateBlobsStatement = databaseInstance.prepare("UPDATE confederation SET confederation_image = ? WHERE id = ?");

    const graphicsBaseDir = path.join(os.homedir(), "Documents", "ProPlay Games", "The Manager 2025", "graphics", "logos");
    const competitionsDir = path.join(graphicsBaseDir, "competitions");

    const confederationsDir = path.join(graphicsBaseDir, "confederations");
    const nationsFlagsDir = path.join(graphicsBaseDir, "nations", "flags");
    const nationsFederationsDir = path.join(graphicsBaseDir, "nations", "federations");
    const confederationsCompetitionsDir = path.join(competitionsDir, "confederations");
    const nationalCompetitionsDir = path.join(competitionsDir, "nations");

    function sanitizeFileName(name: string): string {
        return name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]/gi, "_");
    }

    const nationsFromDatabase = getAllNationsStatement.all() as NationDatabaseInfo[];
    const confederationsFromDatabase = getConfederationsStatement.all() as ConfederationDatabaseInfo[];

    for (const confederation of confederationsFromDatabase) {
        const confederationFilename = `${sanitizeFileName(confederation.name)}.png`;
        let logoBuffer: Buffer | null = null;
        const logoPath = path.join(confederationsDir, confederationFilename);

        if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
        } else {
            fastify.log.warn(`Warning: Logo image not found for confederation ${confederation.name} at ${logoPath}. Using empty BLOB.`);
        }
        confederationUpdateBlobsStatement.run(logoBuffer || Buffer.from(''), confederation.id);
    }

    const continentalCompetitionsFromDatabase = getContinentalCompetitionsStatement.all() as CompetitionDatabaseInfo[];

    for (const competition of continentalCompetitionsFromDatabase) {
        const logoFilename = `${sanitizeFileName(competition.name)}.png`;
        let logoBuffer: Buffer | null = null;
        const logoPath = path.join(confederationsCompetitionsDir, logoFilename);

        if (fs.existsSync(logoPath)) {
            logoBuffer = fs.readFileSync(logoPath);
        } else {
            fastify.log.warn(`Warning: Logo image not found for continental competition ${competition.name} at ${logoPath}. Using empty BLOB.`);
        }
        competitionUpdateLogoStatement.run(logoBuffer || Buffer.from(''), competition.id);
    }

    for (const nation of nationsFromDatabase) {
        const nationFilename = `${sanitizeFileName(nation.name)}.png`;

        let flagBuffer: Buffer | null = null;
        const flagPath = path.join(nationsFlagsDir, nationFilename);

        if (fs.existsSync(flagPath)) {
            flagBuffer = fs.readFileSync(flagPath);
        } else {
            fastify.log.warn(`Warning: Flag image not found for nation ${nation.name} at ${flagPath}. Using empty BLOB.`);
        }

        let federationLogoBuffer: Buffer | null = null;
        const federationLogoPath = path.join(nationsFederationsDir, nationFilename);

        if (fs.existsSync(federationLogoPath)) {
            federationLogoBuffer = fs.readFileSync(federationLogoPath);
        } else {
            fastify.log.warn(`Warning: Federation logo not found for nation ${nation.name} at ${federationLogoPath}. Using empty BLOB.`);
        }

        nationUpdateBlobsStatement.run(flagBuffer || Buffer.from(''), federationLogoBuffer || Buffer.from(''), nation.id);
        const nationalCompetitionsFromDatabase = getNationalCompetitionsStatement.all(nation.id) as CompetitionDatabaseInfo[];
        const competitionNationDir = path.join(nationalCompetitionsDir, sanitizeFileName(nation.name)); 

        for (const competition of nationalCompetitionsFromDatabase) {
            let logoBuffer: Buffer | null = null;
            const logoFilename = `${sanitizeFileName(competition.name)}.png`;
            const logoPath = path.join(competitionNationDir, logoFilename);

            if (fs.existsSync(logoPath)) {
                logoBuffer = fs.readFileSync(logoPath);
            } else {
                fastify.log.warn(`Warning: Competition logo not found for national competition ${competition.name} at ${logoPath}. Using empty BLOB.`);
            }
            competitionUpdateLogoStatement.run(logoBuffer || Buffer.from(''), competition.id);
        }

        const currentSeasonStartDate = "2025-07-01";
        const clubsFromDatabase = getClubsByNationStatement.all(nation.id) as ClubDatabaseInfo[];
        const nationLogoDir = path.join(graphicsBaseDir, sanitizeFileName(nation.name));

        for (const club of clubsFromDatabase) {
            let logoBuffer: Buffer | null = null;
            const logoFilename = `${sanitizeFileName(club.name)}.png`;
            const logoPath = path.join(nationLogoDir, logoFilename);

            if (fs.existsSync(logoPath)) {
                logoBuffer = fs.readFileSync(logoPath);
            } else {
                fastify.log.warn(`Warning: Club logo not found for ${club.name} at ${logoPath}. Using empty BLOB.`);
            }

            clubUpdateLogoStatement.run(logoBuffer || Buffer.from(''), club.id);

            SeedService.seedPlayers(databaseInstance, club.id, nation.id, club.reputation, currentSeasonStartDate);
        }
    }
})();

fastify.log.info(`Seed successfully completed`);