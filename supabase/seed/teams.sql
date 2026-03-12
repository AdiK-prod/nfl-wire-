-- Seed all 32 NFL teams

insert into public.teams (
  name,
  city,
  slug,
  abbreviation,
  primary_color,
  secondary_color,
  accent_color,
  logo_url,
  division,
  conference,
  is_active
) values
  -- AFC East
  ('Bills', 'Buffalo', 'buffalo-bills', 'BUF', '#00338D', '#C60C30', null, null, 'AFC East', 'AFC', false),
  ('Dolphins', 'Miami', 'miami-dolphins', 'MIA', '#008E97', '#FC4C02', null, null, 'AFC East', 'AFC', false),
  ('Patriots', 'New England', 'new-england-patriots', 'NE', '#002244', '#C60C30', null, null, 'AFC East', 'AFC', false),
  ('Jets', 'New York', 'new-york-jets', 'NYJ', '#125740', '#000000', null, null, 'AFC East', 'AFC', false),

  -- AFC North
  ('Ravens', 'Baltimore', 'baltimore-ravens', 'BAL', '#241773', '#000000', null, null, 'AFC North', 'AFC', false),
  ('Bengals', 'Cincinnati', 'cincinnati-bengals', 'CIN', '#FB4F14', '#000000', null, null, 'AFC North', 'AFC', false),
  ('Browns', 'Cleveland', 'cleveland-browns', 'CLE', '#311D00', '#FF3C00', null, null, 'AFC North', 'AFC', false),
  ('Steelers', 'Pittsburgh', 'pittsburgh-steelers', 'PIT', '#FFB612', '#000000', null, null, 'AFC North', 'AFC', false),

  -- AFC South
  ('Texans', 'Houston', 'houston-texans', 'HOU', '#03202F', '#A71930', null, null, 'AFC South', 'AFC', false),
  ('Colts', 'Indianapolis', 'indianapolis-colts', 'IND', '#002C5F', '#A2AAAD', null, null, 'AFC South', 'AFC', false),
  ('Jaguars', 'Jacksonville', 'jacksonville-jaguars', 'JAX', '#006778', '#D7A22A', null, null, 'AFC South', 'AFC', false),
  ('Titans', 'Tennessee', 'tennessee-titans', 'TEN', '#0C2340', '#4B92DB', null, null, 'AFC South', 'AFC', false),

  -- AFC West
  ('Broncos', 'Denver', 'denver-broncos', 'DEN', '#FB4F14', '#002244', null, null, 'AFC West', 'AFC', false),
  ('Chiefs', 'Kansas City', 'kansas-city-chiefs', 'KC', '#E31837', '#FFB81C', null, null, 'AFC West', 'AFC', false),
  ('Raiders', 'Las Vegas', 'las-vegas-raiders', 'LV', '#000000', '#A5ACAF', null, null, 'AFC West', 'AFC', false),
  ('Chargers', 'Los Angeles', 'los-angeles-chargers', 'LAC', '#0080C6', '#FFC20E', null, null, 'AFC West', 'AFC', false),

  -- NFC East
  ('Cowboys', 'Dallas', 'dallas-cowboys', 'DAL', '#041E42', '#869397', null, null, 'NFC East', 'NFC', false),
  ('Giants', 'New York', 'new-york-giants', 'NYG', '#0B2265', '#A71930', null, null, 'NFC East', 'NFC', false),
  ('Eagles', 'Philadelphia', 'philadelphia-eagles', 'PHI', '#004C54', '#A5ACAF', null, null, 'NFC East', 'NFC', false),
  ('Commanders', 'Washington', 'washington-commanders', 'WAS', '#5A1414', '#FFB612', null, null, 'NFC East', 'NFC', false),

  -- NFC North
  ('Bears', 'Chicago', 'chicago-bears', 'CHI', '#0B162A', '#C83803', null, null, 'NFC North', 'NFC', false),
  ('Lions', 'Detroit', 'detroit-lions', 'DET', '#0076B6', '#B0B7BC', null, null, 'NFC North', 'NFC', false),
  ('Packers', 'Green Bay', 'green-bay-packers', 'GB', '#203731', '#FFB612', null, null, 'NFC North', 'NFC', false),
  ('Vikings', 'Minnesota', 'minnesota-vikings', 'MIN', '#4F2683', '#FFC62F', null, null, 'NFC North', 'NFC', false),

  -- NFC South
  ('Falcons', 'Atlanta', 'atlanta-falcons', 'ATL', '#A71930', '#000000', null, null, 'NFC South', 'NFC', false),
  ('Panthers', 'Carolina', 'carolina-panthers', 'CAR', '#0085CA', '#101820', null, null, 'NFC South', 'NFC', false),
  ('Saints', 'New Orleans', 'new-orleans-saints', 'NO', '#D3BC8D', '#101820', null, null, 'NFC South', 'NFC', false),
  ('Buccaneers', 'Tampa Bay', 'tampa-bay-buccaneers', 'TB', '#D50A0A', '#FF7900', null, null, 'NFC South', 'NFC', false),

  -- NFC West
  ('Cardinals', 'Arizona', 'arizona-cardinals', 'ARI', '#97233F', '#000000', null, null, 'NFC West', 'NFC', false),
  ('Rams', 'Los Angeles', 'los-angeles-rams', 'LAR', '#003594', '#FFA300', null, null, 'NFC West', 'NFC', false),
  ('49ers', 'San Francisco', 'san-francisco-49ers', 'SF', '#AA0000', '#B3995D', null, null, 'NFC West', 'NFC', false),
  ('Seahawks', 'Seattle', 'seattle-seahawks', 'SEA', '#002244', '#69BE28', '#A5ACAF', null, 'NFC West', 'NFC', true);

