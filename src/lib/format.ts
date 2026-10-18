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

export function stashDotClass(color: string) {
  const known = [
    "slate",
    "blue",
    "green",
    "amber",
    "red",
    "violet",
    "pink",
    "teal",
  ] as const;
  const match = known.find((item) => item === color) ?? "slate";
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
