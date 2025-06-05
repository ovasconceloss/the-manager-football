export interface MatchDbInfo {
    id: number;
    home_score: number,
    away_score: number,
    home_club_id: number;
    away_club_id: number;
    home_name: string;
    away_name: string;
    competition_id: number;
    season_id: number;
    leg_number: number; // match-day
}