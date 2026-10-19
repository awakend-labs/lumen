"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function sectionId(title: string) {
  return title.toLowerCase().replaceAll(" ", "-");
}

export function SectionNav({ sections }: { sections: string[]; }) {
  const [active, setActive] = useState(sections[0]);
  const sectionKey = sections.join("|");
  useEffect(() => {
    const titles = sectionKey.split("|");
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting);
      if (visible[0]) setActive(titles.find((title) => sectionId(title) === visible[0].target.id) ?? titles[0]);
    }, { rootMargin: "-80px 0px -55% 0px", threshold: 0 });
    titles.forEach((title) => { const element = document.getElementById(sectionId(title)); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [sectionKey]);

  return (
    <nav aria-label="On this page" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
      <p className="eyebrow mb-4 hidden lg:block">On this page</p>
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-3 lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-l lg:pb-0">
        {sections.map((title, index) => <a key={title} href={`#${sectionId(title)}`} onClick={() => setActive(title)} aria-current={active === title ? "location" : undefined} className={cn("flex shrink-0 items-center gap-3 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted hover:text-foreground lg:-ml-px lg:rounded-l-none lg:border-l-2", active === title ? "border-primary bg-muted/60 font-medium text-foreground" : "border-transparent text-muted-foreground")}>
          <span className="hidden font-mono text-[9px] opacity-50 lg:inline">{String(index + 1).padStart(2, "0")}</span>{title}</a>)}
      </div>
    </nav>
  );
}
