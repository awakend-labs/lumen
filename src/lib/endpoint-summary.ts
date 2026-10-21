import type { EndpointRecord, EndpointSummary } from "./types";

export function toEndpointSummary(endpoint: EndpointRecord): EndpointSummary {
  const { id, projectId, stashId, groupId, name, method, path, baseUrl, version,
    description, tags, access, isDeprecated, order, createdAt, updatedAt } = endpoint;
  return { id, projectId, stashId, groupId, name, method, path, baseUrl, version,
    description, tags, access, isDeprecated, order, createdAt, updatedAt,
    firstResponse: endpoint.responses[0] ? { statusCode: endpoint.responses[0].statusCode, description: endpoint.responses[0].description } : null };
}
