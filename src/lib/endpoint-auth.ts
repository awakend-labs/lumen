import type { EndpointRecord, ProjectAuth } from "./types";

/** Resolve inheritance at read time so project changes reach every inheriting endpoint. */
export function resolveEndpointAuth(endpoint: { authScheme?: EndpointRecord["authScheme"] }, projectAuth?: ProjectAuth): ProjectAuth | undefined {
  if (endpoint.authScheme == null || endpoint.authScheme === projectAuth?.scheme) return projectAuth;
  return {
    scheme: endpoint.authScheme,
    headerName: endpoint.authScheme === "session_token" ? "session_token" : "X-API-Key",
    location: "header",
    description: "",
  };
}
