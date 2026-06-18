import TeamFlag from "./TeamFlag";
import { getTeamShortName } from "@/data/teams";

export default function MatchInput({ home, away, score, onChange }) {
  const homeGoals = score?.homeGoals ?? 0;
  const awayGoals = score?.awayGoals ?? 0;
  const homeWin = score && homeGoals > awayGoals;
  const awayWin = score && awayGoals > homeGoals;

  const inputStyle = (winner) => ({
    width: 30,
    height: 26,
    textAlign: "center",
    fontSize: 11,
    fontWeight: 700,
    borderRadius: 6,
    outline: "none",
    transition: "all 0.15s",
    WebkitAppearance: "none",
    MozAppearance: "textfield",
    background: winner ? "var(--gold-muted)" : "rgba(0,0,0,0.4)",
    border: `1px solid ${
      winner ? "var(--border-gold)" : "rgba(255,255,255,0.1)"
    }`,
    color: winner ? "var(--gold)" : "var(--text-primary)",
  });

  return (
    <div className="match-input-row">
      <div className={`match-team home ${awayWin ? "dimmed" : ""}`}>
        <span className="team-name">{getTeamShortName(home)}</span>
        <TeamFlag name={home} className="team-flag" />
      </div>

      <div className="score-inputs">
        <input
          type="number"
          min="0"
          value={homeGoals}
          onChange={(event) =>
            onChange(parseInt(event.target.value, 10) || 0, awayGoals)
          }
          style={inputStyle(homeWin)}
        />
        <span>-</span>
        <input
          type="number"
          min="0"
          value={awayGoals}
          onChange={(event) =>
            onChange(homeGoals, parseInt(event.target.value, 10) || 0)
          }
          style={inputStyle(awayWin)}
        />
      </div>

      <div className={`match-team away ${homeWin ? "dimmed" : ""}`}>
        <TeamFlag name={away} className="team-flag" />
        <span className="team-name">{getTeamShortName(away)}</span>
      </div>
    </div>
  );
}
