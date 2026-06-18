import { getTeamFlagCode } from "@/data/teams";

export default function TeamFlag({ name, className = "", title }) {
  const code = getTeamFlagCode(name);

  if (!code) {
    return <span className={`team-flag-fallback ${className}`.trim()} />;
  }

  return (
    <span
      className={`fi fi-${code} team-flag-icon ${className}`.trim()}
      title={title || name}
      aria-label={title || name}
    />
  );
}
