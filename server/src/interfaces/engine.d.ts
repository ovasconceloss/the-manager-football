export interface PlayerData {
    id: number;
    overall: number;
    position_id: number;
    first_name: string;
    last_name: string;
    birth_date: string;
    potential: number;
    market_value: number;
    nation_id: number;
}

export interface PlayerAttributeData {
    player_id: number;
    attribute_type_id: number;
    value: number;
}

export interface AttributeTypeData {
    id: number;
    name: string;
    category: string;
}

export interface PlayerPositionData {
    id: number;
    name: string;
}

export interface ClubData {
    id: number;
    name: string;
    abbreviation: string;
    nation_id: number;
    city_id: number;
    stadium_id: number;
    reputation: number;
    foundation_year: number;
}

export interface PreloadedEngineData {
    players: Map<number, PlayerData>; // Map<player_id, PlayerData>
    playerContracts: Map<number, { club_id: number, player_id: number }[]>; // Map<club_id, PlayerContract[]>
    playerAttributes: Map<number, Map<string, number>>; // Map<player_id, Map<attribute_name, value>>
    attributeTypes: Map<number, string>; // Map<attribute_type_id, attribute_name>
    playerPositions: Map<number, string>; // Map<position_id, position_name>
    clubs: Map<number, ClubData>; // Map<club_id, ClubData>
    matchLineups: Map<number, Map<number, { // Map<match_id, Map<club_id, PlayerLineupEntry[]>>
        player_id: number;
        position_played_id: number;
        is_starter: number;
        is_captain: number;
    }[]>>;
}

export interface SimulatedMatchResult {
    matchId: number;
    home_score: number;
    away_score: number;
    motmPlayerIds: number[];
    playerStats: PlayerMatchStatsInput[];
    matchLogText: string;
    competition_id: number;
    season_id: number;
    leg_number: number;
    home_club_id: number;
    away_club_id: number;
    home_name: string;
    away_name: string;
}

export interface GameLoopResult {
    played: number;
    newDate: string;
}

export interface PlayerMatchStatsInput {
    player_id: number;
    club_id: number;
    match_id: number;
    rating: number;
    goals: number;
    assists: number;
    defenses: number;
    // passes: number;
    // interceptions: number;
    is_motm: number; // 0 ou 1
    // shots: number;
    // shots_on_target: number;
    // tackles_won: number;
    // fouls_committed: number;
    // yellow_cards: number;
    // red_cards: number;
}

export interface MatchEventInput {
    match_id: number;
    event_time: number;
    event_type: string;
    player_id: number | null;
    club_id: number | null;
    details: string | null;
}

export interface MatchDbInfo {
    id: number;
    home_club_id: number;
    away_club_id: number;
    home_name: string;
    away_name: string;
    competition_id: number;
    season_id: number;
    stage_id: number;
    leg_number: number;
}

export interface PlayerLineupInfo {
    id: number; // player_id
    overall: number;
    position: string;
}