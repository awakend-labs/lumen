export function nextResponseStatus(responses: { statusCode: number }[], method: string): number | undefined {
  const used = new Set(responses.map(response => response.statusCode));
  return [method === "POST" ? 201 : 200, 200, 201, 202, 204, 400, 401, 403, 404, 409, 422, 429, 500, 503,
    ...Array.from({ length: 500 }, (_, index) => index + 100)].find(code => !used.has(code));
}
