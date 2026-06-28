"use client";

import Bracket from "./Bracket";
import TeamFlag from "./TeamFlag";

function TeamPill({ team, variant = "winner" }) {
  const styles = {
    winner: {
      background: "var(--gold-muted)",
      border: "1px solid var(--border-gold)",
      color: "var(--gold)",
    },
    runner: {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.1)",
      color: "var(--text-secondary)",
    },
    third: {
      background: "rgba(255,255,255,0.02)",
      border: "1px dashed rgba(255,255,255,0.1)",
      color: "var(--text-muted)",
    },
  };
  const style = styles[variant];

  return (
    <span className="team-pill" style={style}>
      <TeamFlag name={team.name} className="team-pill-flag" />
      <span>{team.name}</span>
    </span>
  );
}

export default function KnockoutBracket({ tournament }) {
  const {
    knockoutMatches,
    setKnockoutWinner,
    setKnockoutScore,
    setRoundOf32Matchup,
    roundOf32Teams,
    knockoutScores,
    advancing,
    hasManualGroups,
    loading,
    saving,
  } = tournament;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Loading bracket...</p>
        </div>
      </div>
    );
  }

  const finalMatch = knockoutMatches.find((match) => match.round === "Final");
  const champion = finalMatch?.winner || null;

  return (
    <div>
      {champion && (
        <div className="mb-6 fade-up">
          <div className="max-w-xs mx-auto px-6 py-5 text-center rounded-lg champion-panel">
            <p className="champion-label">World Champion</p>
            <p
              className="display gold champion-name"
              style={{ fontSize: 44, lineHeight: 1 }}
            >
              <TeamFlag name={champion} className="champion-flag" />
              <span>{champion}</span>
            </p>
          </div>
        </div>
      )}

      {knockoutMatches.length > 0 && (
        <p className="bracket-help">
          Click a team, then <span>Advance</span> to pick the winner. In the
          <span> Round of 32</span>, use <span>Edit matchup</span> to reshuffle
          teams.
        </p>
      )}

      {hasManualGroups && !advancing.thirdQualifiersComplete && (
        <p className="bracket-help">
          Select <span>8 third-place qualifiers</span> in Group Stage to build
          the bracket
        </p>
      )}

      {saving && (
        <p className="save-pulse">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-pulse mr-1" />
          Saving...
        </p>
      )}

      {(advancing.winners.length > 0 || advancing.bestThirds.length > 0) && (
        <section className="advancing-panel">
          <p className="table-label">32 Advancing Teams</p>

          {advancing.winners.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p className="pill-section-label gold">Group Winners</p>
              <div className="team-pill-row">
                {advancing.winners.map((team) => (
                  <TeamPill key={team.name} team={team} variant="winner" />
                ))}
              </div>
            </div>
          )}

          {advancing.runnersUp.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p className="pill-section-label">Runners-up</p>
              <div className="team-pill-row">
                {advancing.runnersUp.map((team) => (
                  <TeamPill key={team.name} team={team} variant="runner" />
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="pill-section-label">Best 3rd-place</p>
            <div className="team-pill-row">
              {advancing.bestThirds.length === 0 ? (
                <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                  Enter group scores to see
                </span>
              ) : (
                advancing.bestThirds.map((team) => (
                  <TeamPill key={team.name} team={team} variant="third" />
                ))
              )}
            </div>
          </div>
        </section>
      )}

      <Bracket
        knockoutMatches={knockoutMatches}
        setKnockoutWinner={setKnockoutWinner}
        setKnockoutScore={setKnockoutScore}
        knockoutScores={knockoutScores}
        roundOf32Teams={roundOf32Teams}
        setRoundOf32Matchup={setRoundOf32Matchup}
      />
    </div>
  );
}
