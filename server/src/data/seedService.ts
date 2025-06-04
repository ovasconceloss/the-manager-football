import fastify from "../fastify";
import Database from "better-sqlite3";
import { Faker } from "@faker-js/faker";
import FakerUtils from "../utils/fakerUtils";
import { randomValues } from "../utils/utils";
import { AttributeTypeDatabaseInfo, NationDatabaseInfo, PlayerPositionDatabaseInfo } from "../interfaces/player";

function calculateAge(birthDate: Date, referenceDate: Date): number {
    let age = referenceDate.getFullYear() - birthDate.getFullYear();
    const m = referenceDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getRandomBirthDate(faker: Faker, minAge: number, maxAge: number, referenceDate: Date): Date {
    const currentYear = referenceDate.getFullYear();
    const minBirthYear = currentYear - maxAge;
    const maxBirthYear = currentYear - minAge;
    return faker.date.birthdate({ mode: "year", min: minBirthYear, max: maxBirthYear });
}

class SeedService {
    public static seedPlayers(
        databaseInstance: Database.Database,
        clubId: number,
        nationId: number,
        clubReputation: number,
        currentSeasonStartDate: string,
    ) {
        try {
            const playerInsertStatement = databaseInstance.prepare(
                `INSERT INTO player (nation_id, position_id, first_name, last_name, birth_date, overall, potential, market_value) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            );

            const contractInsertStatement = databaseInstance.prepare(
                `INSERT INTO player_contract (player_id, club_id, start_date, end_date, salary) 
                VALUES (?, ?, ?, ?, ?)`
            );

            const playerAttributeInsertStatement = databaseInstance.prepare(
                `INSERT INTO player_attribute (player_id, attribute_type_id, value)
                VALUES (?, ?, ?)`
            );

            const playerPositionsMap = new Map<string, number>();
            const playerPositionsDb = databaseInstance.prepare("SELECT id, name FROM player_position").all() as PlayerPositionDatabaseInfo[];
            for (const position of playerPositionsDb) {
                playerPositionsMap.set(position.name, position.id);
            }

            const attributeTypesMap = new Map<string, { id: number, category: string }>();
            const attributeTypesDb = databaseInstance.prepare("SELECT id, name, category FROM attribute_type").all() as AttributeTypeDatabaseInfo[];
            for (const attribute of attributeTypesDb) {
                attributeTypesMap.set(attribute.name, { id: attribute.id, category: attribute.category });
            }

            const localNationInfo = databaseInstance.prepare("SELECT name FROM nation WHERE id = ?").get(nationId) as { name: string };
            const localFaker = FakerUtils.getFakerByNation(localNationInfo.name);

            const foreignNationsDb = databaseInstance.prepare("SELECT id, name FROM nation WHERE id != ?").all(nationId) as NationDatabaseInfo[];
            if (foreignNationsDb.length === 0) {
                fastify.log.warn(`Warning: No foreign nations found in DB for nation ID ${nationId}. All players will be local.`);
            }

            const squadPositionsConfig: { abbreviation: string, count: number }[] = [
                { abbreviation: "GK", count: 3 },
                { abbreviation: "CB", count: 6 },
                { abbreviation: "LB", count: 2 },
                { abbreviation: "RB", count: 2 },
                { abbreviation: "CDM", count: 4 },
                { abbreviation: "CM", count: 4 },
                { abbreviation: "CAM", count: 2 },
                { abbreviation: "LW", count: 2 },
                { abbreviation: "RW", count: 2 },
                { abbreviation: "ST", count: 3 },
            ];

            let playerPositionsForSquad: number[] = [];
            for (const squadPosition of squadPositionsConfig) {
                const positionId = playerPositionsMap.get(squadPosition.abbreviation);
                if (positionId !== undefined) {
                    playerPositionsForSquad = playerPositionsForSquad.concat(Array(squadPosition.count).fill(positionId));
                } else {
                    fastify.log.warn(`Warning: Position abbreviation '${squadPosition.abbreviation}' not found in player_position table. Skipping.`);
                }
            }

            for (let i = playerPositionsForSquad.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playerPositionsForSquad[i], playerPositionsForSquad[j]] = [playerPositionsForSquad[j], playerPositionsForSquad[i]];
            }

            const totalPlayers = playerPositionsForSquad.length;
            const localPlayersCount = Math.floor(totalPlayers * 0.6);
            const currentSeasonStart = new Date(currentSeasonStartDate);

            const getAttributeValue = (
                attrName: string,
                attrInfo: { id: number, category: string },
                playerOverall: number,
                positionId: number
            ): number => {
                let attributeValue = randomValues(1, 20);

                let adjustment = Math.floor((playerOverall - 50) / 3);
                attributeValue = Math.max(1, Math.min(20, attributeValue + adjustment));

                const positionName = playerPositionsDb.find(p => p.id === positionId)?.name;

                if (positionName) {
                    if (positionName === 'GK' && attrInfo.category === 'goalkeeper') {
                        attributeValue = randomValues(playerOverall - 10, playerOverall + 5);
                        attributeValue = Math.max(1, Math.min(20, attributeValue));
                    } else if (positionName !== 'GK' && attrInfo.category === 'goalkeeper') {
                        attributeValue = randomValues(1, 5);
                    } else {
                        switch (positionName) {
                            case 'ST':
                            case 'CF':
                                if (attrName === 'Finishing') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Pace') attributeValue = randomValues(playerOverall - 5, playerOverall + 5);
                                if (attrName === 'Dribbling') attributeValue = randomValues(playerOverall - 5, playerOverall + 3);
                                break;
                            case 'CB':
                            case 'LB':
                            case 'RB':
                                if (attrName === 'Marking' || attrName === 'Tackling') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Strength' || attrName === 'Jumping') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Pace' && (positionName === 'LB' || positionName === 'RB')) attributeValue = randomValues(playerOverall - 5, playerOverall + 5);
                                break;
                            case 'CDM':
                                if (attrName === 'Tackling' || attrName === 'Positioning') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Passing') attributeValue = randomValues(playerOverall - 5, playerOverall + 3);
                                break;
                            case 'CM':
                                if (attrName === 'Passing' || attrName === 'Vision') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Dribbling' || attrName === 'BallControl') attributeValue = randomValues(playerOverall - 5, playerOverall + 3);
                                break;
                            case 'CAM':
                                if (attrName === 'Vision' || attrName === 'Passing' || attrName === 'Dribbling') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Finishing') attributeValue = randomValues(playerOverall - 10, playerOverall + 5);
                                break;
                            case 'LW':
                            case 'RW':
                                if (attrName === 'Pace' || attrName === 'Dribbling') attributeValue = randomValues(playerOverall - 5, playerOverall + 8);
                                if (attrName === 'Finishing') attributeValue = randomValues(playerOverall - 5, playerOverall + 5);
                                if (attrName === 'Crossing') attributeValue = randomValues(playerOverall - 5, playerOverall + 5);
                                break;
                        }
                    }
                }

                return Math.max(1, Math.min(20, attributeValue));
            };

            const insertPlayerAndDetails = databaseInstance.transaction(() => {
                for (let i = 0; i < totalPlayers; i++) {
                    let fakerInstance: Faker;
                    let playerNationId: number;
                    let playerNationName: string;

                    if (i < localPlayersCount || foreignNationsDb.length === 0) {
                        playerNationId = nationId;
                        fakerInstance = localFaker;
                        playerNationName = localNationInfo.name;
                    } else {
                        const randomNation = foreignNationsDb[Math.floor(Math.random() * foreignNationsDb.length)];
                        playerNationId = randomNation.id;
                        playerNationName = randomNation.name;
                        fakerInstance = FakerUtils.getFakerByNation(randomNation.name);
                    }

                    const playerFirstName = fakerInstance.person.firstName("male");
                    const playerLastName = fakerInstance.person.lastName("male");
                    const playerBirthDate = getRandomBirthDate(fakerInstance, 16, 35, currentSeasonStart);
                    const playerAge = calculateAge(playerBirthDate, currentSeasonStart);

                    let minOverall: number;
                    let maxOverall: number;

                    if (clubReputation >= 90) { // Top clubs
                        minOverall = randomValues(75, 85);
                        maxOverall = randomValues(85, 92);
                    } else if (clubReputation >= 80) { // High reputation clubs
                        minOverall = randomValues(68, 78);
                        maxOverall = randomValues(78, 88);
                    } else if (clubReputation >= 70) { // Mid-table clubs
                        minOverall = randomValues(60, 72);
                        maxOverall = randomValues(70, 82);
                    } else if (clubReputation >= 50) { // Lower-mid table clubs
                        minOverall = randomValues(55, 68);
                        maxOverall = randomValues(65, 75);
                    } else { // Lower reputation clubs
                        minOverall = randomValues(45, 60);
                        maxOverall = randomValues(55, 68);
                    }

                    const playerOverall = randomValues(minOverall, maxOverall);
                    const playerPotential = randomValues(playerOverall, Math.min(maxOverall + 10, 99));

                    let baseValue = (playerOverall * 100000) + (playerPotential * 50000);
                    baseValue *= (1 - (Math.abs(playerAge - 24) / 20));
                    baseValue = Math.max(baseValue, 50000);
                    const playerMarketValue = parseFloat(baseValue.toFixed(2));
                    const positionId = playerPositionsForSquad[i];

                    const playerResult = playerInsertStatement.run(
                        playerNationId,
                        positionId,
                        playerFirstName,
                        playerLastName,
                        playerBirthDate.toISOString().split('T')[0],
                        playerOverall,
                        playerPotential,
                        playerMarketValue
                    );
                    const playerId = playerResult.lastInsertRowid as number;
                    fastify.log.info(`Inserted Player: ${playerFirstName} ${playerLastName} (ID: ${playerId}, Overall: ${playerOverall}, Potential: ${playerPotential}) for club ${clubId}`);

                    for (const [attrName, attrInfo] of attributeTypesMap.entries()) {
                        const attributeValue = getAttributeValue(attrName, attrInfo, playerOverall, positionId);
                        playerAttributeInsertStatement.run(playerId, attrInfo.id, attributeValue);
                    }

                    const contractStartDate = currentSeasonStartDate;
                    const contractEndDate = new Date(currentSeasonStart);
                    contractEndDate.setFullYear(contractEndDate.getFullYear() + randomValues(3, 5));

                    let baseSalary = (playerOverall * 1000) + (playerPotential * 500);
                    baseSalary *= (clubReputation / 100);
                    baseSalary = Math.max(baseSalary, 1000);
                    const playerSalary = parseFloat(baseSalary.toFixed(2));

                    contractInsertStatement.run(
                        playerId,
                        clubId,
                        contractStartDate,
                        contractEndDate.toISOString().split('T')[0],
                        playerSalary
                    );
                }
            });

            insertPlayerAndDetails();
        } catch (err: unknown) {
            fastify.log.error(`Error seeding players for club ${clubId}:`, err);
            throw err;
        }
    }
}

export default SeedService;