export interface LeagueStandingData {
    competition_id: number;
    season_id: number;
    club_id: number;
    match_day: number;
    position: number;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
}