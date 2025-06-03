PRAGMA foreign_keys = ON;

-- table: confederation
CREATE TABLE confederation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  continent TEXT NOT NULL CHECK(continent IN ('europe', 'south_america', 'africa', 'asia', 'north_america', 'oceania')),
  foundation_year INTEGER NOT NULL,
  confederation_image BLOB NOT NULL
);

-- confederation indexes
CREATE INDEX confederation_name_index ON confederation (name);
CREATE INDEX confederation_continent_index ON confederation (continent);

-- table: nation
CREATE TABLE nation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  reputation INTEGER NOT NULL,
  flag_image BLOB NOT NULL,
  federation_name TEXT NOT NULL,
  federation_image BLOB NOT NULL,
  confederation_id INTEGER NOT NULL,
  FOREIGN KEY (confederation_id) REFERENCES confederation(id)
);

-- nation indexes
CREATE INDEX nation_name_index ON nation (name);
CREATE INDEX nation_federation_name_index ON nation (federation_name);
CREATE INDEX nation_confederation_id_index ON nation (confederation_id);

-- table: city
CREATE TABLE city (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (nation_id) REFERENCES nation(id)
);

-- city index
CREATE INDEX city_nation_id_index ON city (nation_id);

-- table: stadium
CREATE TABLE stadium (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  FOREIGN KEY (nation_id) REFERENCES nation(id)
);

-- stadium index
CREATE INDEX stadium_nation_id_index ON stadium (nation_id);

-- table: club
CREATE TABLE club (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  city_id INTEGER NOT NULL,
  stadium_id INTEGER NOT NULL,
  reputation INTEGER NOT NULL,
  foundation_year INTEGER NOT NULL,
  logo_image BLOB NOT NULL,
  FOREIGN KEY (nation_id) REFERENCES nation(id),
  FOREIGN KEY (city_id) REFERENCES city(id),
  FOREIGN KEY (stadium_id) REFERENCES stadium(id)
);

-- club indexes
CREATE INDEX club_nation_id_index ON club (nation_id);
CREATE INDEX club_city_id_index ON club (city_id);
CREATE INDEX club_stadium_id_index ON club (stadium_id);

-- table: competition
CREATE TABLE competition (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('league', 'cup', 'combination')),
  reputation INTEGER NOT NULL,
  nation_id INTEGER NULL,
  confederation_id INTEGER NULL,
  has_group_stage INTEGER NOT NULL DEFAULT 0
  has_knockout_stage INTEGER NOT NULL DEFAULT 0,
  knockout_legs TEXT NOT NULL CHECK(knockout_legs IN ('single_leg', 'two_legs')),
  competition_logo BLOB NOT NULL,
  FOREIGN KEY (nation_id) REFERENCES nation(id),
  FOREIGN KEY (confederation_id) REFERENCES confederation(id)
);

-- competition indexes
CREATE INDEX competition_name_idx ON competition (name);
CREATE INDEX competition_nation_id_idx ON competition (nation_id);
CREATE INDEX competition_confederation_id_idx ON competition (confederation_id);

-- table: season
CREATE TABLE season (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('in_progress', 'finished'))
);

CREATE TABLE competition_season (
  competition_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  PRIMARY KEY (competition_id, season_id),
  FOREIGN KEY (competition_id) REFERENCES competition(id),
  FOREIGN KEY (season_id) REFERENCES season(id)
);

-- competition_season indexes
CREATE INDEX competition_season_competition_id_idx ON competition_season (competition_id);
CREATE INDEX competition_season_season_id_idx ON competition_season (season_id);

-- table: competition_stage
CREATE TABLE competition_stage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_id INTEGER NOT NULL,
  name TEXT NOT NULL CHECK(name IN ('group_stage', 'round_of_16', 'quarter_finals', 'semi_finals', 'final')),
  stage_order INTEGER NOT NULL,
  stage_type TEXT NOT NULL CHECK(stage_type IN ('league', 'knockout', 'playoff')),
  number_of_legs TEXT NOT NULL CHECK(number_of_legs IN ('single_leg', 'two_legs')),
  is_current INTEGER NOT NULL DEFAULT 0,
  competition_season_id INTEGER NOT NULL,
  FOREIGN KEY (competition_id) REFERENCES competition(id),
  FOREIGN KEY (competition_season_id) REFERENCES competition_season(competition_id, season_id)
);

-- competition_stage indexes
CREATE INDEX competition_stage_competition_id_idx ON competition_stage (competition_id);
CREATE INDEX competition_stage_competition_season_id_idx ON competition_stage (competition_season_id);

-- table: competition_group
CREATE TABLE competition_group (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  FOREIGN KEY (stage_id) REFERENCES competition_stage(id)
);

-- competition_group indexes
CREATE INDEX competition_group_stage_id_idx ON competition_group (stage_id);

-- table: group_club
CREATE TABLE group_club (
  group_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  PRIMARY KEY (group_id, club_id),
  FOREIGN KEY (group_id) REFERENCES competition_group(id),
  FOREIGN KEY (club_id) REFERENCES club(id)
);

-- group_club indexes
CREATE INDEX group_club_group_id_idx ON group_club (group_id);
CREATE INDEX group_club_club_id_idx ON group_club (club_id);

-- table: match
CREATE TABLE match (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stage_id INTEGER NOT NULL,
  home_club_id INTEGER NOT NULL,
  away_club_id INTEGER NOT NULL,
  home_score INTEGER NOT NULL,
  away_score INTEGER NOT NULL,
  match_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('scheduled', 'played', 'postponed')),
  leg_number INTEGER NOT NULL,
  competition_season_id INTEGER NOT NULL,
  FOREIGN KEY (stage_id) REFERENCES competition_stage(id),
  FOREIGN KEY (home_club_id) REFERENCES club(id),
  FOREIGN KEY (away_club_id) REFERENCES club(id),
  FOREIGN KEY (competition_season_id) REFERENCES competition_season(competition_id, season_id)
);

-- match indexes
CREATE INDEX match_stage_id_idx ON match (stage_id);
CREATE INDEX match_home_club_id_idx ON match (home_club_id);
CREATE INDEX match_away_club_id_idx ON match (away_club_id);
CREATE INDEX match_competition_season_id_idx ON match (competition_season_id);

-- table: player_position
CREATE TABLE player_position (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

-- player_position index
CREATE INDEX player_position_name_index ON player_position (name);

-- table: player
CREATE TABLE player (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL,
  position_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  overall INTEGER NOT NULL,
  potential INTEGER NOT NULL,
  market_value REAL NOT NULL,
  FOREIGN KEY (nation_id) REFERENCES nation(id),
  FOREIGN KEY (position_id) REFERENCES player_position(id)
);

-- player indexes
CREATE INDEX player_first_name_index ON player (first_name);
CREATE INDEX player_last_name_index ON player (last_name);
CREATE INDEX player_nation_id_index ON player (nation_id);
CREATE INDEX player_position_id_index ON player (position_id);

-- table: player_contract
CREATE TABLE player_contract (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL, 
  salary REAL NOT NULL,
  UNIQUE (player_id, club_id, start_date),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (club_id) REFERENCES club(id)
)

-- player_contract indexes
CREATE INDEX player_contract_player_id_index ON player_contract (player_id);
CREATE INDEX player_contract_club_id_index ON player_contract (club_id);
CREATE INDEX player_contract_start_date_index ON player_contract (start_date);

-- table: player_match_stats
CREATE TABLE player_match_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  match_id INTEGER NOT NULL,
  rating REAL NOT NULL,
  goals INTEGER NOT NULL,
  assists INTEGER NOT NULL,
  defenses INTEGER NOT NULL,
  passes INTEGER NOT NULL,
  interceptions INTEGER NOT NULL,
  is_motm INTEGER NOT NULL DEFAULT 0,
  UNIQUE (player_id, match_id),
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (match_id) REFERENCES match(id)
);

-- player_match_stats indexes
CREATE INDEX player_match_stats_player_id_index ON player_match_stats (player_id);
CREATE INDEX player_match_stats_match_id_index ON player_match_stats (match_id);
CREATE INDEX player_match_stats_club_id_index ON player_match_stats (club_id);

-- table: attribute_type
CREATE TABLE attribute_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK(category IN ('technical', 'physical', 'mental', 'goalkeeper'))
);

-- attribute_type indexes
CREATE INDEX attribute_type_name_index ON attribute_type (name);
CREATE INDEX attribute_type_category_index ON attribute_type (category);

-- table: player_attribute
CREATE TABLE player_attribute (
  player_id INTEGER NOT NULL,
  attribute_type_id INTEGER NOT NULL,
  value INTEGER NOT NULL,
  PRIMARY KEY (player_id, attribute_type_id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (attribute_type_id) REFERENCES attribute_type(id)
);

-- player_attribute indexes
CREATE INDEX player_attribute_player_id_index ON player_attribute (player_id);
CREATE INDEX player_attribute_attribute_type_id_index ON player_attribute (attribute_type_id);
CREATE INDEX player_attribute_date_recorded_index ON player_attribute (date_recorded);

-- table: match_lineup
CREATE TABLE match_lineup (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  is_starter INTEGER NOT NULL DEFAULT 0,
  position_played_id INTEGER NULL,
  jersey_number INTEGER NULL,
  is_captain INTEGER NOT NULL DEFAULT 0,
  UNIQUE (match_id, club_id, player_id),
  FOREIGN KEY (match_id) REFERENCES match(id),
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (position_played_id) REFERENCES player_position(id)
);

-- match_lineup indexes
CREATE INDEX idx_match_lineup_match_id ON match_lineup (match_id);
CREATE INDEX idx_match_lineup_club_id ON match_lineup (club_id);
CREATE INDEX idx_match_lineup_player_id ON match_lineup (player_id);
CREATE INDEX idx_match_lineup_position_played_id ON match_lineup (position_played_id);

-- table: match_event
CREATE TABLE match_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  match_id INTEGER NOT NULL,
  event_time INTEGER NOT NULL,
  event_type TEXT NOT NULL, 
  player_id INTEGER NULL,
  club_id INTEGER NULL,
  details TEXT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,  
  FOREIGN KEY (match_id) REFERENCES match(id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (club_id) REFERENCES club(id)
);

-- match_event indexes
CREATE INDEX idx_match_event_match_id ON match_event (match_id);
CREATE INDEX idx_match_event_event_type ON match_event (event_type);
CREATE INDEX idx_match_event_player_id ON match_event (player_id);
CREATE INDEX idx_match_event_club_id ON match_event (club_id);


-- table: staff_function_type
CREATE TABLE staff_function_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

-- staff_function_type index
CREATE INDEX idx_staff_function_type_name ON staff_function_type (name);

-- table: tactical_function_type
CREATE TABLE tactical_style_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL 
);

-- tactical_function_type index
CREATE INDEX idx_tactical_style_type_name ON tactical_style_type (name);

-- table: staff
CREATE TABLE staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nation_id INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  function_id INTEGER NOT NULL,
  tactical_style_id INTEGER NOT NULL,
  is_user INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (nation_id) REFERENCES nation(id),
  FOREIGN KEY (function_id) REFERENCES staff_function_type(id),
  FOREIGN KEY (tactical_style_id) REFERENCES tactical_style_type(id)
);

-- staff indexes
CREATE INDEX idx_staff_nation_id ON staff (nation_id);
CREATE INDEX idx_staff_function_id ON staff (function_id);
CREATE INDEX idx_staff_tactical_style_id ON staff (tactical_style_id);
CREATE INDEX idx_staff_name ON staff (last_name, first_name);

-- table: staff_contract
CREATE TABLE staff_contract (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  salary REAL NOT NULL,
  UNIQUE (staff_id, club_id, start_date),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (club_id) REFERENCES club(id)
)

-- staff_contract indexes
CREATE INDEX idx_staff_contract_staff_id ON staff_contract (staff_id);
CREATE INDEX idx_staff_contract_club_id ON staff_contract (club_id);
CREATE INDEX idx_staff_contract_start_date ON staff_contract (start_date);

-- table: transaction_type
CREATE TABLE transaction_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(name IN ('Revenue', 'Expense'))
);

-- transaction_type indexes
CREATE INDEX idx_transaction_type_name ON transaction_type (name);

-- table: transaction_category
CREATE TABLE transaction_category (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  transaction_type_id INTEGER NOT NULL,
  FOREIGN KEY (transaction_type_id) REFERENCES transaction_type(id)
);

-- transaction_category indexes
CREATE INDEX idx_transaction_category_name ON transaction_category (name);
CREATE INDEX idx_transaction_category_type_id ON transaction_category (transaction_type_id);

-- table: financial_transaction
CREATE TABLE financial_transaction (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  transaction_category_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  transaction_date TEXT NOT NULL,
  description TEXT NULL,
  related_player_id INTEGER NULL, -- FK for player (e.g. player sale/purchase, player 
  related_staff_id INTEGER NULL,  -- FK for staff (e.g. staff salary)
  related_match_id INTEGER NULL,  -- FK for match (e.g. match ticket revenue)
  related_club_id INTEGER NULL,   -- FK for club (e.g. transfers between clubs)
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (transaction_category_id) REFERENCES transaction_category(id),
  FOREIGN KEY (related_player_id) REFERENCES player(id),
  FOREIGN KEY (related_staff_id) REFERENCES staff(id),
  FOREIGN KEY (related_match_id) REFERENCES match(id),
  FOREIGN KEY (related_club_id) REFERENCES club(id)
);

-- financial_transaction indexes
CREATE INDEX idx_financial_transaction_club_id ON financial_transaction (club_id);
CREATE INDEX idx_financial_transaction_category_id ON financial_transaction (transaction_category_id);
CREATE INDEX idx_financial_transaction_date ON financial_transaction (transaction_date);
CREATE INDEX idx_financial_transaction_player_id ON financial_transaction (related_player_id);
CREATE INDEX idx_financial_transaction_staff_id ON financial_transaction (related_staff_id);
CREATE INDEX idx_financial_transaction_match_id ON financial_transaction (related_match_id);

-- table: club_finance_summary
CREATE TABLE club_finance_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL UNIQUE,
  current_balance REAL NOT NULL DEFAULT 0.0,
  transfer_budget_available REAL NOT NULL DEFAULT 0.0,
  salary_budget_available REAL NOT NULL DEFAULT 0.0,
  last_updated_date TEXT NOT NULL DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now')),
  FOREIGN KEY (club_id) REFERENCES club(id)
);

-- club_finance_summary index
CREATE INDEX idx_club_finance_summary_club_id ON club_finance_summary (club_id);

-- table: club_budget
CREATE TABLE club_budget (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  transfer_budget_allocated REAL NOT NULL DEFAULT 0.0,
  salary_budget_allocated REAL NOT NULL DEFAULT 0.0,
  initial_cash_balance REAL NOT NULL DEFAULT 0.0,
  UNIQUE (club_id, season_id)
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (season_id) REFERENCES season(id)
);

-- club_budget indexes
CREATE INDEX idx_club_budget_club_id ON club_budget (club_id);
CREATE INDEX idx_club_budget_season_id ON club_budget (season_id);

-- table: transfer_type
CREATE TABLE transfer_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK(name IN ('Permanent', 'Loan', 'Free Transfer', 'Retirement', 'Release'))
);

-- transfer_type index
CREATE INDEX idx_transfer_type_name ON transfer_type (name);

-- table: transfer
CREATE TABLE transfer (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  club_from_id INTEGER NULL,
  club_to_id INTEGER NULL,
  transfer_type_id INTEGER NOT NULL,
  transfer_fee REAL NOT NULL DEFAULT 0.0,
  agent_fee REAL NOT NULL DEFAULT 0.0,
  signing_bonus REAL NOT NULL DEFAULT 0.0,
  transfer_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('Pending', 'Completed', 'Failed')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (club_from_id) REFERENCES club(id),
  FOREIGN KEY (club_to_id) REFERENCES club(id),
  FOREIGN KEY (transfer_type_id) REFERENCES transfer_type(id)
);

-- transfer indexes
CREATE INDEX idx_transfer_player_id ON transfer (player_id);
CREATE INDEX idx_transfer_club_from_id ON transfer (club_from_id);
CREATE INDEX idx_transfer_club_to_id ON transfer (club_to_id);
CREATE INDEX idx_transfer_type_id ON transfer (transfer_type_id);
CREATE INDEX idx_transfer_date ON transfer (transfer_date);

-- table: loan_details
CREATE TABLE loan_details (
  transfer_id INTEGER PRIMARY KEY,
  loan_start_date TEXT NOT NULL,
  loan_end_date TEXT NOT NULL,
  loan_fee REAL NOT NULL DEFAULT 0.0,
  wage_contribution_percentage REAL NOT NULL DEFAULT 0.0,
  option_to_buy_fee REAL NULL,
  is_mandatory_buy_option INTEGER NOT NULL DEFAULT 0, 
  FOREIGN KEY (transfer_id) REFERENCES transfer(id)
);

-- loan_details indexes
CREATE INDEX idx_loan_details_start_date ON loan_details (loan_start_date);
CREATE INDEX idx_loan_details_end_date ON loan_details (loan_end_date);

-- table: staff_attribute_type
CREATE TABLE staff_attribute_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT
);

-- staff_attribute_type indexes
CREATE INDEX idx_staff_attribute_type_name ON staff_attribute_type (name);
CREATE INDEX idx_staff_attribute_type_category ON staff_attribute_type (category);

-- table: staff_attribute
CREATE TABLE staff_attribute (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  staff_id INTEGER NOT NULL,
  staff_attribute_type_id INTEGER NOT NULL,
  value INTEGER NOT NULL,
  UNIQUE (staff_id, staff_attribute_type_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id),
  FOREIGN KEY (staff_attribute_type_id) REFERENCES staff_attribute_type(id)
);

-- staff_attribute indexes
CREATE INDEX idx_staff_attribute_staff_id ON staff_attribute (staff_id);
CREATE INDEX idx_staff_attribute_type_id ON staff_attribute (staff_attribute_type_id);
CREATE INDEX idx_staff_attribute_date_recorded ON staff_attribute (date_recorded);

-- table: formation
CREATE TABLE formation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  formation_string TEXT NOT NULL
);

-- formation index
CREATE INDEX idx_formation_name ON formation (name);

-- table: formation_position
CREATE TABLE formation_position (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  formation_id INTEGER NOT NULL,
  player_position_id INTEGER NOT NULL,
  x_coord INTEGER NULL,
  y_coord INTEGER NULL,
  position_order INTEGER NULL,
  FOREIGN KEY (formation_id) REFERENCES formation(id),
  FOREIGN KEY (player_position_id) REFERENCES player_position(id)
);

-- formation_position indexes
CREATE INDEX idx_formation_position_formation_id ON formation_position (formation_id);
CREATE INDEX idx_formation_position_player_position_id ON formation_position (player_position_id);

-- Insertion example for a 4-4-2 formation (simplified)
-- INSERT INTO formation_position (formation_id, player_position_id, x_coord, y_coord) VALUES
-- ((SELECT id FROM formation WHERE name = '4-4-2 Flat'), (SELECT id FROM player_position WHERE name = 'Goleiro'), 1, 1),
-- ((SELECT id FROM formation WHERE name = '4-4-2 Flat'), (SELECT id FROM player_position WHERE name = 'Lateral Direito'), 2, 1),

-- table: league_standing
CREATE TABLE league_standing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  competition_season_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  match_day INTEGER NOT NULL,
  position INTEGER NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  UNIQUE (competition_season_id, club_id, match_day),
  FOREIGN KEY (competition_season_id) REFERENCES competition_season(competition_id, season_id),
  FOREIGN KEY (club_id) REFERENCES club(id)
);

-- league_standing indexes
CREATE INDEX idx_league_standing_competition_season_id ON league_standing (competition_season_id);
CREATE INDEX idx_league_standing_club_id ON league_standing (club_id);
CREATE INDEX idx_league_standing_match_day ON league_standing (match_day);

-- table: club_trophy
CREATE TABLE club_trophy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  date_won TEXT NOT NULL,
  UNIQUE (club_id, competition_id, season_id),
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (competition_id) REFERENCES competition(id),
  FOREIGN KEY (season_id) REFERENCES season(id)
);

-- club_trophy indexes
CREATE INDEX idx_club_trophy_club_id ON club_trophy (club_id);
CREATE INDEX idx_club_trophy_competition_id ON club_trophy (competition_id);
CREATE INDEX idx_club_trophy_season_id ON club_trophy (season_id);

-- table: individual_award_type
CREATE TABLE individual_award_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  category TEXT NOT NULL CHECK(category IN ('Player', 'Goalkeeper', 'Manager', 'Team Selection')), 
  is_competition_specific INTEGER NOT NULL DEFAULT 0
);

-- individual_award_type indexes
CREATE INDEX idx_individual_award_type_name ON individual_award_type (name);
CREATE INDEX idx_individual_award_type_category ON individual_award_type (category);

-- table: player_award
CREATE TABLE player_award (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  individual_award_type_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  competition_id INTEGER NULL,
  award_date TEXT NOT NULL,
  UNIQUE (player_id, individual_award_type_id, season_id, competition_id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (individual_award_type_id) REFERENCES individual_award_type(id),
  FOREIGN KEY (season_id) REFERENCES season(id),
  FOREIGN KEY (competition_id) REFERENCES competition(id)
);

-- player_award indexes
CREATE INDEX idx_player_award_player_id ON player_award (player_id);
CREATE INDEX idx_player_award_award_type_id ON player_award (individual_award_type_id);
CREATE INDEX idx_player_award_season_id ON player_award (season_id);
CREATE INDEX idx_player_award_competition_id ON player_award (competition_id);

-- table: team_of_the_year_instance
CREATE TABLE team_of_the_year_instance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  individual_award_type_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  competition_id INTEGER NULL,
  award_date TEXT NOT NULL,
  name TEXT NULL,
  UNIQUE (individual_award_type_id, season_id, competition_id),
  FOREIGN KEY (individual_award_type_id) REFERENCES individual_award_type(id),
  FOREIGN KEY (season_id) REFERENCES season(id),
  FOREIGN KEY (competition_id) REFERENCES competition(id)
);

-- team_of_the_year_instance indexes
CREATE INDEX idx_toty_instance_award_type_id ON team_of_the_year_instance (individual_award_type_id);
CREATE INDEX idx_toty_instance_season_id ON team_of_the_year_instance (season_id);

-- table: team_of_the_year_selection
CREATE TABLE team_of_the_year_selection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_of_the_year_instance_id INTEGER NOT NULL,
  player_id INTEGER NOT NULL,
  player_position_id INTEGER NOT NULL,
  UNIQUE (team_of_the_year_instance_id, player_id, player_position_id),
  FOREIGN KEY (team_of_the_year_instance_id) REFERENCES team_of_the_year_instance(id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (player_position_id) REFERENCES player_position(id)
);

-- team_of_the_year_selection indexes
CREATE INDEX idx_toty_selection_instance_id ON team_of_the_year_selection (team_of_the_year_instance_id);
CREATE INDEX idx_toty_selection_player_id ON team_of_the_year_selection (player_id);
CREATE INDEX idx_toty_selection_position_id ON team_of_the_year_selection (player_position_id);

-- table: transfer_window_type
CREATE TABLE transfer_window_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE -- Ex: 'Summer', 'Winter', 'Emergency'
);

-- table: transfer_window
CREATE TABLE transfer_window (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  season_id INTEGER NOT NULL, 
  transfer_window_type_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  UNIQUE (season_id, transfer_window_type_id, start_date), 
  FOREIGN KEY (season_id) REFERENCES season(id)
);

-- transfer_window indexes
CREATE INDEX idx_transfer_window_season_id ON transfer_window (season_id);
CREATE INDEX idx_transfer_window_type_id ON transfer_window (transfer_window_type_id);
CREATE INDEX idx_transfer_window_start_date ON transfer_window (start_date);
CREATE INDEX idx_transfer_window_end_date ON transfer_window (end_date);

-- table: player_season_stats
CREATE TABLE player_season_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  club_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  competition_id INTEGER NULL,
  competition_season_id INTEGER NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  average_rating REAL NULL,
  UNIQUE (player_id, club_id, season_id, competition_id),
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (season_id) REFERENCES season(id),
  FOREIGN KEY (competition_id) REFERENCES competition(id)
);

-- player_season_stats indexes
CREATE INDEX idx_player_season_stats_player_id ON player_season_stats (player_id);
CREATE INDEX idx_player_season_stats_club_id ON player_season_stats (club_id);
CREATE INDEX idx_player_season_stats_season_id ON player_season_stats (season_id);

-- table: club_season_stats
CREATE TABLE club_season_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL,
  season_id INTEGER NOT NULL,
  competition_id INTEGER NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  UNIQUE (club_id, season_id, competition_id),
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (season_id) REFERENCES season(id),
  FOREIGN KEY (competition_id) REFERENCES competition(id)
);

-- club_season_stats indexes
CREATE INDEX idx_club_season_stats_club_id ON club_season_stats (club_id);
CREATE INDEX idx_club_season_stats_season_id ON club_season_stats (season_id);
CREATE INDEX idx_club_season_stats_competition_id ON club_season_stats (competition_id);

-- table: tactic
CREATE TABLE tactic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NULL,
  name TEXT NOT NULL,
  formation_id INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (club_id) REFERENCES club(id),
  FOREIGN KEY (formation_id) REFERENCES formation(id)
);

-- tactic indexes
CREATE INDEX idx_tactic_club_id ON tactic (club_id);
CREATE INDEX idx_tactic_formation_id ON tactic (formation_id);

-- table: tactic_instruction
CREATE TABLE tactic_instruction_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  value_type TEXT NOT NULL CHECK(value_type IN ('text', 'integer', 'boolean'))
);

-- table: tactic_instruction
CREATE TABLE tactic_instruction (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tactic_id INTEGER NOT NULL,
  instruction_type_id INTEGER NOT NULL,
  value TEXT NOT NULL, -- The value of instruction (ex: 'High', ' 'Short', '5')
  UNIQUE (tactic_id, instruction_type_id),
  FOREIGN KEY (tactic_id) REFERENCES tactic(id),
  FOREIGN KEY (instruction_type_id) REFERENCES tactic_instruction_type(id)
);

-- tactic_instruction indexes
CREATE INDEX idx_tactic_instruction_tactic_id ON tactic_instruction (tactic_id);
CREATE INDEX idx_tactic_instruction_type_id ON tactic_instruction (instruction_type_id);

-- table: injury_type
CREATE TABLE injury_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  typical_recovery_days INTEGER NULL 
);

-- injury_type index
CREATE INDEX idx_injury_type_name ON injury_type (name);

-- table: player_injury
CREATE TABLE player_injury (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  injury_type_id INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  expected_end_date TEXT NULL,
  actual_end_date TEXT NULL,
  severity TEXT NOT NULL CHECK(severity IN ('Minor', 'Moderate', 'Severe', 'Career-Ending')),
  match_id INTEGER NULL, 
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (injury_type_id) REFERENCES injury_type(id),
  FOREIGN KEY (match_id) REFERENCES match(id)
);

-- player_injury indexes
CREATE INDEX idx_player_injury_player_id ON player_injury (player_id);
CREATE INDEX idx_player_injury_type_id ON player_injury (injury_type_id);
CREATE INDEX idx_player_injury_start_date ON player_injury (start_date);
CREATE INDEX idx_player_injury_match_id ON player_injury (match_id);

CREATE TABLE suspension_reason_type (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NULL
);

-- suspension_reason_type index
CREATE INDEX idx_suspension_reason_type_name ON suspension_reason_type (name);

-- table: player_suspension
CREATE TABLE player_suspension (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id INTEGER NOT NULL,
  suspension_reason_type_id INTEGER NOT NULL, 
  start_date TEXT NOT NULL, 
  matches_missed INTEGER NULL, 
  match_id_origin INTEGER NULL,
  FOREIGN KEY (player_id) REFERENCES player(id),
  FOREIGN KEY (suspension_reason_type_id) REFERENCES suspension_reason_type(id),
  FOREIGN KEY (match_id_origin) REFERENCES match(id)
);

-- player_suspension indexes
CREATE INDEX idx_player_suspension_player_id ON player_suspension (player_id);
CREATE INDEX idx_player_suspension_reason_type_id ON player_suspension (suspension_reason_type_id);
CREATE INDEX idx_player_suspension_start_date ON player_suspension (start_date);
CREATE INDEX idx_player_suspension_match_id_origin ON player_suspension (match_id_origin);

-- table: game_state
CREATE TABLE game_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  current_date TEXT NOT NULL,
  season_id INTEGER NOT NULL, 
  FOREIGN KEY (season_id) REFERENCES season(id)
);

-- game_state index
CREATE INDEX game_state_season_id_idx ON game_state (season_id);

-- suspension_reason_type insert
INSERT INTO suspension_reason_type (name) VALUES
('Red Card'),
('Accumulated Yellow Cards'),
('Disciplinary Action'),
('Doping Violation'),
('Match Fixing');

-- injury_type insert
INSERT INTO injury_type (name, typical_recovery_days) VALUES
('Muscle Strain', 14),
('Ankle Sprain', 21),
('ACL Tear', 270),
('Hamstring Injury', 45),
('Concussion', 7),
('Fracture', 90),
('Tendonitis', 30);

-- player_position insert
INSERT INTO player_position (name) VALUES
('GK'),   -- Goalkeeper
('CB'),   -- Centre-Back
('LB'),   -- Left-Back
('RB'),   -- Right-Back
('LWB'),  -- Left Wing-Back
('RWB'),  -- Right Wing-Back
('CDM'),  -- Central Defensive Midfielder
('CM'),   -- Central Midfielder
('CAM'),  -- Central Attacking Midfielder
('LM'),   -- Left Midfielder
('RM'),   -- Right Midfielder
('LW'),   -- Left Winger
('RW'),   -- Right Winger
('ST'),   -- Striker
('CF');   -- Centre-Forward

-- tactic_instruction_type insert
INSERT INTO tactic_instruction_type (name, value_type) VALUES
('Defensive Line', 'text'), -- Ex: 'High', 'Medium', 'Low'
('Pressing Intensity', 'text'), -- Ex: 'High', 'Medium', 'Low'
('Passing Style', 'text'), -- Ex: 'Short', 'Mixed', 'Long'
('Tempo', 'text'), -- Ex: 'Slow', 'Normal', 'Fast'
('Width', 'text'), -- Ex: 'Narrow', 'Normal', 'Wide'
('Mentality', 'text'); -- Ex: 'Attacking', 'Balanced', 'Defensive'

-- transfer_window_type insert
INSERT INTO transfer_window_type (name) VALUES
('Summer'),
('Winter'),
('Emergency');

-- individual_award_type insert
INSERT INTO individual_award_type (name, description, category, is_competition_specific) VALUES
('Ballon d''Or', 'Best player in the world.', 'Player', 0),
('Golden Boot', 'Top scorer in national leagues this season.', 'Player', 0),
('Best Goalkeeper', 'Best goalkeeper of the season.', 'Goalkeeper', 0),
('Best Player of Competition', 'Best player in a specific competition.', 'Player', 1),
('Top Scorer of Competition', 'Top scorer in a specific competition.', 'Player', 1),
('Team of the Year', 'Selection of the best players of the year.', 'Team Selection', 0);

-- formation insert
INSERT INTO formation (name, formation_string) VALUES
('4-4-2 Flat', '4-4-2'),
('4-3-3 Attacking', '4-3-3'),
('3-5-2', '3-5-2'),
('4-2-3-1', '4-2-3-1'),
('5-3-2 Defensive', '5-3-2');

-- insert staff_attribute_type
INSERT INTO staff_attribute_type (name, category) VALUES
('Coaching - Attacking', 'Coaching'),
('Coaching - Defending', 'Coaching'),
('Coaching - Fitness', 'Coaching'),
('Coaching - Goalkeeping', 'Coaching'),
('Coaching - Tactical', 'Coaching'),
('Scouting - Judging Ability', 'Scouting'),
('Scouting - Judging Potential', 'Scouting'),
('Medical - Injury Prevention', 'Medical'),
('Medical - Treatment', 'Medical'),
('Negotiation', 'Mental'),
('Man Management', 'Mental'),
('Discipline', 'Mental');

-- insert transaction_type
INSERT INTO transaction_type (name) VALUES
('Revenue'),
('Expense');

-- insert transaction_category (revenues)
INSERT INTO transaction_category (name, transaction_type_id) VALUES
('Ticket Sales', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Merchandise Sales', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Sponsorship', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Broadcast Revenue', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Player Sales', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Prize Money', (SELECT id FROM transaction_type WHERE name = 'Revenue')),
('Loan Fees Received', (SELECT id FROM transaction_type WHERE name = 'Revenue'));

-- insert transaction_category (expenses)
INSERT INTO transaction_category (name, transaction_type_id) VALUES
('Player Salaries', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Staff Salaries', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Transfer Fees Paid', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Stadium Maintenance', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Travel Costs', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Youth Academy Costs', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Loan Payments Made', (SELECT id FROM transaction_type WHERE name = 'Expense')),
('Debt Repayment', (SELECT id FROM transaction_type WHERE name = 'Expense'));

-- insert transfer type
INSERT INTO transfer_type (name) VALUES
('Permanent'),      -- Permanent transfer with or without cost
('Loan'),           -- Player loan
('Free Transfer'),  -- Transfer without transfer fee (contract expired)
('Retirement'),     -- Player retired
('Release');        -- The player was released from his contract by the club

-- insert staff function types
INSERT INTO staff_function_type (name) VALUES
('Manager'),
('Assistant Manager'),
('Head Coach'),
('Goalkeeping Coach'),
('Fitness Coach'),
('Scout'),
('Physio'),
('Doctor'),
('Analyst'),
('Youth Coach');

-- insert tactical function type
INSERT INTO tactical_style_type (name, description) VALUES
('Attacking', 'Focus on an attacking, high-pressure game.'),
('Defensive', 'Prioritizes defensive solidity and counter-attacks.'),
('Possession-based', 'Seek to control possession of the ball.'),
('Counter-attacking', 'Specializes in fast transitions and counter-attacks.'),
('Direct', 'Prefers long, direct passes to the attack.');

-- insert attribute types
INSERT INTO attribute_type (name, category) VALUES
('Finishing', 'technical'),      -- Ability to score goals
('Passing', 'technical'),            -- Quality and precision of passes
('Dribbling', 'technical'),           -- Ability to dribble and control the ball
('Heading', 'technical'),         -- Skilled in aerial disputes and head shots

('Tackling', 'defensive'),          -- Ability to steal the ball and disarm opponents
('Marking', 'defensive'),         -- Ability to follow and nullify opponents

('Pace', 'physical'),        -- Speed and acceleration
('Strength', 'physical'),             -- Ability to win physical duels
('Stamina', 'physical'),       -- Breath and ability to play 90 minutes

('Vision', 'mental'),        -- Ability to read the game and find spaces
('Leadership', 'mental'),           -- Ability to inspire and guide the team
('Composure', 'mental'),          -- Ability to remain calm under pressure

('Goalkeeping', 'goalkeeper');         -- This includes reflexes, goalkeeping, positioning, etc.

-- Inserting cities for Portugal
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'Portugal'), 'Lisbon'),
((SELECT id FROM nation WHERE name = 'Portugal'), 'Porto'),
((SELECT id FROM nation WHERE name = 'Portugal'), 'Braga'),
((SELECT id FROM nation WHERE name = 'Portugal'), 'Guimarães'),
((SELECT id FROM nation WHERE name = 'Portugal'), 'Coimbra');

-- Inserting cities for Spain
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'Spain'), 'Madrid'),
((SELECT id FROM nation WHERE name = 'Spain'), 'Barcelona'),
((SELECT id FROM nation WHERE name = 'Spain'), 'Seville'),
((SELECT id FROM nation WHERE name = 'Spain'), 'Valencia'),
((SELECT id FROM nation WHERE name = 'Spain'), 'Bilbao');

-- Inserting cities for France
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'France'), 'Paris'),
((SELECT id FROM nation WHERE name = 'France'), 'Marseille'),
((SELECT id FROM nation WHERE name = 'France'), 'Lyon'),
((SELECT id FROM nation WHERE name = 'France'), 'Nice'),
((SELECT id FROM nation WHERE name = 'France'), 'Lille');

-- Inserting cities for Germany
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'Germany'), 'Munich'),
((SELECT id FROM nation WHERE name = 'Germany'), 'Dortmund'),
((SELECT id FROM nation WHERE name = 'Germany'), 'Berlin'),
((SELECT id FROM nation WHERE name = 'Germany'), 'Hamburg'),
((SELECT id FROM nation WHERE name = 'Germany'), 'Gelsenkirchen');

-- Inserting cities for England
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'England'), 'London'),
((SELECT id FROM nation WHERE name = 'England'), 'Manchester'),
((SELECT id FROM nation WHERE name = 'England'), 'Liverpool'),
((SELECT id FROM nation WHERE name = 'England'), 'Birmingham'),
((SELECT id FROM nation WHERE name = 'England'), 'Newcastle');

-- Inserting cities for Italy
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'Italy'), 'Rome'),
((SELECT id FROM nation WHERE name = 'Italy'), 'Milan'),
((SELECT id FROM nation WHERE name = 'Italy'), 'Turin'),
((SELECT id FROM nation WHERE name = 'Italy'), 'Naples'),
((SELECT id FROM nation WHERE name = 'Italy'), 'Florence');

-- Inserting cities for Brazil
INSERT INTO city (nation_id, name) VALUES
((SELECT id FROM nation WHERE name = 'Brazil'), 'São Paulo'),
((SELECT id FROM nation WHERE name = 'Brazil'), 'Rio de Janeiro'),
((SELECT id FROM nation WHERE name = 'Brazil'), 'Belo Horizonte'),
((SELECT id FROM nation WHERE name = 'Brazil'), 'Porto Alegre'),
((SELECT id FROM nation WHERE name = 'Brazil'), 'Salvador');

INSERT INTO competition (name, type, reputation, nation_id, confederation_id, has_group_stage, has_knockout_stage, knockout_legs, competition_logo) VALUES
('Premier League', 'league', 9000, (SELECT id FROM nation WHERE name = 'England'), NULL, 0, 0, 'single_leg', X''),
('La Liga', 'league', 8800, (SELECT id FROM nation WHERE name = 'Spain'), NULL, 0, 0, 'single_leg', X''),
('Ligue 1', 'league', 8200, (SELECT id FROM nation WHERE name = 'France'), NULL, 0, 0, 'single_leg', X''),
('Bundesliga', 'league', 8500, (SELECT id FROM nation WHERE name = 'Germany'), NULL, 0, 0, 'single_leg', X''),
('Serie A', 'league', 8600, (SELECT id FROM nation WHERE name = 'Italy'), NULL, 0, 0, 'single_leg', X''),
('Primeira Liga', 'league', 7800, (SELECT id FROM nation WHERE name = 'Portugal'), NULL, 0, 0, 'single_leg', X''),

-- Insertion of National Competitions (Cups)
INSERT INTO competition (name, type, reputation, nation_id, confederation_id, has_group_stage, has_knockout_stage, knockout_legs, competition_logo) VALUES
('FA Cup', 'cup', 7000, (SELECT id FROM nation WHERE name = 'England'), NULL, 0, 1, 'single_leg', X''),
('Copa del Rey', 'cup', 6800, (SELECT id FROM nation WHERE name = 'Spain'), NULL, 0, 1, 'single_leg', X''),
('Coupe de France', 'cup', 6500, (SELECT id FROM nation WHERE name = 'France'), NULL, 0, 1, 'single_leg', X''),
('DFB-Pokal', 'cup', 6700, (SELECT id FROM nation WHERE name = 'Germany'), NULL, 0, 1, 'single_leg', X''),
('Coppa Italia', 'cup', 6600, (SELECT id FROM nation WHERE name = 'Italy'), NULL, 0, 1, 'single_leg', X''),
('Taça de Portugal', 'cup', 6200, (SELECT id FROM nation WHERE name = 'Portugal'), NULL, 0, 1, 'single_leg', X''),

-- Insertion of Continental Competitions
INSERT INTO competition (name, type, reputation, nation_id, confederation_id, has_group_stage, has_knockout_stage, knockout_legs, competition_logo) VALUES
('UEFA Champions League', 'combination', 9500, NULL, (SELECT id FROM confederation WHERE name = 'UEFA'), 1, 1, 'two_legs', X''),