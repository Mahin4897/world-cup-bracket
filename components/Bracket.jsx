"use client";

import { useState } from "react";
import TeamFlag from "./TeamFlag";
import { getTeamShortName } from "@/data/teams";

function TBDCard() {
  return (
    <div className="bracket-match tbd-match">
      <span>TBD</span>
    </div>
  );
}

function TeamRow({ match, team, side, setEditing }) {
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
      onClick={() => setEditing(`${match.id}_${side}`)}
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

function MatchCard({ match, onSelect, editing, setEditing }) {
  if (!match.team1 && !match.team2) return <TBDCard />;

  const isEditing = editing?.startsWith(match.id);
  const editingTeam =
    editing === `${match.id}_team1`
      ? match.team1
      : editing === `${match.id}_team2`
        ? match.team2
        : null;

  return (
    <div className={`bracket-match-wrap ${isEditing ? "editing" : ""}`}>
      <div className="bracket-match">
        <TeamRow
          match={match}
          team={match.team1}
          side="team1"
          setEditing={setEditing}
        />
        <div className="match-divider" />
        <TeamRow
          match={match}
          team={match.team2}
          side="team2"
          setEditing={setEditing}
        />
      </div>

      {editingTeam && (
        <div className="advance-popover">
          <button
            onClick={() => onSelect(match.id, editingTeam)}
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

export default function Bracket({ knockoutMatches, setKnockoutWinner }) {
  const [editing, setEditing] = useState(null);
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

  const handleSelect = (matchId, winner) => {
    setKnockoutWinner(matchId, winner);
    setEditing(null);
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
                      onSelect={handleSelect}
                      editing={editing}
                      setEditing={(value) =>
                        setEditing(editing === value ? null : value)
                      }
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
