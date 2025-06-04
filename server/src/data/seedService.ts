import fastify from "../fastify";
import Database from "better-sqlite3";
import { Faker } from "@faker-js/faker";
import FakerUtils from "../utils/fakerUtils";
import { randomValues } from "../utils/utils";
import { StaffAttributeTypeDatabaseInfo } from "../interfaces/staff";
import { SQUAD_POSITION_CONFIG, SQUAD_STAFF_CONFIG } from "./static/squadConfigPositions";
import { ATTRIBUTE_WEIGHTS_BY_POSITION, STAFF_ATTRIBUTE_WEIGHTS_BY_ROLE } from "./static/attributesWeight";
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

function calculateOverall(
    attributes: Map<string, number>,
    positionName: string
): number {
    const weights = ATTRIBUTE_WEIGHTS_BY_POSITION[positionName];
    if (!weights) {
        const allAttrValues = Array.from(attributes.values());
        return Math.round((allAttrValues.reduce((sum, val) => sum + val, 0) / allAttrValues.length) * 4.95) || 1;
    }

    let weightedSum = 0;
    let totalWeight = 0;

    for (const { attrName, weight } of weights) {
        const value = attributes.get(attrName);
        if (value !== undefined) {
            weightedSum += value * weight;
            totalWeight += weight;
        } else {
            console.warn(`Attribute '${attrName}' not found for overall calculation of position '${positionName}'.`);
        }
    }

    if (totalWeight === 0) {
        const allAttrValues = Array.from(attributes.values());
        return Math.round((allAttrValues.reduce((sum, val) => sum + val, 0) / allAttrValues.length) * 4.95) || 1;
    }
    const scaledOverall = (weightedSum / totalWeight) * 4.95;
    return Math.max(1, Math.min(99, Math.round(scaledOverall)));
}

function generatePlayerAttributes(
    positionName: string,
    targetOverall: number,
    attributeTypesMap: Map<string, { id: number, category: string }>
): Map<string, number> {
    const attributes = new Map<string, number>();
    const weights = ATTRIBUTE_WEIGHTS_BY_POSITION[positionName];
    const scaledTargetForAttributes = targetOverall / 4.95;

    for (const [attrName, attrInfo] of attributeTypesMap.entries()) {
        let attributeValue: number;
        const weightEntry = weights ? weights.find(w => w.attrName === attrName) : undefined;
        const isKeyAttribute = weightEntry !== undefined;

        if (attrName === 'Goalkeeping') {
            if (positionName === 'GK') {
                attributeValue = randomValues(Math.max(1, Math.round(scaledTargetForAttributes * 0.9)), Math.min(20, Math.round(scaledTargetForAttributes * 1.1)));
            } else {
                attributeValue = randomValues(1, 5);
            }
        } else if (isKeyAttribute) {
            attributeValue = randomValues(
                Math.max(1, Math.round(scaledTargetForAttributes - 3)),
                Math.min(20, Math.round(scaledTargetForAttributes + 3))
            );
        } else {
            attributeValue = randomValues(1, 8);
            const generalAdjustment = Math.floor((targetOverall - 50) / 10);
            attributeValue = Math.max(1, Math.min(20, attributeValue + generalAdjustment));
        }
        attributes.set(attrName, Math.max(1, Math.min(20, attributeValue)));
    }
    return attributes;
}

function generateStaffAttributes(
    staffRole: string,
    targetQuality: number,
    staffAttributeTypesMap: Map<string, { id: number, category: string }>
): Map<string, number> {
    const attributes = new Map<string, number>();
    const weights = STAFF_ATTRIBUTE_WEIGHTS_BY_ROLE[staffRole];

    const scaledTargetForAttributes = targetQuality / 5;

    for (const [attrName, attrInfo] of staffAttributeTypesMap.entries()) {
        let attributeValue: number;
        const weightEntry = weights ? weights.find(w => w.attrName === attrName) : undefined;
        const isKeyAttribute = weightEntry !== undefined;

        if (isKeyAttribute) {
            attributeValue = randomValues(
                Math.max(1, Math.round(scaledTargetForAttributes - 3)),
                Math.min(20, Math.round(scaledTargetForAttributes + 3))
            );
        } else {
            attributeValue = randomValues(1, 8);
            const generalAdjustment = Math.floor((targetQuality - 50) / 10);
            attributeValue = Math.max(1, Math.min(20, attributeValue + generalAdjustment));
        }
        attributes.set(attrName, Math.max(1, Math.min(20, attributeValue)));
    }
    return attributes;
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

            let playerPositionsForSquad: number[] = [];
            let playerPositionNamesForSquad: string[] = [];

            for (const squadPosition of SQUAD_POSITION_CONFIG) {
                const positionId = playerPositionsMap.get(squadPosition.abbreviation);

                if (positionId !== undefined) {
                    playerPositionsForSquad = playerPositionsForSquad.concat(Array(squadPosition.count).fill(positionId));
                    playerPositionNamesForSquad = playerPositionNamesForSquad.concat(Array(squadPosition.count).fill(squadPosition.abbreviation));
                } else {
                    fastify.log.warn(`Warning: Position abbreviation '${squadPosition.abbreviation}' not found in player_position table. Skipping.`);
                }
            }

            for (let i = playerPositionsForSquad.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [playerPositionsForSquad[i], playerPositionsForSquad[j]] = [playerPositionsForSquad[j], playerPositionsForSquad[i]];
                [playerPositionNamesForSquad[i], playerPositionNamesForSquad[j]] = [playerPositionNamesForSquad[j], playerPositionNamesForSquad[i]];
            }

            const totalPlayers = playerPositionsForSquad.length;
            const localPlayersCount = Math.floor(totalPlayers * 0.6);
            const currentSeasonStart = new Date(currentSeasonStartDate);

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

                    let targetOverallMin: number;
                    let targetOverallMax: number;

                    if (clubReputation >= 90) { // Top clubs
                        targetOverallMin = 78;
                        targetOverallMax = 94;
                    } else if (clubReputation >= 80) { // High reputation clubs
                        targetOverallMin = 70;
                        targetOverallMax = 88;
                    } else if (clubReputation >= 70) { // Mid-table clubs
                        targetOverallMin = 62;
                        targetOverallMax = 80;
                    } else if (clubReputation >= 50) { // Lower-mid table clubs
                        targetOverallMin = 55;
                        targetOverallMax = 72;
                    } else { // Lower reputation clubs
                        targetOverallMin = 50;
                        targetOverallMax = 65;
                    }

                    const playerTargetOverall = randomValues(targetOverallMin, targetOverallMax);

                    const positionId = playerPositionsForSquad[i];
                    const positionName = playerPositionNamesForSquad[i];

                    const generatedAttributes = generatePlayerAttributes(
                        positionName,
                        playerTargetOverall,
                        attributeTypesMap
                    );

                    const playerOverall = calculateOverall(generatedAttributes, positionName);

                    let playerPotential: number;

                    if (playerAge <= 19) {
                        playerPotential = randomValues(playerOverall + 8, Math.min(playerOverall + 20, 99));
                    } else if (playerAge <= 23) {
                        playerPotential = randomValues(playerOverall + 3, Math.min(playerOverall + 10, 99));
                    } else if (playerAge <= 27) {
                        playerPotential = randomValues(playerOverall, Math.min(playerOverall + 5, 99));
                    } else if (playerAge <= 30) {
                        playerPotential = randomValues(Math.max(playerOverall - 3, 1), playerOverall + 2);
                    } else {
                        playerPotential = randomValues(Math.max(playerOverall - 8, 1), playerOverall);
                    }

                    playerPotential = Math.max(playerOverall, playerPotential);

                    let marketValue = Math.pow(playerOverall, 2) * 1000;
                    marketValue += Math.pow(playerPotential - playerOverall, 2) * 5000

                    const ageFactor = 1 - (Math.abs(playerAge - 26) / 26);
                    marketValue *= Math.max(0.2, ageFactor);

                    marketValue *= (1 + (clubReputation / 1000));

                    marketValue = Math.max(marketValue, 50000);
                    const playerMarketValue = parseFloat(marketValue.toFixed(2));

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
                    //fastify.log.info(`Inserted Player: ${playerFirstName} ${playerLastName} (ID: ${playerId}, Overall: ${playerOverall}, Potential: ${playerPotential}) for club ${clubId}`);

                    for (const [attrName, attrValue] of generatedAttributes.entries()) {
                        const attrInfo = attributeTypesMap.get(attrName);
                        if (attrInfo) {
                            playerAttributeInsertStatement.run(playerId, attrInfo.id, attrValue);
                        }
                    }

                    const contractStartDate = currentSeasonStartDate;
                    const contractEndDate = new Date(currentSeasonStart);
                    contractEndDate.setFullYear(contractEndDate.getFullYear() + randomValues(3, 5));

                    let salary = (playerOverall * 500) + (playerPotential * 200);
                    salary *= (1 + (clubReputation / 1000));

                    const salaryAgeFactor = 1 - (Math.abs(playerAge - 28) / 28);
                    salary *= Math.max(0.5, salaryAgeFactor);

                    salary = Math.max(salary, 1000);
                    const playerSalary = parseFloat(salary.toFixed(2));

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

    public static seedStaff(
        databaseInstance: Database.Database,
        clubId: number,
        nationId: number,
        clubReputation: number,
        currentSeasonStartDate: string,
    ) {
        try {
            const staffInsertStatement = databaseInstance.prepare(
                `INSERT INTO staff (nation_id, first_name, last_name, birth_date, function_id, tactical_style_id)
                VALUES (?, ?, ?, ?, ?, ?)`
            );

            const staffContractInsertStatement = databaseInstance.prepare(
                `INSERT INTO staff_contract (staff_id, club_id, start_date, end_date, salary) 
                VALUES (?, ?, ?, ?, ?)`
            );

            const staffAttributeInsertStatement = databaseInstance.prepare(
                `INSERT INTO staff_attribute (staff_id, staff_attribute_type_id, value)
                VALUES (?, ?, ?)`
            );

            const staffAttributeTypesMap = new Map<string, { id: number, category: string }>();
            const staffAttributeTypesDb = databaseInstance.prepare("SELECT id, name, category FROM staff_attribute_type").all() as StaffAttributeTypeDatabaseInfo[];

            for (const attr of staffAttributeTypesDb) {
                staffAttributeTypesMap.set(attr.name, { id: attr.id, category: attr.category });
            }

            const staffFunctionTypeMap = new Map<string, number>();
            const staffFunctionTypesDb = databaseInstance.prepare("SELECT id, name FROM staff_function_type").all() as { id: number, name: string }[];
            for (const func of staffFunctionTypesDb) {
                staffFunctionTypeMap.set(func.name, func.id);
            }

            const tacticalStyleTypeMap = new Map<string, number>();
            const tacticalStyleTypesDb = databaseInstance.prepare("SELECT id, name FROM tactical_style_type").all() as { id: number, name: string }[];
            for (const style of tacticalStyleTypesDb) {
                tacticalStyleTypeMap.set(style.name, style.id);
            }

            const localNationInfo = databaseInstance.prepare("SELECT name FROM nation WHERE id = ?").get(nationId) as { name: string };
            const localFaker = FakerUtils.getFakerByNation(localNationInfo.name);

            const foreignNationsDb = databaseInstance.prepare("SELECT id, name FROM nation WHERE id != ?").all(nationId) as NationDatabaseInfo[];

            const currentSeasonStart = new Date(currentSeasonStartDate);

            const insertStaffAndDetails = databaseInstance.transaction(() => {
                for (const staffConfig of SQUAD_STAFF_CONFIG) {
                    for (let i = 0; i < staffConfig.count; i++) {
                        const tacticalStyleIds = Array.from(tacticalStyleTypeMap.values());
                        const tacticalStyleId = tacticalStyleIds[Math.floor(Math.random() * tacticalStyleIds.length)];

                        let fakerInstance: Faker;
                        let staffNationId: number;

                        if (Math.random() < 0.6 || foreignNationsDb.length === 0) {
                            staffNationId = nationId;
                            fakerInstance = localFaker;
                        } else {
                            const randomNation = foreignNationsDb[Math.floor(Math.random() * foreignNationsDb.length)];
                            staffNationId = randomNation.id;
                            fakerInstance = FakerUtils.getFakerByNation(randomNation.name);
                        }

                        const staffFirstName = fakerInstance.person.firstName("male");
                        const staffLastName = fakerInstance.person.lastName("male");
                        const staffBirthDate = getRandomBirthDate(fakerInstance, staffConfig.minAge, staffConfig.maxAge, currentSeasonStart);
                        const staffAge = calculateAge(staffBirthDate, currentSeasonStart);

                        let staffTacticalStyle: number | null = null;
                        if (staffConfig.role === 'Manager') {
                            staffTacticalStyle = randomValues(1, 5);
                        }

                        let targetQualityMin: number;
                        let targetQualityMax: number;

                        if (clubReputation >= 90) { // Top clubs
                            targetQualityMin = 75;
                            targetQualityMax = 92;
                        } else if (clubReputation >= 80) { // High reputation clubs
                            targetQualityMin = 68;
                            targetQualityMax = 88;
                        } else if (clubReputation >= 70) { // Mid-table clubs
                            targetQualityMin = 60;
                            targetQualityMax = 82;
                        } else if (clubReputation >= 50) { // Lower-mid table clubs
                            targetQualityMin = 55;
                            targetQualityMax = 75;
                        } else { // Lower reputation clubs
                            targetQualityMin = 45;
                            targetQualityMax = 68;
                        }

                        const staffTargetQuality = randomValues(targetQualityMin, targetQualityMax);

                        const generatedStaffAttributes = generateStaffAttributes(
                            staffConfig.role,
                            staffTargetQuality,
                            staffAttributeTypesMap
                        );

                        const functionId = staffFunctionTypeMap.get(staffConfig.role);
                        if (!functionId) {
                            throw new Error(`Staff function type '${staffConfig.role}' not found in staff_function_type table.`);
                        }

                        const staffResult = staffInsertStatement.run(
                            staffNationId,
                            staffFirstName,
                            staffLastName,
                            staffBirthDate.toISOString().split('T')[0],
                            functionId,
                            tacticalStyleId
                        );
                        const staffId = staffResult.lastInsertRowid as number;
                        //fastify.log.info(`Inserted Staff: ${staffFirstName} ${staffLastName} (ID: ${staffId}, Role: ${staffConfig.role}) for club ${clubId}`);

                        for (const [attrName, attrValue] of generatedStaffAttributes.entries()) {
                            const attrInfo = staffAttributeTypesMap.get(attrName);
                            if (attrInfo) {
                                staffAttributeInsertStatement.run(staffId, attrInfo.id, attrValue);
                            }
                        }

                        const contractStartDate = currentSeasonStartDate;
                        const contractEndDate = new Date(currentSeasonStart);
                        contractEndDate.setFullYear(contractEndDate.getFullYear() + randomValues(2, 4));

                        let staffSalary = staffTargetQuality * 800;
                        staffSalary *= (1 + (clubReputation / 150));

                        if (staffAge > 40) {
                            staffSalary *= 1.2;
                        } else if (staffAge < 30) {
                            staffSalary *= 0.8;
                        }

                        staffSalary = Math.max(staffSalary, 2000);
                        const staffFinalSalary = parseFloat(staffSalary.toFixed(2));

                        staffContractInsertStatement.run(
                            staffId,
                            clubId,
                            contractStartDate,
                            contractEndDate.toISOString().split('T')[0],
                            staffFinalSalary
                        );
                    }
                }
            });

            insertStaffAndDetails();
        } catch (err: unknown) {
            fastify.log.error(`Error seeding staff for club ${clubId}:`, err);
            throw err;
        }
    }
}

export default SeedService;