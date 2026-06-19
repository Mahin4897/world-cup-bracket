const DHAKA_TIME_ZONE = "Asia/Dhaka";

function parseMatchDateTime(date, time) {
  if (!date || !time) return null;

  const match = time.match(/^(\d{1,2}):(\d{2})\s+UTC([+-]\d{1,2})$/i);
  if (!match) return null;

  const [, hourText, minuteText, offsetText] = match;
  const [year, month, day] = date.split("-").map(Number);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const offset = Number(offsetText);

  if (
    [year, month, day, hour, minute, offset].some((value) =>
      Number.isNaN(value),
    )
  ) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, hour - offset, minute));
}

export function getBangladeshMatchInfo(date, time) {
  const parsed = parseMatchDateTime(date, time);
  if (!parsed) {
    return {
      rawDate: date || "",
      rawTime: time || "",
      dateLabel: date || "",
      timeLabel: time || "",
      label: [date, time].filter(Boolean).join(" • "),
    };
  }

  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);

  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(parsed);

  return {
    rawDate: date,
    rawTime: time,
    dateLabel,
    timeLabel,
    label: `${dateLabel} • ${timeLabel} BDT`,
  };
}
