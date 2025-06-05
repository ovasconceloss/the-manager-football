export interface PlayerPositionDatabaseInfo {
    id: number;
    name: string; // Ex: 'GK', 'CB', 'ST'
}

export interface AttributeTypeDatabaseInfo {
    id: number;
    name: string; // Ex: 'Finishing', 'Pace'
    category: string; // Ex: 'technical', 'physical'
}

export interface NationDatabaseInfo {
    id: number;
    name: string;
}

export interface PlayerLineupInfo {
    id: number; // player_id
    overall: number;
    position_name: string;
    attributes: Map<string, number>; // Map<attributeName, value>
}

export interface PlayerMatchStatsInput {
    player_id: number;
    club_id: number;
    match_id: number;
    rating: number;
    goals: number;
    assists: number;
    defenses: number;
    passes: number;
    interceptions: number;
    is_motm: number; // 0 or 1
}