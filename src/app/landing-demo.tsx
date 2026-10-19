"use client";

import { useState } from "react";
import { ArrowUpRight, Braces, ChevronDown, FolderOpen, Layers, ListTree } from "lucide-react";
import styles from "./landing.module.css";

const endpoints = [
  { name: "Sign up", method: "POST", path: "/v1/auth/sign-up", description: "Create an account with an email address and password.", status: "201 Created", fields: [["email", "string", "A valid email address"], ["password", "string", "At least 8 characters"], ["name", "string", "The account display name"]], example: '{\n  "user": {\n    "id": "usr_01",\n    "email": "jamie@example.com",\n    "name": "Jamie"\n  }\n}' },
  { name: "Sign in", method: "POST", path: "/v1/auth/sign-in", description: "Authenticate an existing account and create a session.", status: "200 OK", fields: [["email", "string", "Your account email address"], ["password", "string", "Your account password"]], example: '{\n  "user": {\n    "id": "usr_01",\n    "name": "Jamie"\n  },\n  "authenticated": true\n}' },
  { name: "Current session", method: "GET", path: "/v1/auth/session", description: "Read the signed-in user and the current session.", status: "200 OK", fields: [], example: '{\n  "user": {\n    "id": "usr_01",\n    "name": "Jamie"\n  },\n  "expiresAt": "2026-12-01T00:00:00Z"\n}' },
];

export function LandingDemo() {
  const [selected, setSelected] = useState(0);
  const endpoint = endpoints[selected];
  return <div className={styles.demo} aria-label="Interactive example API documentation">
    <div className={styles.demoBar}><span className={styles.windowDots} aria-hidden><i /><i /><i /></span><span>Snipful <span className={styles.breadcrumbSlash}>/</span> Better Auth</span><span className={styles.exampleLabel}>INTERACTIVE PREVIEW</span></div>
    <div className={styles.demoBody}>
      <aside className={styles.demoSidebar}><div className={styles.demoWorkspace}><span>S</span>Snipful workspace</div><p className={styles.sidebarLabel}>PROJECTS</p><div className={styles.sidebarProject}><ChevronDown size={13} /><FolderOpen size={15} />Snipful</div><div className={styles.sidebarStash}><Layers size={14} />Better Auth</div><div className={styles.sidebarGroup}><ListTree size={13} />Endpoints</div><div className={styles.endpointPicker}>{endpoints.map((item, index) => <button key={item.name} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)}><span data-method={item.method.toLowerCase()}>{item.method}</span>{item.name}</button>)}</div><p className={styles.sidebarFoot}>Your endpoints.<br />All in the right place.</p></aside>
      <div className={styles.endpointDetail} aria-live="polite" aria-atomic="true"><div className={styles.endpointHeading}><div><p className={styles.endpointCrumb}>Better Auth / {selected === 2 ? "Sessions" : "Email authentication"}</p><h2>{endpoint.name}</h2></div><span className={styles.documented}><span />Documented</span></div><p className={styles.endpointDescription}>{endpoint.description}</p><div className={styles.endpointPath}><span data-method={endpoint.method.toLowerCase()}>{endpoint.method}</span><code>{endpoint.path}</code><span className={styles.version}>v1</span></div><div className={styles.contract}><div><h3><Braces size={15} />{selected === 2 ? "Authentication" : "Request body"}<span>{selected === 2 ? "SESSION" : "JSON"}</span></h3>{selected === 2 ? <div className={styles.authExample}><strong>Session cookie</strong><p>A valid session cookie is required to return the current user.</p><span>Required</span></div> : <div className={styles.fieldTable}>{endpoint.fields.map(([name, type, detail]) => <div key={name}><div><code>{name}</code><span>{type}</span><b>required</b></div><p>{detail}</p></div>)}</div>}</div><div><h3>Response<span className={styles.success}>{endpoint.status}</span></h3><pre><code>{endpoint.example}</code></pre><p className={styles.exampleFoot}>A concrete example. A clearer contract.</p></div></div></div>
    </div><div className={styles.demoBottom}><span>Example data · No requests are sent</span><a href="/signup">Make it your workspace<ArrowUpRight size={14} /></a></div>
  </div>;
}

