export function nextResponseStatus(responses: { statusCode: number }[], method: string): number | undefined {
  const used = new Set(responses.map(response => response.statusCode));
  const first = method === "POST" ? 201 : 200;
  return Array.from({ length: 500 }, (_, index) => 100 + (first - 100 + index) % 500)
    .find(code => !used.has(code));
}
