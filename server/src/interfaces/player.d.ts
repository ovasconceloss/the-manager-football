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