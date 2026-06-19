"use client";

import MatchInput from "./MatchInput";
import TeamFlag from "./TeamFlag";
import { getTeamShortName } from "@/data/teams";

const MANUAL_PLACEMENTS = [
  { key: "first", label: "Winner" },
  { key: "second", label: "2nd Place" },
  { key: "third", label: "3rd Place" },
];

function groupLetter(group) {
  return group.replace(/^Group\s*/i, "");
}

function rankLabel(rank) {
  if (rank === 0) return "Winner";
  if (rank === 1) return "Runner-up";
  if (rank === 2) return "3rd Place";
  return "4th Place";
}

function GroupModeToggle({ mode, onChange }) {
  return (
    <div className="group-mode-toggle">
      <button
        type="button"
        className={`group-mode-button ${mode === "scores" ? "active" : ""}`}
        onClick={() => onChange("scores")}
      >
        Scores
      </button>
      <button
        type="button"
        className={`group-mode-button ${mode === "manual" ? "active" : ""}`}
        onClick={() => onChange("manual")}
      >
        Manual
      </button>
    </div>
  );
}

function ManualGroupEditor({ group, teams, ranking, onChange }) {
  const nextRanking = {
    first: ranking?.first || "",
    second: ranking?.second || "",
    third: ranking?.third || "",
  };
  const fourthTeam =
    teams.find(
      (team) =>
        ![nextRanking.first, nextRanking.second, nextRanking.third].includes(
          team.name,
        ),
    ) || null;

  return (
    <div className="manual-group-editor">
      <p className="manual-group-helper">
        Pick the top three teams directly without entering match scores.
      </p>

      {MANUAL_PLACEMENTS.map((placement) => {
        const selectedElsewhere = new Set(
          MANUAL_PLACEMENTS.filter((item) => item.key !== placement.key)
            .map((item) => nextRanking[item.key])
            .filter(Boolean),
        );

        return (
          <label key={placement.key} className="manual-placement-row">
            <span className="manual-placement-label">{placement.label}</span>
            <select
              value={nextRanking[placement.key]}
              onChange={(event) =>
                onChange(group, placement.key, event.target.value || null)
              }
              className="control-field manual-placement-select"
            >
              <option value="">Select team</option>
              {teams
                .filter(
                  (team) =>
                    !selectedElsewhere.has(team.name) ||
                    nextRanking[placement.key] === team.name,
                )
                .map((team) => (
                  <option key={team.name} value={team.name}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
        );
      })}

      {fourthTeam && (
        <div className="manual-fourth-preview">
          <span className="manual-placement-label">4th Place</span>
          <div className="manual-fourth-team">
            <TeamFlag name={fourthTeam.name} className="standings-flag" />
            <span>{fourthTeam.name}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ManualStandings({ standings, bestThirdNames }) {
  return (
    <div className="manual-standings-list">
      {standings.map((stat, rank) => {
        const directQual = rank < 2;
        const thirdQual = rank === 2 && bestThirdNames.has(stat.team.name);
        const qualifies = directQual || thirdQual;

        return (
          <div
            key={stat.team.name}
            className={`manual-standing-item ${qualifies ? "qualified" : ""}`}
          >
            <div className="manual-standing-main">
              <span className="manual-standing-rank">{rankLabel(rank)}</span>
              <div className="manual-standing-team">
                <TeamFlag name={stat.team.name} className="standings-flag" />
                <span>{getTeamShortName(stat.team.name)}</span>
                {thirdQual && <span className="third-badge">3rd</span>}
              </div>
            </div>
            <span className="manual-standing-status">
              {directQual ? "Qualified" : thirdQual ? "Best 3rd" : "Out"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ManualThirdPlaceTable({
  teams,
  selectedTeams,
  onToggle,
  selectionComplete,
}) {
  const sortedTeams = [...teams].sort((a, b) => {
    const groupDiff = groupLetter(a.group).localeCompare(groupLetter(b.group));
    if (groupDiff !== 0) return groupDiff;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="manual-third-table-wrap">
      <table className="manual-third-table">
        <thead>
          <tr>
            <th className="left">Pick</th>
            <th className="left">Group</th>
            <th className="left">Team</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeams.map((team) => {
            const selected = selectedTeams.includes(team.name);
            const disabled = !selected && selectedTeams.length >= 8;

            return (
              <tr key={team.name} className={selected ? "selected" : ""}>
                <td className="left">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(team.name)}
                    disabled={disabled}
                    className="manual-third-checkbox"
                  />
                </td>
                <td className="left group-col">{groupLetter(team.group)}</td>
                <td className="left manual-third-team-col">
                  <span className="manual-third-team-cell">
                    <TeamFlag name={team.name} className="standings-flag" />
                    <span>{team.name}</span>
                  </span>
                </td>
                <td>
                  <span
                    className={`manual-third-row-status ${
                      selected ? "selected" : "pending"
                    } ${selectionComplete ? "complete" : ""}`}
                  >
                    {selected ? "Selected" : "Waiting"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function GroupStage({ tournament }) {
  const {
    groupMatches,
    groupTeamsByGroup,
    groupScores,
    manualGroupRankings,
    manualThirdQualifiers,
    hasManualGroups,
    setGroupScore,
    setAllGroupModes,
    setManualGroupRanking,
    toggleManualThirdQualifier,
    groupStandings,
    advancing,
    randomizeGroupScores,
    resetAll,
    saving,
    saveError,
    dirty,
    loading,
  } = tournament;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">
            Loading match data...
          </p>
        </div>
      </div>
    );
  }

  const groups = Object.keys(groupStandings).sort();
  const totalMatches = groupMatches.length;
  const bestThirdNames = new Set(advancing.bestThirds.map((team) => team.name));
  const mode = hasManualGroups ? "manual" : "scores";

  return (
    <div>
      <div className="group-stage-toolbar">
        <div className="group-stage-summary">
          <p className="group-stage-counts">
            <b>{groups.length}</b> groups / <b>{totalMatches}</b> matches
          </p>
          {saveError ? (
            <span className="group-stage-status error">{saveError}</span>
          ) : saving ? (
            <span className="group-stage-status">
              <span className="group-stage-status-dot" />
              Saving...
            </span>
          ) : dirty ? (
            <span className="group-stage-status">Unsaved changes</span>
          ) : (
            <span className="group-stage-status">Saved</span>
          )}
        </div>
        <div className="group-stage-actions">
          <GroupModeToggle mode={mode} onChange={setAllGroupModes} />
          <button
            onClick={resetAll}
            className="btn-ghost action-button"
            style={{ fontSize: 11 }}
          >
            Reset
          </button>
          <button
            onClick={randomizeGroupScores}
            className="btn-primary action-button"
          >
            Randomise
          </button>
        </div>
      </div>

      {hasManualGroups && (
        <section className="manual-third-panel">
          <div className="manual-third-header">
            <div>
              <p className="table-label">Third-place qualifiers</p>
              <p className="manual-third-copy">
                Manual groups need you to choose which 8 third-place teams
                advance.
              </p>
            </div>
            <span
              className={`manual-third-count ${
                advancing.thirdQualifiersComplete ? "complete" : ""
              }`}
            >
              {manualThirdQualifiers.length}/8 selected
            </span>
          </div>

          <ManualThirdPlaceTable
            teams={advancing.thirdCandidates}
            selectedTeams={manualThirdQualifiers}
            onToggle={toggleManualThirdQualifier}
            selectionComplete={advancing.thirdQualifiersComplete}
          />
        </section>
      )}

      {advancing.bestThirds.length > 0 && (
        <div className="thirds-strip">
          <span className="thirds-strip-label">Best 8 thirds advancing:</span>
          {advancing.bestThirds.map((team) => (
            <span key={team.name} className="thirds-chip">
              <TeamFlag name={team.name} className="thirds-chip-flag" />
              <span>{team.name}</span>
              <small>(Group {groupLetter(team.group)})</small>
            </span>
          ))}
        </div>
      )}

      <div className="group-grid">
        {groups.map((group, index) => {
          const standings = groupStandings[group] ?? [];
          const matches = groupMatches.filter((match) => match.group === group);
          const teams = groupTeamsByGroup[group] ?? [];
          const letter = groupLetter(group);

          return (
            <div
              key={group}
              className="card group-card fade-up"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <div className="group-card-header">
                <div className="group-card-heading">
                  <div className="group-letter">{letter}</div>
                  <div>
                    <span className="group-card-label">Group</span>
                    <p className="group-card-title">Group {letter}</p>
                  </div>
                </div>

                <div className="group-card-header-meta">
                  <span className="group-card-meta">
                    {standings.length} teams
                  </span>
                </div>
              </div>

              <div className="group-card-matches">
                {mode === "scores" ? (
                  matches.map((match) => (
                    <MatchInput
                      key={match.key}
                      home={match.home}
                      away={match.away}
                      score={groupScores[match.key]}
                      bangladeshTime={match.bangladeshTime}
                      onChange={(homeGoals, awayGoals) =>
                        setGroupScore(
                          match.home,
                          match.away,
                          homeGoals,
                          awayGoals,
                        )
                      }
                    />
                  ))
                ) : (
                  <ManualGroupEditor
                    group={group}
                    teams={teams}
                    ranking={manualGroupRankings[group]}
                    onChange={setManualGroupRanking}
                  />
                )}
              </div>

              <div className="group-card-standings">
                <p className="table-label">
                  {mode === "scores" ? "Standings" : "Manual order"}
                </p>

                {mode === "scores" ? (
                  <table className="standings-table">
                    <thead>
                      <tr>
                        {["#", "", "Team", "Pts", "GD", "GF"].map(
                          (heading, hi) => (
                            <th
                              key={heading || hi}
                              className={hi < 3 ? "left" : ""}
                            >
                              {heading}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((stat, rank) => {
                        const directQual = rank < 2;
                        const thirdQual =
                          rank === 2 && bestThirdNames.has(stat.team.name);
                        const qualifies = directQual || thirdQual;

                        return (
                          <tr
                            key={stat.team.name}
                            className={qualifies ? "qualified" : ""}
                          >
                            <td className="left rank-col">
                              {directQual ? (
                                <span className="rank-pill">{rank + 1}</span>
                              ) : (
                                rank + 1
                              )}
                            </td>
                            <td className="left flag-col">
                              <TeamFlag
                                name={stat.team.name}
                                className="standings-flag"
                              />
                            </td>
                            <td className="left team-col">
                              {getTeamShortName(stat.team.name)}
                              {thirdQual && (
                                <span className="third-badge">3rd</span>
                              )}
                            </td>
                            <td className="pts-col">{stat.points}</td>
                            <td>
                              {stat.goalDiff > 0
                                ? `+${stat.goalDiff}`
                                : stat.goalDiff}
                            </td>
                            <td>{stat.goalsFor}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <ManualStandings
                    standings={standings}
                    bestThirdNames={bestThirdNames}
                  />
                )}

                <div className="group-card-footer">
                  <div className="group-card-footer-dot" />
                  <span>Advance to R32</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
