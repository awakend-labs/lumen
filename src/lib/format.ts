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

/** Selected-state ring/background for stash color toggle items in dialogs. */
export function stashColorPickerItemClass(color: string) {
  const match = normalizeStashColor(color);
  return {
    slate:
      "data-[state=on]:border-stash-slate data-[state=on]:bg-stash-slate/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-slate/45",
    blue:
      "data-[state=on]:border-stash-blue data-[state=on]:bg-stash-blue/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-blue/45",
    green:
      "data-[state=on]:border-stash-green data-[state=on]:bg-stash-green/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-green/45",
    amber:
      "data-[state=on]:border-stash-amber data-[state=on]:bg-stash-amber/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-amber/45",
    red:
      "data-[state=on]:border-stash-red data-[state=on]:bg-stash-red/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-red/45",
    violet:
      "data-[state=on]:border-stash-violet data-[state=on]:bg-stash-violet/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-violet/45",
    pink:
      "data-[state=on]:border-stash-pink data-[state=on]:bg-stash-pink/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-pink/45",
    teal:
      "data-[state=on]:border-stash-teal data-[state=on]:bg-stash-teal/20 data-[state=on]:ring-2 data-[state=on]:ring-stash-teal/45",
  }[match];
}
