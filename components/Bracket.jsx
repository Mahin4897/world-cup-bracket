"use client";

import { Fragment, useState } from "react";
import TeamFlag from "./TeamFlag";
import { getTeamShortName } from "@/data/teams";

function optionLabel(team) {
  const group = team.group?.replace(/^Group\s*/i, "");
  return group ? `${team.name} (Group ${group})` : team.name;
}

function splitRound(matches) {
  const midpoint = Math.ceil(matches.length / 2);
  return [matches.slice(0, midpoint), matches.slice(midpoint)];
}

function roundClassName(title) {
  return `round-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function directWinnerSourceIds(match) {
  return [match?.team1Placeholder, match?.team2Placeholder].flatMap((value) =>
    typeof value === "string" && value.startsWith("W")
      ? [`M${value.slice(1)}`]
      : [],
  );
}

function orderRoundOf32FromRoundOf16(roundOf16Matches, matchesById) {
  return roundOf16Matches.flatMap((match) =>
    directWinnerSourceIds(match)
      .map((id) => matchesById.get(id))
      .filter(Boolean),
  );
}

function orderNextRoundFromPairs(previousRoundMatches, candidateMatches) {
  const next = [];

  for (let index = 0; index < previousRoundMatches.length; index += 2) {
    const sourceIds = [
      previousRoundMatches[index],
      previousRoundMatches[index + 1],
    ]
      .filter(Boolean)
      .map((match) => match.id);

    if (sourceIds.length < 2) continue;

    const sourceSet = new Set(sourceIds);
    const match = candidateMatches.find((candidate) => {
      const candidateSources = directWinnerSourceIds(candidate);
      return (
        candidateSources.length === sourceIds.length &&
        candidateSources.every((id) => sourceSet.has(id))
      );
    });

    if (match) next.push(match);
  }

  return next;
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
    <div
      className={`bracket-match-wrap ${isEditing ? "editing" : ""} ${
        isRoundOf32 ? "has-side-matchup-toggle" : ""
      }`}
    >
      <div
        className={`bracket-match-shell ${isRoundOf32 ? "has-side-action" : ""}`}
      >
        <div className="bracket-match">
          {match.bangladeshTime?.label && (
            <div className="bracket-match-meta">
              {match.bangladeshTime.label}
            </div>
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
          <div className="matchup-toggle-row side-toggle">
            <button
              type="button"
              onClick={setMatchupEditing}
              className="btn-ghost action-button matchup-toggle-button"
            >
              {matchupEditing ? "Close matchup" : "Edit matchup"}
            </button>
          </div>
        )}
      </div>

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

function RoundColumn({
  title,
  roundClass,
  matches,
  gap,
  onSelectWinner,
  winnerEditing,
  setWinnerEditing,
  matchupEditing,
  setMatchupEditing,
  onSaveMatchup,
  roundOf32Teams,
}) {
  if (!matches.length) return null;

  return (
    <div className={`bracket-round ${roundClass || ""}`}>
      <div className="round-label">
        <div>{title}</div>
        <span />
      </div>

      <div className="round-matches" style={{ gap }}>
        {matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            onSelectWinner={onSelectWinner}
            winnerEditing={winnerEditing}
            setWinnerEditing={setWinnerEditing}
            matchupEditing={matchupEditing === match.id}
            setMatchupEditing={() => setMatchupEditing(match.id)}
            onSaveMatchup={onSaveMatchup}
            roundOf32Teams={roundOf32Teams}
          />
        ))}
      </div>
    </div>
  );
}

function CenterRounds({
  finalMatch,
  bronzeMatch,
  onSelectWinner,
  winnerEditing,
  setWinnerEditing,
  onSaveMatchup,
  roundOf32Teams,
}) {
  return (
    <div className="bracket-center-rounds">
      {finalMatch && (
        <RoundColumn
          title="Final"
          roundClass="round-final"
          matches={[finalMatch]}
          gap={16}
          onSelectWinner={onSelectWinner}
          winnerEditing={winnerEditing}
          setWinnerEditing={setWinnerEditing}
          matchupEditing={null}
          setMatchupEditing={() => {}}
          onSaveMatchup={onSaveMatchup}
          roundOf32Teams={roundOf32Teams}
        />
      )}

      {bronzeMatch && (
        <RoundColumn
          title="3rd Place"
          roundClass="round-third"
          matches={[bronzeMatch]}
          gap={16}
          onSelectWinner={onSelectWinner}
          winnerEditing={winnerEditing}
          setWinnerEditing={setWinnerEditing}
          matchupEditing={null}
          setMatchupEditing={() => {}}
          onSaveMatchup={onSaveMatchup}
          roundOf32Teams={roundOf32Teams}
        />
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

  const rounds = {
    "Round of 32": knockoutMatches.filter(
      (match) => match.round === "Round of 32",
    ),
    "Round of 16": knockoutMatches.filter(
      (match) => match.round === "Round of 16",
    ),
    "Quarter-finals": knockoutMatches.filter(
      (match) => match.round === "Quarter-finals",
    ),
    "Semi-finals": knockoutMatches.filter(
      (match) => match.round === "Semi-finals",
    ),
    Final: knockoutMatches.filter((match) => match.round === "Final"),
    "3rd Place": knockoutMatches.filter((match) => match.round === "3rd Place"),
  };

  const [sortedLeftR16, sortedRightR16] = splitRound(rounds["Round of 16"]);
  const matchesById = new Map(
    knockoutMatches.map((match) => [match.id, match]),
  );

  const leftR16 = sortedLeftR16;
  const rightR16 = sortedRightR16;
  const leftR32 = orderRoundOf32FromRoundOf16(leftR16, matchesById);
  const rightR32 = orderRoundOf32FromRoundOf16(rightR16, matchesById);
  const leftQf = orderNextRoundFromPairs(leftR16, rounds["Quarter-finals"]);
  const rightQf = orderNextRoundFromPairs(rightR16, rounds["Quarter-finals"]);
  const [leftSf, rightSf] = splitRound(rounds["Semi-finals"]);
  const finalMatch = rounds.Final[0] || null;
  const bronzeMatch = rounds["3rd Place"][0] || null;

  const gapMap = {
    "Round of 32": 16,
    "Round of 16": 116,
    "Quarter-finals": 316,
    "Semi-finals": 0,
  };

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

  const leftColumns = [
    { title: "Round of 32", matches: leftR32 },
    { title: "Round of 16", matches: leftR16 },
    { title: "Quarter-finals", matches: leftQf },
    { title: "Semi-finals", matches: leftSf },
  ];

  const rightColumns = [
    { title: "Semi-finals", matches: rightSf },
    { title: "Quarter-finals", matches: rightQf },
    { title: "Round of 16", matches: rightR16 },
    { title: "Round of 32", matches: rightR32 },
  ];

  return (
    <div className="bracket-scroll">
      <div className="bracket-board bracket-board-split">
        <div className="bracket-side left">
          {leftColumns.map((column, index) => (
            <Fragment key={column.title}>
              <RoundColumn
                title={column.title}
                roundClass={roundClassName(column.title)}
                matches={column.matches}
                gap={gapMap[column.title] ?? 16}
                onSelectWinner={handleSelectWinner}
                winnerEditing={winnerEditing}
                setWinnerEditing={handleToggleWinnerEditing}
                matchupEditing={matchupEditing}
                setMatchupEditing={handleToggleMatchupEditing}
                onSaveMatchup={handleSaveMatchup}
                roundOf32Teams={roundOf32Teams}
              />
            </Fragment>
          ))}
        </div>

        <CenterRounds
          finalMatch={finalMatch}
          bronzeMatch={bronzeMatch}
          onSelectWinner={handleSelectWinner}
          winnerEditing={winnerEditing}
          setWinnerEditing={handleToggleWinnerEditing}
          onSaveMatchup={handleSaveMatchup}
          roundOf32Teams={roundOf32Teams}
        />

        <div className="bracket-side right">
          {rightColumns.map((column, index) => (
            <Fragment key={column.title}>
              <RoundColumn
                title={column.title}
                roundClass={roundClassName(column.title)}
                matches={column.matches}
                gap={gapMap[column.title] ?? 16}
                onSelectWinner={handleSelectWinner}
                winnerEditing={winnerEditing}
                setWinnerEditing={handleToggleWinnerEditing}
                matchupEditing={matchupEditing}
                setMatchupEditing={handleToggleMatchupEditing}
                onSaveMatchup={handleSaveMatchup}
                roundOf32Teams={roundOf32Teams}
              />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
