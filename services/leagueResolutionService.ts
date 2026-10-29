// Comprehensive League and Tournament Resolution Service for iRunBets
// Ensures every club and fixture is aligned with its true domestic league or European tournament (UEFA Champions League, Europa League, Conference League).

export interface ClubInfo {
  country: string;
  domesticLeague: string;
}

// Normalized mapping of known clubs to their country and domestic league
export const CLUB_COUNTRY_MAP: Record<string, ClubInfo> = {
  // --- PORTUGAL (Liga Portugal) ---
  "sporting clube de portugal": { country: "PT", domesticLeague: "Liga Portugal" },
  "sporting cp": { country: "PT", domesticLeague: "Liga Portugal" },
  "sporting": { country: "PT", domesticLeague: "Liga Portugal" },
  "sport lisboa e benfica": { country: "PT", domesticLeague: "Liga Portugal" },
  "sl benfica": { country: "PT", domesticLeague: "Liga Portugal" },
  "benfica": { country: "PT", domesticLeague: "Liga Portugal" },
  "fc porto": { country: "PT", domesticLeague: "Liga Portugal" },
  "porto": { country: "PT", domesticLeague: "Liga Portugal" },
  "sporting clube de braga": { country: "PT", domesticLeague: "Liga Portugal" },
  "sc braga": { country: "PT", domesticLeague: "Liga Portugal" },
  "braga": { country: "PT", domesticLeague: "Liga Portugal" },
  "vitoria sc": { country: "PT", domesticLeague: "Liga Portugal" },
  "vitória sc": { country: "PT", domesticLeague: "Liga Portugal" },
  "fc famalicao": { country: "PT", domesticLeague: "Liga Portugal" },
  "fc famalicão": { country: "PT", domesticLeague: "Liga Portugal" },
  "moreirense fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "rio ave fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "gil vicente fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "gd estoril praia": { country: "PT", domesticLeague: "Liga Portugal" },
  "estoril praia": { country: "PT", domesticLeague: "Liga Portugal" },
  "sc farense": { country: "PT", domesticLeague: "Liga Portugal" },
  "farense": { country: "PT", domesticLeague: "Liga Portugal" },
  "boavista fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "boavista": { country: "PT", domesticLeague: "Liga Portugal" },
  "casa pia ac": { country: "PT", domesticLeague: "Liga Portugal" },
  "fc arouca": { country: "PT", domesticLeague: "Liga Portugal" },
  "cf estrela da amadora": { country: "PT", domesticLeague: "Liga Portugal" },
  "estrela da amadora": { country: "PT", domesticLeague: "Liga Portugal" },
  "cd santa clara": { country: "PT", domesticLeague: "Liga Portugal" },
  "santa clara": { country: "PT", domesticLeague: "Liga Portugal" },
  "cd nacional": { country: "PT", domesticLeague: "Liga Portugal" },
  "avs futebol sad": { country: "PT", domesticLeague: "Liga Portugal" },
  "fc alverca": { country: "PT", domesticLeague: "Liga Portugal" },
  "alverca": { country: "PT", domesticLeague: "Liga Portugal" },
  "academico de viseu fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "académico de viseu fc": { country: "PT", domesticLeague: "Liga Portugal" },
  "cs maritimo": { country: "PT", domesticLeague: "Liga Portugal" },
  "cs marítimo": { country: "PT", domesticLeague: "Liga Portugal" },

  // --- ENGLAND (Premier League & Championship) ---
  "arsenal fc": { country: "EN", domesticLeague: "Premier League" },
  "arsenal": { country: "EN", domesticLeague: "Premier League" },
  "manchester city fc": { country: "EN", domesticLeague: "Premier League" },
  "manchester city": { country: "EN", domesticLeague: "Premier League" },
  "liverpool fc": { country: "EN", domesticLeague: "Premier League" },
  "liverpool": { country: "EN", domesticLeague: "Premier League" },
  "aston villa fc": { country: "EN", domesticLeague: "Premier League" },
  "aston villa": { country: "EN", domesticLeague: "Premier League" },
  "tottenham hotspur fc": { country: "EN", domesticLeague: "Premier League" },
  "tottenham hotspur": { country: "EN", domesticLeague: "Premier League" },
  "tottenham": { country: "EN", domesticLeague: "Premier League" },
  "manchester united fc": { country: "EN", domesticLeague: "Premier League" },
  "manchester united": { country: "EN", domesticLeague: "Premier League" },
  "newcastle united fc": { country: "EN", domesticLeague: "Premier League" },
  "newcastle united": { country: "EN", domesticLeague: "Premier League" },
  "chelsea fc": { country: "EN", domesticLeague: "Premier League" },
  "chelsea": { country: "EN", domesticLeague: "Premier League" },
  "west ham united fc": { country: "EN", domesticLeague: "Premier League" },
  "west ham united": { country: "EN", domesticLeague: "Premier League" },
  "brighton & hove albion fc": { country: "EN", domesticLeague: "Premier League" },
  "brighton": { country: "EN", domesticLeague: "Premier League" },
  "wolverhampton wanderers fc": { country: "EN", domesticLeague: "Premier League" },
  "wolverhampton": { country: "EN", domesticLeague: "Premier League" },
  "afc bournemouth": { country: "EN", domesticLeague: "Premier League" },
  "bournemouth": { country: "EN", domesticLeague: "Premier League" },
  "crystal palace fc": { country: "EN", domesticLeague: "Premier League" },
  "crystal palace": { country: "EN", domesticLeague: "Premier League" },
  "fulham fc": { country: "EN", domesticLeague: "Premier League" },
  "fulham": { country: "EN", domesticLeague: "Premier League" },
  "everton fc": { country: "EN", domesticLeague: "Premier League" },
  "everton": { country: "EN", domesticLeague: "Premier League" },
  "brentford fc": { country: "EN", domesticLeague: "Premier League" },
  "brentford": { country: "EN", domesticLeague: "Premier League" },
  "nottingham forest fc": { country: "EN", domesticLeague: "Premier League" },
  "nottingham forest": { country: "EN", domesticLeague: "Premier League" },
  "ipswich town fc": { country: "EN", domesticLeague: "Premier League" },
  "ipswich town": { country: "EN", domesticLeague: "Premier League" },
  "southampton fc": { country: "EN", domesticLeague: "Premier League" },
  "southampton": { country: "EN", domesticLeague: "Premier League" },
  "sunderland afc": { country: "EN", domesticLeague: "Premier League" },
  "sunderland": { country: "EN", domesticLeague: "Premier League" },

  // English Championship
  "birmingham city fc": { country: "EN", domesticLeague: "Championship" },
  "blackburn rovers fc": { country: "EN", domesticLeague: "Championship" },
  "bolton wanderers fc": { country: "EN", domesticLeague: "Championship" },
  "bristol city fc": { country: "EN", domesticLeague: "Championship" },
  "burnley fc": { country: "EN", domesticLeague: "Championship" },
  "burnley": { country: "EN", domesticLeague: "Championship" },
  "cardiff city fc": { country: "EN", domesticLeague: "Championship" },
  "charlton athletic fc": { country: "EN", domesticLeague: "Championship" },
  "coventry city fc": { country: "EN", domesticLeague: "Championship" },
  "derby county fc": { country: "EN", domesticLeague: "Championship" },
  "hull city afc": { country: "EN", domesticLeague: "Championship" },
  "leeds united fc": { country: "EN", domesticLeague: "Championship" },
  "leeds united": { country: "EN", domesticLeague: "Championship" },
  "lincoln city fc": { country: "EN", domesticLeague: "Championship" },
  "middlesbrough fc": { country: "EN", domesticLeague: "Championship" },
  "millwall fc": { country: "EN", domesticLeague: "Championship" },
  "norwich city fc": { country: "EN", domesticLeague: "Championship" },
  "portsmouth fc": { country: "EN", domesticLeague: "Championship" },
  "preston north end fc": { country: "EN", domesticLeague: "Championship" },
  "queens park rangers fc": { country: "EN", domesticLeague: "Championship" },
  "sheffield united fc": { country: "EN", domesticLeague: "Championship" },
  "sheffield united": { country: "EN", domesticLeague: "Championship" },
  "stoke city fc": { country: "EN", domesticLeague: "Championship" },
  "swansea city afc": { country: "EN", domesticLeague: "Championship" },
  "watford fc": { country: "EN", domesticLeague: "Championship" },
  "west bromwich albion fc": { country: "EN", domesticLeague: "Championship" },
  "wrexham afc": { country: "EN", domesticLeague: "Championship" },

  // --- SPAIN (La Liga / Primera Division) ---
  "real madrid cf": { country: "ES", domesticLeague: "Primera Division" },
  "real madrid": { country: "ES", domesticLeague: "Primera Division" },
  "fc barcelona": { country: "ES", domesticLeague: "Primera Division" },
  "barcelona": { country: "ES", domesticLeague: "Primera Division" },
  "club atletico de madrid": { country: "ES", domesticLeague: "Primera Division" },
  "club atlético de madrid": { country: "ES", domesticLeague: "Primera Division" },
  "atletico madrid": { country: "ES", domesticLeague: "Primera Division" },
  "real sociedad de futbol": { country: "ES", domesticLeague: "Primera Division" },
  "real sociedad de fútbol": { country: "ES", domesticLeague: "Primera Division" },
  "real sociedad": { country: "ES", domesticLeague: "Primera Division" },
  "athletic club": { country: "ES", domesticLeague: "Primera Division" },
  "real betis balompie": { country: "ES", domesticLeague: "Primera Division" },
  "real betis balompié": { country: "ES", domesticLeague: "Primera Division" },
  "real betis": { country: "ES", domesticLeague: "Primera Division" },
  "sevilla fc": { country: "ES", domesticLeague: "Primera Division" },
  "villarreal cf": { country: "ES", domesticLeague: "Primera Division" },
  "valencia cf": { country: "ES", domesticLeague: "Primera Division" },
  "getafe cf": { country: "ES", domesticLeague: "Primera Division" },
  "ca osasuna": { country: "ES", domesticLeague: "Primera Division" },
  "deportivo alaves": { country: "ES", domesticLeague: "Primera Division" },
  "deportivo alavés": { country: "ES", domesticLeague: "Primera Division" },
  "rayo vallecano de madrid": { country: "ES", domesticLeague: "Primera Division" },
  "rc celta de vigo": { country: "ES", domesticLeague: "Primera Division" },
  "rcd espanyol de barcelona": { country: "ES", domesticLeague: "Primera Division" },
  "rc deportivo la coruna": { country: "ES", domesticLeague: "Primera Division" },
  "rc deportivo la coruña": { country: "ES", domesticLeague: "Primera Division" },
  "real racing club de santander": { country: "ES", domesticLeague: "Primera Division" },
  "elche cf": { country: "ES", domesticLeague: "Primera Division" },
  "levante ud": { country: "ES", domesticLeague: "Primera Division" },
  "malaga cf": { country: "ES", domesticLeague: "Primera Division" },
  "málaga cf": { country: "ES", domesticLeague: "Primera Division" },

  // --- ITALY (Serie A) ---
  "fc internazionale milano": { country: "IT", domesticLeague: "Serie A" },
  "inter milan": { country: "IT", domesticLeague: "Serie A" },
  "inter": { country: "IT", domesticLeague: "Serie A" },
  "ac milan": { country: "IT", domesticLeague: "Serie A" },
  "milan": { country: "IT", domesticLeague: "Serie A" },
  "juventus fc": { country: "IT", domesticLeague: "Serie A" },
  "juventus": { country: "IT", domesticLeague: "Serie A" },
  "atalanta bc": { country: "IT", domesticLeague: "Serie A" },
  "atalanta": { country: "IT", domesticLeague: "Serie A" },
  "bologna fc 1909": { country: "IT", domesticLeague: "Serie A" },
  "bologna": { country: "IT", domesticLeague: "Serie A" },
  "as roma": { country: "IT", domesticLeague: "Serie A" },
  "roma": { country: "IT", domesticLeague: "Serie A" },
  "ss lazio": { country: "IT", domesticLeague: "Serie A" },
  "lazio": { country: "IT", domesticLeague: "Serie A" },
  "acf fiorentina": { country: "IT", domesticLeague: "Serie A" },
  "fiorentina": { country: "IT", domesticLeague: "Serie A" },
  "ssc napoli": { country: "IT", domesticLeague: "Serie A" },
  "napoli": { country: "IT", domesticLeague: "Serie A" },
  "torino fc": { country: "IT", domesticLeague: "Serie A" },
  "torino": { country: "IT", domesticLeague: "Serie A" },
  "ac monza": { country: "IT", domesticLeague: "Serie A" },
  "monza": { country: "IT", domesticLeague: "Serie A" },
  "genoa cfc": { country: "IT", domesticLeague: "Serie A" },
  "genoa": { country: "IT", domesticLeague: "Serie A" },
  "us lecce": { country: "IT", domesticLeague: "Serie A" },
  "udinese calcio": { country: "IT", domesticLeague: "Serie A" },
  "udinese": { country: "IT", domesticLeague: "Serie A" },
  "cagliari calcio": { country: "IT", domesticLeague: "Serie A" },
  "cagliari": { country: "IT", domesticLeague: "Serie A" },
  "parma calcio 1913": { country: "IT", domesticLeague: "Serie A" },
  "parma": { country: "IT", domesticLeague: "Serie A" },
  "como 1907": { country: "IT", domesticLeague: "Serie A" },
  "como": { country: "IT", domesticLeague: "Serie A" },
  "venezia fc": { country: "IT", domesticLeague: "Serie A" },
  "venezia": { country: "IT", domesticLeague: "Serie A" },
  "us sassuolo calcio": { country: "IT", domesticLeague: "Serie A" },
  "frosinone calcio": { country: "IT", domesticLeague: "Serie A" },

  // --- GERMANY (Bundesliga) ---
  "bayer 04 leverkusen": { country: "DE", domesticLeague: "Bundesliga" },
  "bayer leverkusen": { country: "DE", domesticLeague: "Bundesliga" },
  "fc bayern munchen": { country: "DE", domesticLeague: "Bundesliga" },
  "fc bayern münchen": { country: "DE", domesticLeague: "Bundesliga" },
  "bayern munich": { country: "DE", domesticLeague: "Bundesliga" },
  "bayern": { country: "DE", domesticLeague: "Bundesliga" },
  "vfb stuttgart": { country: "DE", domesticLeague: "Bundesliga" },
  "stuttgart": { country: "DE", domesticLeague: "Bundesliga" },
  "borussia dortmund": { country: "DE", domesticLeague: "Bundesliga" },
  "dortmund": { country: "DE", domesticLeague: "Bundesliga" },
  "rb leipzig": { country: "DE", domesticLeague: "Bundesliga" },
  "leipzig": { country: "DE", domesticLeague: "Bundesliga" },
  "eintracht frankfurt": { country: "DE", domesticLeague: "Bundesliga" },
  "tsg 1899 hoffenheim": { country: "DE", domesticLeague: "Bundesliga" },
  "sc freiburg": { country: "DE", domesticLeague: "Bundesliga" },
  "sv werder bremen": { country: "DE", domesticLeague: "Bundesliga" },
  "fc augsburg": { country: "DE", domesticLeague: "Bundesliga" },
  "borussia monchengladbach": { country: "DE", domesticLeague: "Bundesliga" },
  "borussia mönchengladbach": { country: "DE", domesticLeague: "Bundesliga" },
  "1. fsv mainz 05": { country: "DE", domesticLeague: "Bundesliga" },
  "1. fc union berlin": { country: "DE", domesticLeague: "Bundesliga" },
  "1. fc koln": { country: "DE", domesticLeague: "Bundesliga" },
  "1. fc köln": { country: "DE", domesticLeague: "Bundesliga" },
  "fc schalke 04": { country: "DE", domesticLeague: "Bundesliga" },
  "hamburger sv": { country: "DE", domesticLeague: "Bundesliga" },
  "sc paderborn 07": { country: "DE", domesticLeague: "Bundesliga" },
  "sv 07 elversberg": { country: "DE", domesticLeague: "Bundesliga" },

  // --- FRANCE (Ligue 1) ---
  "paris saint-germain fc": { country: "FR", domesticLeague: "Ligue 1" },
  "paris saint-germain": { country: "FR", domesticLeague: "Ligue 1" },
  "psg": { country: "FR", domesticLeague: "Ligue 1" },
  "as monaco fc": { country: "FR", domesticLeague: "Ligue 1" },
  "as monaco": { country: "FR", domesticLeague: "Ligue 1" },
  "stade brestois 29": { country: "FR", domesticLeague: "Ligue 1" },
  "lille osc": { country: "FR", domesticLeague: "Ligue 1" },
  "lille": { country: "FR", domesticLeague: "Ligue 1" },
  "ogc nice": { country: "FR", domesticLeague: "Ligue 1" },
  "racing club de lens": { country: "FR", domesticLeague: "Ligue 1" },
  "rc lens": { country: "FR", domesticLeague: "Ligue 1" },
  "lens": { country: "FR", domesticLeague: "Ligue 1" },
  "olympique de marseille": { country: "FR", domesticLeague: "Ligue 1" },
  "marseille": { country: "FR", domesticLeague: "Ligue 1" },
  "olympique lyonnais": { country: "FR", domesticLeague: "Ligue 1" },
  "lyon": { country: "FR", domesticLeague: "Ligue 1" },
  "stade rennais fc 1901": { country: "FR", domesticLeague: "Ligue 1" },
  "toulouse fc": { country: "FR", domesticLeague: "Ligue 1" },
  "rc strasbourg alsace": { country: "FR", domesticLeague: "Ligue 1" },
  "le havre ac": { country: "FR", domesticLeague: "Ligue 1" },
  "aj auxerre": { country: "FR", domesticLeague: "Ligue 1" },
  "angers sco": { country: "FR", domesticLeague: "Ligue 1" },
  "es troyes ac": { country: "FR", domesticLeague: "Ligue 1" },
  "fc lorient": { country: "FR", domesticLeague: "Ligue 1" },
  "paris fc": { country: "FR", domesticLeague: "Ligue 1" },
  "le mans fc": { country: "FR", domesticLeague: "Ligue 1" },

  // --- NETHERLANDS (Eredivisie) ---
  "psv": { country: "NL", domesticLeague: "Eredivisie" },
  "psv eindhoven": { country: "NL", domesticLeague: "Eredivisie" },
  "feyenoord rotterdam": { country: "NL", domesticLeague: "Eredivisie" },
  "feyenoord": { country: "NL", domesticLeague: "Eredivisie" },
  "fc twente '65": { country: "NL", domesticLeague: "Eredivisie" },
  "fc twente": { country: "NL", domesticLeague: "Eredivisie" },
  "az": { country: "NL", domesticLeague: "Eredivisie" },
  "az alkmaar": { country: "NL", domesticLeague: "Eredivisie" },
  "afc ajax": { country: "NL", domesticLeague: "Eredivisie" },
  "ajax": { country: "NL", domesticLeague: "Eredivisie" },
  "nec": { country: "NL", domesticLeague: "Eredivisie" },
  "fc utrecht": { country: "NL", domesticLeague: "Eredivisie" },
  "sparta rotterdam": { country: "NL", domesticLeague: "Eredivisie" },
  "go ahead eagles": { country: "NL", domesticLeague: "Eredivisie" },
  "fortuna sittard": { country: "NL", domesticLeague: "Eredivisie" },
  "sc heerenveen": { country: "NL", domesticLeague: "Eredivisie" },
  "pec zwolle": { country: "NL", domesticLeague: "Eredivisie" },
  "willem ii tilburg": { country: "NL", domesticLeague: "Eredivisie" },
  "willem ii": { country: "NL", domesticLeague: "Eredivisie" },
  "fc groningen": { country: "NL", domesticLeague: "Eredivisie" },
  "sbv excelsior": { country: "NL", domesticLeague: "Eredivisie" },
  "sc cambuur-leeuwarden": { country: "NL", domesticLeague: "Eredivisie" },
  "ado den haag": { country: "NL", domesticLeague: "Eredivisie" },
  "telstar 1963": { country: "NL", domesticLeague: "Eredivisie" },

  // --- BRAZIL (Campeonato Brasileiro Série A) ---
  "se palmeiras": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "palmeiras": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "cr flamengo": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "flamengo": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "botafogo fr": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "botafogo": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "gremio fbpa": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "grêmio fbpa": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "gremio": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "ca mineiro": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "atletico mineiro": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "sao paulo fc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "são paulo fc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "fluminense fc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "ca paranaense": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "sc internacional": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "ec bahia": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "cruzeiro ec": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "sc corinthians paulista": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "cr vasco da gama": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "ec vitoria": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "ec vitória": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "rb bragantino": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "clube do remo": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "santos fc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "coritiba fbc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "chapecoense af": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },
  "mirassol fc": { country: "BR", domesticLeague: "Campeonato Brasileiro Série A" },

  // --- OTHER EUROPEAN CLUBS ---
  "club brugge kv": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "gent": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "lask linz": { country: "AT", domesticLeague: "Bundesliga (Áustria)" },
  "lask": { country: "AT", domesticLeague: "Bundesliga (Áustria)" },
  "lasl linz": { country: "AT", domesticLeague: "Bundesliga (Áustria)" },
  "pae aek": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "fk shakhtar donetsk": { country: "UA", domesticLeague: "Premier League (Ucrânia)" },
  "fenerbahce sk": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "fenerbahçe sk": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "galatasaray sk": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "fk bodo/glimt": { country: "NO", domesticLeague: "Eliteserien" },
  "fk bodø/glimt": { country: "NO", domesticLeague: "Eliteserien" },
  "viking fk": { country: "NO", domesticLeague: "Eliteserien" },
  "sk slavia praha": { country: "CZ", domesticLeague: "Chance Liga (República Checa)" },
  "sk slovan bratislava": { country: "SK", domesticLeague: "Niké Liga (Eslováquia)" },
  "šk slovan bratislava": { country: "SK", domesticLeague: "Niké Liga (Eslováquia)" },
  "sabah fk": { country: "AZ_EUR", domesticLeague: "Premyer Liqa (Azerbaijão)" },
  "legia warszawa": { country: "PL", domesticLeague: "Ekstraklasa (Polónia)" },
  "fc dynamo kyiv": { country: "UA", domesticLeague: "Premier League (Ucrânia)" },
  "dynamo kyiv": { country: "UA", domesticLeague: "Premier League (Ucrânia)" },
  "besiktas jk": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "beşiktaş jk": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "besiktas": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "fk rfs": { country: "LV", domesticLeague: "Virslīga (Letónia)" },
  "pfc ludogorets razgrad": { country: "BG", domesticLeague: "Parva Liga (Bulgária)" },
  "ludogorets": { country: "BG", domesticLeague: "Parva Liga (Bulgária)" },
  "olympiacos fc": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "olympiacos": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "royale union saint-gilloise": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "union saint-gilloise": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "fc midtjylland": { country: "DK", domesticLeague: "Superliga (Dinamarca)" },
  "midtjylland": { country: "DK", domesticLeague: "Superliga (Dinamarca)" },
  "ferencvarosi tc": { country: "HU", domesticLeague: "NB I (Hungria)" },
  "ferencvárosi tc": { country: "HU", domesticLeague: "NB I (Hungria)" },
  "maccabi tel aviv fc": { country: "IL", domesticLeague: "Ligat HaAl (Israel)" },
  "paok fc": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "paok": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "fc viktoria plzen": { country: "CZ", domesticLeague: "Chance Liga (República Checa)" },
  "fc viktoria plzeň": { country: "CZ", domesticLeague: "Chance Liga (República Checa)" },
  "qarabag fk": { country: "AZ_EUR", domesticLeague: "Premyer Liqa (Azerbaijão)" },
  "qarabağ fk": { country: "AZ_EUR", domesticLeague: "Premyer Liqa (Azerbaijão)" },
  "panathinaikos fc": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "panathinaikos": { country: "GR", domesticLeague: "Super League (Grécia)" },
  "djurgardens if": { country: "SE", domesticLeague: "Allsvenskan (Suécia)" },
  "djurgårdens if": { country: "SE", domesticLeague: "Allsvenskan (Suécia)" },
  "fc kobenhavn": { country: "DK", domesticLeague: "Superliga (Dinamarca)" },
  "fc københavn": { country: "DK", domesticLeague: "Superliga (Dinamarca)" },
  "fc st. gallen": { country: "CH", domesticLeague: "Super League (Suíça)" },
  "molde fk": { country: "NO", domesticLeague: "Eliteserien" },
  "heart of midlothian": { country: "GB_SCT", domesticLeague: "Scottish Premiership" },
  "ac omonia": { country: "CY", domesticLeague: "First Division (Chipre)" },
  "sk rapid wien": { country: "AT", domesticLeague: "Bundesliga (Áustria)" },
  "rapid wien": { country: "AT", domesticLeague: "Bundesliga (Áustria)" },
  "fc noah": { country: "AM", domesticLeague: "Premier League (Arménia)" },
  "apoel fc": { country: "CY", domesticLeague: "First Division (Chipre)" },
  "apoel": { country: "CY", domesticLeague: "First Division (Chipre)" },
  "fk borac banja luka": { country: "BA", domesticLeague: "Premijer Liga (Bósnia)" },
  "fk tsc backa topola": { country: "RS", domesticLeague: "SuperLiga (Sérvia)" },
  "fk tsc bačka topola": { country: "RS", domesticLeague: "SuperLiga (Sérvia)" },
  "cercle brugge ksv": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "jagiellonia bialystok": { country: "PL", domesticLeague: "Ekstraklasa (Polónia)" },
  "jagiellonia białystok": { country: "PL", domesticLeague: "Ekstraklasa (Polónia)" },
  "fc petrocub hincesti": { country: "MD", domesticLeague: "Super Liga (Moldávia)" },
  "fc petrocub hîncești": { country: "MD", domesticLeague: "Super Liga (Moldávia)" },
  "larne fc": { country: "GB_NIR", domesticLeague: "Premiership (Irlanda do Norte)" },
  "shamrock rovers": { country: "IE", domesticLeague: "Premier Division (Irlanda)" },
  "hjk helsinki": { country: "FI", domesticLeague: "Veikkausliiga (Finlândia)" },
  "fc dinamo minsk": { country: "BY", domesticLeague: "Premier League (Bielorrússia)" },
  "nk olimpija ljubljana": { country: "SI", domesticLeague: "PrvaLiga (Eslovénia)" },
  "the new saints fc": { country: "GB_WLS", domesticLeague: "Cymru Premier (País de Gales)" },
  "fk astana": { country: "KZ", domesticLeague: "Premier League (Cazaquistão)" },
  "nk celje": { country: "SI", domesticLeague: "PrvaLiga (Eslovénia)" },
  "istanbul basaksehir": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "istanbul başakşehir": { country: "TR", domesticLeague: "Süper Lig (Turquia)" },
  "rsc anderlecht": { country: "BE", domesticLeague: "Jupiler Pro League" },
  "malmo ff": { country: "SE", domesticLeague: "Allsvenskan (Suécia)" },
  "malmö ff": { country: "SE", domesticLeague: "Allsvenskan (Suécia)" }
};

// Explicit mappings for Europa League matchups
const UEL_MATCHES = new Set<string>([
  "Real Betis Balompié vs FC Porto", "FC Porto vs Real Betis Balompié",
  "Aston Villa FC vs Fenerbahçe SK", "Fenerbahçe SK vs Aston Villa FC",
  "SSC Napoli vs FK Bodø/Glimt", "FK Bodø/Glimt vs SSC Napoli",
  "Como 1907 vs Manchester United FC", "Manchester United FC vs Como 1907",
  "Lille OSC vs Galatasaray SK", "Galatasaray SK vs Lille OSC",
  "Real Betis Balompié vs Feyenoord Rotterdam", "Feyenoord Rotterdam vs Real Betis Balompié",
  "Fenerbahçe SK vs SK Slavia Praha", "SK Slavia Praha vs Fenerbahçe SK",
  "FK Bodø/Glimt vs Borussia Dortmund", "Borussia Dortmund vs FK Bodø/Glimt"
]);

// Explicit mappings for Conference League matchups
const UECL_MATCHES = new Set<string>([
  "Aston Villa FC vs Viking FK", "Viking FK vs Aston Villa FC",
  "Sabah FK vs Borussia Dortmund", "Borussia Dortmund vs Sabah FK",
  "Sabah FK vs SK Slavia Praha", "SK Slavia Praha vs Sabah FK"
]);

function normalizeClubKey(name: string): string {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function findClubInfo(clubName: string): ClubInfo | null {
  if (!clubName) return null;
  const norm = normalizeClubKey(clubName);

  if (CLUB_COUNTRY_MAP[norm]) {
    return CLUB_COUNTRY_MAP[norm];
  }

  // Substring matching
  for (const [key, info] of Object.entries(CLUB_COUNTRY_MAP)) {
    if (norm.includes(key) || key.includes(norm)) {
      return info;
    }
  }

  return null;
}

/**
 * Resolves the true official league or tournament for any fixture.
 * Guarantees that:
 * 1) Inter-country European matchups (e.g. Feyenoord Rotterdam vs Como 1907) are categorized
 *    as UEFA Champions League, UEFA Europa League, or UEFA Europa Conference League.
 * 2) Domestic matchups (e.g. Feyenoord vs PSV, Como 1907 vs Torino, Real Madrid vs Barcelona)
 *    are strictly categorized in their respective domestic leagues (Eredivisie, Serie A, Primera Division, etc.).
 */
export function resolveAccurateLeague(
  clubeCasa: string,
  clubeFora: string,
  currentLeague?: string
): string {
  const homeInfo = findClubInfo(clubeCasa);
  const awayInfo = findClubInfo(clubeFora);

  // If clubs are unrecognized, fallback to sanitized currentLeague
  if (!homeInfo || !awayInfo) {
    if (currentLeague && currentLeague !== 'Geral') return currentLeague;
    return 'Geral';
  }

  // CASE 1: Clubs are from DIFFERENT COUNTRIES -> European Competition
  if (homeInfo.country !== awayInfo.country) {
    // If already labeled with a specific UEFA competition, respect it directly
    if (currentLeague && currentLeague !== 'Geral') {
      const clNorm = currentLeague.toLowerCase();
      if (clNorm.includes("champions league")) return "UEFA Champions League";
      if (clNorm.includes("conference league")) return "UEFA Europa Conference League";
      if (clNorm.includes("europa league")) return "UEFA Europa League";
    }

    const matchupKey = `${clubeCasa} vs ${clubeFora}`;

    if (UECL_MATCHES.has(matchupKey)) {
      return "UEFA Europa Conference League";
    }

    if (UEL_MATCHES.has(matchupKey)) {
      return "UEFA Europa League";
    }

    // Default top-tier European tournament (Feyenoord vs Como 1907, Man City vs PSG, Roma vs Slovan, Lens vs Sporting, etc.)
    return "UEFA Champions League";
  }

  // CASE 2: Clubs are from the SAME COUNTRY -> Domestic Competition
  switch (homeInfo.country) {
    case "PT":
      return "Liga Portugal";

    case "ES":
      return "Primera Division";

    case "IT":
      return "Serie A";

    case "DE":
      return "Bundesliga";

    case "FR":
      return "Ligue 1";

    case "NL":
      return "Eredivisie";

    case "BR":
      return "Campeonato Brasileiro Série A";

    case "EN":
      if (
        currentLeague === "Championship" ||
        (homeInfo.domesticLeague === "Championship" && awayInfo.domesticLeague === "Championship")
      ) {
        return "Championship";
      }
      return "Premier League";

    default:
      return homeInfo.domesticLeague || currentLeague || "Geral";
  }
}
