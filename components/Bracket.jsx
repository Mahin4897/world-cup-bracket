"use client";

import { useState } from "react";
import TeamFlag from "./TeamFlag";
import { getTeamShortName } from "@/data/teams";

function optionLabel(team) {
  const group = team.group?.replace(/^Group\s*/i, "");
  return group ? `${team.name} (Group ${group})` : team.name;
}

function TBDCard({ match }) {
  return (
    <div className="bracket-match tbd-match">
      {match?.bangladeshTime?.label && (
        <div className="bracket-match-meta">{match.bangladeshTime.label}</div>
      )}
      <span>TBD</span>
    </div>
  );
}

function TeamRow({ match, team, side, setWinnerEditing }) {
  if (!team) {
    return (
      <div className="bracket-team empty">
        <span>TBD</span>
      </div>
    );
  }

  const isWinner = match.winner === team;
  const isLoser = match.winner && match.winner !== team;

  return (
    <button
      type="button"
      onClick={() => setWinnerEditing(`${match.id}_${side}`)}
      className={`bracket-team ${isWinner ? "winner" : ""} ${
        isLoser ? "loser" : ""
      }`}
    >
      <TeamFlag name={team} className="flag" />
      <span className="name">{getTeamShortName(team)}</span>
      {isWinner && <span className="win-label">Win</span>}
    </button>
  );
}

function MatchupEditor({ match, options, onSave, onCancel }) {
  const [team1, setTeam1] = useState(match.team1 || "");
  const [team2, setTeam2] = useState(match.team2 || "");
  const invalid = !team1 || !team2 || team1 === team2;

  return (
    <div className="matchup-editor">
      <div className="matchup-editor-label">Edit Round of 32 matchup</div>

      <div className="matchup-editor-grid">
        <select
          value={team1}
          onChange={(event) => setTeam1(event.target.value)}
          className="control-field matchup-select"
        >
          {options.map((team) => (
            <option key={team.name} value={team.name}>
              {optionLabel(team)}
            </option>
          ))}
        </select>

        <select
          value={team2}
          onChange={(event) => setTeam2(event.target.value)}
          className="control-field matchup-select"
        >
          {options.map((team) => (
            <option key={team.name} value={team.name}>
              {optionLabel(team)}
            </option>
          ))}
        </select>
      </div>

      <div className="matchup-editor-actions">
        <button
          type="button"
          onClick={() => onSave(match.id, team1, team2)}
          className="btn-primary action-button"
          disabled={invalid}
        >
          Save matchup
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn-ghost action-button"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function MatchCard({
  match,
  onSelectWinner,
  winnerEditing,
  setWinnerEditing,
  matchupEditing,
  setMatchupEditing,
  onSaveMatchup,
  roundOf32Teams,
}) {
  if (!match.team1 && !match.team2) return <TBDCard match={match} />;

  const isRoundOf32 = match.round === "Round of 32";
  const isEditing = winnerEditing?.startsWith(match.id) || matchupEditing;
  const editingTeam =
    winnerEditing === `${match.id}_team1`
      ? match.team1
      : winnerEditing === `${match.id}_team2`
        ? match.team2
        : null;

  return (
    <div className={`bracket-match-wrap ${isEditing ? "editing" : ""}`}>
      <div className="bracket-match">
        {match.bangladeshTime?.label && (
          <div className="bracket-match-meta">{match.bangladeshTime.label}</div>
        )}
        <TeamRow
          match={match}
          team={match.team1}
          side="team1"
          setWinnerEditing={setWinnerEditing}
        />
        <div className="match-divider" />
        <TeamRow
          match={match}
          team={match.team2}
          side="team2"
          setWinnerEditing={setWinnerEditing}
        />
      </div>

      {isRoundOf32 && (
        <div className="matchup-toggle-row">
          <button
            type="button"
            onClick={setMatchupEditing}
            className="btn-ghost action-button matchup-toggle-button"
          >
            {matchupEditing ? "Close matchup" : "Edit matchup"}
          </button>
        </div>
      )}

      {matchupEditing && (
        <MatchupEditor
          match={match}
          options={roundOf32Teams}
          onSave={onSaveMatchup}
          onCancel={setMatchupEditing}
        />
      )}

      {editingTeam && !matchupEditing && (
        <div className="advance-popover">
          <button
            onClick={() => onSelectWinner(match.id, editingTeam)}
            className="btn-primary action-button"
            style={{
              fontSize: 10,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            }}
          >
            Advance {editingTeam.split(" ")[0]}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Bracket({
  knockoutMatches,
  setKnockoutWinner,
  roundOf32Teams,
  setRoundOf32Matchup,
}) {
  const [winnerEditing, setWinnerEditing] = useState(null);
  const [matchupEditing, setMatchupEditing] = useState(null);
  const roundOrder = [
    "Round of 32",
    "Round of 16",
    "Quarter-finals",
    "Semi-finals",
    "Final",
    "3rd Place",
  ];
  const gapMap = {
    "Round of 32": 16,
    "Round of 16": 16,
    "Quarter-finals": 32,
    "Semi-finals": 64,
    Final: 16,
    "3rd Place": 16,
  };
  const rounds = roundOrder
    .map((name) => ({
      name,
      matches: knockoutMatches.filter((match) => match.round === name),
    }))
    .filter((round) => round.matches.length > 0);

  const handleSelectWinner = (matchId, winner) => {
    setKnockoutWinner(matchId, winner);
    setWinnerEditing(null);
  };

  const handleToggleWinnerEditing = (value) => {
    setMatchupEditing(null);
    setWinnerEditing((current) => (current === value ? null : value));
  };

  const handleToggleMatchupEditing = (matchId) => {
    setWinnerEditing(null);
    setMatchupEditing((current) => (current === matchId ? null : matchId));
  };

  const handleSaveMatchup = (matchId, team1, team2) => {
    setRoundOf32Matchup(matchId, team1, team2);
    setMatchupEditing(null);
    setWinnerEditing(null);
  };

  return (
    <div className="bracket-scroll">
      <div className="bracket-board">
        {rounds.map((round, index) => {
          const isLast = index === rounds.length - 1;
          const gap = gapMap[round.name] ?? 16;

          return (
            <div key={round.name} className="bracket-round-wrap">
              <div className="bracket-round">
                <div className="round-label">
                  <div>{round.name}</div>
                  <span />
                </div>

                <div className="round-matches" style={{ gap }}>
                  {round.matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      onSelectWinner={handleSelectWinner}
                      winnerEditing={winnerEditing}
                      setWinnerEditing={handleToggleWinnerEditing}
                      matchupEditing={matchupEditing === match.id}
                      setMatchupEditing={() =>
                        handleToggleMatchupEditing(match.id)
                      }
                      onSaveMatchup={handleSaveMatchup}
                      roundOf32Teams={roundOf32Teams}
                    />
                  ))}
                </div>
              </div>

              {!isLast && (
                <div className="bracket-connector">
                  <div />
                  <span>&gt;</span>
                  <div />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
