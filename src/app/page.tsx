import type { Metadata } from "next";
import { preload } from "react-dom";
import heroFont from "./hero-font.module.css";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChevronDown, FolderOpen, Layers, Link2, ListTree, Terminal, Users } from "lucide-react";
import { LumenMark } from "@/components/lumen-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LandingDemo } from "./landing-demo";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Lumen — A clear home for your APIs",
  description: "Organize endpoints, document requests and responses, and give your team a shared API reference. Meet Lumen, the API documentation workspace.",
};

const questions = [
  ["How is a workspace organized?", "Create a project for your app or service, then add API stashes for related endpoints. Optional API groups give you another level inside a stash. Keep things simple or add structure as your API grows."],
  ["Can I start with an existing request?", "Yes. Import a cURL command into a stash to start an endpoint, then add descriptions, fields, schemas, and response examples. You can also create endpoints manually."],
  ["How do I share a project with my team?", "Create a project invitation link for an editor or viewer. Editors can maintain the documentation; viewers can read it. Manage members and revoke invitations from your project settings."],
  ["Does Lumen send API requests?", "Lumen is a documentation workspace. Use it to describe and share your APIs, including authentication, request fields, and responses. It does not execute requests."],
];

export default function HomePage() {
  preload("/fonts/plus-jakarta-sans/plus-jakarta-sans-latin-500-6c51489a4a365814.woff2", { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Skip to content</a>
    <header className={styles.header}>
      <Link href="/" className={styles.logo} aria-label="Lumen home"><LumenMark /><span>Lumen.</span></Link>
      <nav className={styles.sectionNav} aria-label="Explore Lumen"><a href="#workspace">Workspace</a><a href="#collaboration">Collaboration</a><a href="#questions">FAQs</a></nav>
      <div className={styles.headerActions}><span className={styles.themeToggle}><ThemeToggle /></span><Link href="/login" className={styles.signIn}>Sign in</Link><Button asChild><Link href="/signup">Get started<ArrowUpRight /></Link></Button></div>
    </header>
    <main id="main">
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroTop}>
          <div><p className={styles.eyebrow}><span />THE API DOCUMENTATION WORKSPACE</p><h1 id="hero-title">Your APIs.<br />Clearly understood.</h1></div>
          <div className={styles.heroCopy}><p className={`${styles.heroLead} ${heroFont.tagline}`}>Every endpoint has a story.<br />Give your team the whole picture.</p><p className={styles.body}>Bring routes, request details, and responses together in one organized workspace.</p><div className={styles.actions}><Button asChild size="lg"><Link href="/signup">Start documenting<ArrowRight /></Link></Button><a href="#workspace" className={styles.textLink}>Explore the workspace <span aria-hidden>↗</span></a></div></div>
        </div>
        <LandingDemo />
        <div className={styles.previewCaption}><span><span className={styles.liveDot} />An example workspace. Select an endpoint to explore.</span><span>Built around the details that matter.</span></div>
      </section>
      <section id="workspace" className={styles.structure} aria-labelledby="structure-title">
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>01 / A PLACE FOR EVERY ROUTE</p><h2 id="structure-title">Structure that follows<br />the way you build.</h2><p className={styles.body}>One app or several services. A handful of routes or a growing API. Keep related work together, with just the organization you need.</p><a href="/signup" className={styles.textLink}>Build your workspace <ArrowRight size={16} /></a></div>
        <div className={styles.structureMap}>
          <div className={styles.treeProject}><FolderOpen size={21} /><strong>Snipful</strong><span>Project</span></div>
          <div className={styles.treeBranch}><div className={styles.treeRow}><Layers size={18} /><strong>Better Auth</strong><span>API stash</span></div><div className={styles.treeBranch}><div className={styles.treeRow}><ListTree size={17} /><strong>Email authentication</strong><span>API group</span></div><div className={styles.routeRow}><b>POST</b>Sign up<code>/auth/sign-up</code></div><div className={styles.routeRow}><b>POST</b>Sign in<code>/auth/sign-in</code></div><div className={styles.treeRow}><ListTree size={17} /><strong>Session management</strong><span>API group</span></div><div className={styles.routeRow}><b data-method="get">GET</b>Current session<code>/auth/session</code></div></div><div className={styles.treeRow}><Layers size={18} /><strong>Content API</strong><span>API stash</span></div></div>
          <p className={styles.mapNote}><Check size={15} />Groups are optional. Clarity isn’t.</p>
        </div>
      </section>
      <section className={styles.workflow} aria-labelledby="workflow-title">
        <div className={styles.workflowHeading}><p className={styles.eyebrow}>02 / FROM REQUEST TO REFERENCE</p><h2 id="workflow-title">Less explaining.<br /><span>More building.</span></h2><p className={styles.body}>Give the next person everything they need to work with your API, right where they expect to find it.</p></div>
        <div className={styles.workflowRows}>
          {[
            {
              step: "01",
              title: "Start with what you have.",
              body: "Import cURL or add an endpoint manually. Define the method, route, base URL, and version.",
              icon: <Terminal size={22} aria-hidden />,
            },
            {
              step: "02",
              title: "Make the contract clear.",
              body: "Document headers, parameters, and body fields. Add schemas and examples for each response.",
              icon: <span className={styles.workflowIconGlyph} aria-hidden>{"{ }"}</span>,
            },
            {
              step: "03",
              title: "Keep the context close.",
              body: "Explain authentication and access. Mark required fields, describe enum values, and track stash status.",
              icon: <ListTree size={22} aria-hidden />,
            },
          ].map((item) => (
            <article key={item.step} className={styles.workflowRow}>
              <span className={styles.step}>{item.step}</span>
              <div className={styles.workflowCopy}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
              <span className={styles.workflowIcon}>{item.icon}</span>
            </article>
          ))}
        </div>
      </section>
      <section id="collaboration" className={styles.collaboration} aria-labelledby="team-title">
        <div className={styles.teamVisual}>
          <div className={styles.teamTop}><span><Users size={18} />Project access</span><span className={styles.exampleLabel}>EXAMPLE</span></div>
          {[{ initials: "AS", name: "Aaradhya", detail: "Workspace owner", role: "Owner" }, { initials: "JL", name: "Jamie", detail: "Maintains the API docs", role: "Editor" }, { initials: "SK", name: "Sam", detail: "Builds with the API", role: "Viewer" }].map(person => <div className={styles.person} key={person.role}><span className={styles.avatar}>{person.initials}</span><div><strong>{person.name}</strong><small>{person.detail}</small></div><span className={styles.role}>{person.role}</span></div>)}
          <div className={styles.inviteNote}><Link2 size={17} /><span>One invitation link.<br /><strong>The right level of access.</strong></span></div>
        </div>
        <div className={styles.sectionIntro}><p className={styles.eyebrow}>03 / A SHARED UNDERSTANDING</p><h2 id="team-title">The same reference.<br />For the whole team.</h2><p className={styles.body}>The person writing the endpoint and the person using it should have the same context. Invite teammates into your project with a link.</p><ul className={styles.checkList}><li><Check />Editors help keep documentation up to date.</li><li><Check />Viewers get a clear place to find answers.</li><li><Check />You manage membership and invitations.</li></ul></div>
      </section>
      <section id="questions" className={styles.faq} aria-labelledby="faq-title"><div className={styles.faqIntro}><div className={styles.faqLabel}><span className={styles.questionMark} aria-hidden="true">?</span><p className={styles.eyebrow}>A FEW GOOD QUESTIONS</p></div><h2 id="faq-title">A little context.<br /><span>A clearer start.</span></h2><p className={styles.faqDescription}>From your first endpoint to your next teammate. Here’s how Lumen fits into your workflow.</p><a href="#workspace" className={styles.textLink}>Take a look inside<ArrowUpRight size={15} /></a></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={18} /></summary><p>{answer}</p></details>)}</div></section>
      <section className={styles.closing} aria-labelledby="closing-title"><div><p className={styles.eyebrow}>LESS GUESSWORK. BETTER DOCUMENTATION.</p><h2 id="closing-title">Make your next API<br />easy to understand.</h2><p>Create a project. Add your first endpoint. Bring your team in.</p><Button asChild size="lg" className={styles.closingButton}><Link href="/signup">Create your workspace<ArrowUpRight /></Link></Button></div><div className={styles.brandArtwork} aria-hidden><i /><i /><i /><i /></div></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.logo}><LumenMark /><span>Lumen.</span></Link><p>A clear home for your APIs.</p><a href="/login">Sign in <ArrowUpRight size={14} /></a></footer>
  </div>;
}
