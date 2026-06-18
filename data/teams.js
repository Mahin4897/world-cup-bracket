// data/teams.js

export let TEAMS = [];

export const FLAG_CODE_MAP = {
  // Group A
  Mexico: "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czech Republic": "cz",
  // Group B
  Canada: "ca",
  "Bosnia & Herzegovina": "ba",
  Qatar: "qa",
  Switzerland: "ch",
  // Group C
  Brazil: "br",
  Morocco: "ma",
  Haiti: "ht",
  Scotland: "gb-sct",
  // Group D
  USA: "us",
  Paraguay: "py",
  Australia: "au",
  Turkey: "tr",
  // Group E
  Germany: "de",
  Curaçao: "cw",
  "Ivory Coast": "ci",
  Ecuador: "ec",
  // Group F
  Netherlands: "nl",
  Japan: "jp",
  Sweden: "se",
  Tunisia: "tn",
  // Group G
  Belgium: "be",
  Egypt: "eg",
  Iran: "ir",
  "New Zealand": "nz",
  // Group H
  Spain: "es",
  "Cape Verde": "cv",
  "Saudi Arabia": "sa",
  Uruguay: "uy",
  // Group I
  France: "fr",
  Senegal: "sn",
  Iraq: "iq",
  Norway: "no",
  // Group J
  Argentina: "ar",
  Algeria: "dz",
  Austria: "at",
  Jordan: "jo",
  // Group K
  Portugal: "pt",
  "DR Congo": "cd",
  Uzbekistan: "uz",
  Colombia: "co",
  // Group L
  England: "gb-eng",
  Croatia: "hr",
  Ghana: "gh",
  Panama: "pa",
};

export function getTeamFlagCode(name) {
  return FLAG_CODE_MAP[name] || null;
}

const SHORT_NAME_MAP = {
  "Bosnia & Herzegovina": "Bosnia & Herz.",
  "Czech Republic": "Czech Republic",
  "Ivory Coast": "Ivory Coast",
  "New Zealand": "New Zealand",
  "Saudi Arabia": "Saudi Arabia",
  "South Africa": "South Africa",
  "South Korea": "South Korea",
};

export function getTeamShortName(name) {
  return SHORT_NAME_MAP[name] || name;
}

/**
 * Derives teams from a matches array (as in worldcup.json).
 * Each match entry with a `group` field contributes its two teams.
 * Populates TEAMS with { name, flagCode, group } objects, one per unique team.
 */
export function loadTeamsFromMatches(matches) {
  const seen = new Set();
  TEAMS = [];

  matches.forEach((match) => {
    // Only process group-stage matches (they have a `group` and no `num`)
    if (!match.group || match.num) return;

    [match.team1, match.team2].forEach((name) => {
      if (!seen.has(name)) {
        seen.add(name);
        TEAMS.push({
          name,
          flagCode: getTeamFlagCode(name),
          group: match.group,
        });
      }
    });
  });
}
