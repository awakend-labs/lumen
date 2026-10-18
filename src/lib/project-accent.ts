export const PROJECT_ACCENTS = [
  {
    bar: "bg-stash-blue",
    tile: "bg-stash-blue/15 text-stash-blue",
    icon: "text-stash-blue",
    hover: "hover:border-stash-blue/50",
  },
  {
    bar: "bg-stash-green",
    tile: "bg-stash-green/15 text-stash-green",
    icon: "text-stash-green",
    hover: "hover:border-stash-green/50",
  },
  {
    bar: "bg-stash-violet",
    tile: "bg-stash-violet/15 text-stash-violet",
    icon: "text-stash-violet",
    hover: "hover:border-stash-violet/50",
  },
  {
    bar: "bg-stash-amber",
    tile: "bg-stash-amber/15 text-stash-amber",
    icon: "text-stash-amber",
    hover: "hover:border-stash-amber/50",
  },
  {
    bar: "bg-stash-pink",
    tile: "bg-stash-pink/15 text-stash-pink",
    icon: "text-stash-pink",
    hover: "hover:border-stash-pink/50",
  },
  {
    bar: "bg-stash-teal",
    tile: "bg-stash-teal/15 text-stash-teal",
    icon: "text-stash-teal",
    hover: "hover:border-stash-teal/50",
  },
  {
    bar: "bg-stash-red",
    tile: "bg-stash-red/15 text-stash-red",
    icon: "text-stash-red",
    hover: "hover:border-stash-red/50",
  },
  {
    bar: "bg-stash-slate",
    tile: "bg-stash-slate/15 text-stash-slate",
    icon: "text-stash-slate",
    hover: "hover:border-stash-slate/50",
  },
] as const;

export function accentFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PROJECT_ACCENTS[hash % PROJECT_ACCENTS.length];
}
