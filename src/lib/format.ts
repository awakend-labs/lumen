export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
}

export function formatUpdatedLabel(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return `Updated ${formatRelativeTime(value)}`;
  }
  return `Updated ${formatDate(value)}`;
}

const STASH_COLOR_KEYS = [
  "slate",
  "blue",
  "green",
  "amber",
  "red",
  "violet",
  "pink",
  "teal",
] as const;

function normalizeStashColor(color: string) {
  return STASH_COLOR_KEYS.find((item) => item === color) ?? "slate";
}

export function stashDotClass(color: string) {
  const match = normalizeStashColor(color);
  return {
    slate: "bg-stash-slate",
    blue: "bg-stash-blue",
    green: "bg-stash-green",
    amber: "bg-stash-amber",
    red: "bg-stash-red",
    violet: "bg-stash-violet",
    pink: "bg-stash-pink",
    teal: "bg-stash-teal",
  }[match];
}

/** Color fill that stays put when the toggle is hovered or selected. */
export function stashSwatchButtonClass(color: string) {
  const match = normalizeStashColor(color);
  return {
    slate: "bg-stash-slate hover:bg-stash-slate data-[state=on]:bg-stash-slate",
    blue: "bg-stash-blue hover:bg-stash-blue data-[state=on]:bg-stash-blue",
    green: "bg-stash-green hover:bg-stash-green data-[state=on]:bg-stash-green",
    amber: "bg-stash-amber hover:bg-stash-amber data-[state=on]:bg-stash-amber",
    red: "bg-stash-red hover:bg-stash-red data-[state=on]:bg-stash-red",
    violet: "bg-stash-violet hover:bg-stash-violet data-[state=on]:bg-stash-violet",
    pink: "bg-stash-pink hover:bg-stash-pink data-[state=on]:bg-stash-pink",
    teal: "bg-stash-teal hover:bg-stash-teal data-[state=on]:bg-stash-teal",
  }[match];
}

