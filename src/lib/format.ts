export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
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
