---
name: testing-skill
description: Use when writing or running tests for the pizza app — unit, integration, contract, or E2E. Triggers on "vitest", "jest", "playwright", "e2e", "contract test", "test coverage".
---

# Testing Skill

## When to use
- Adding tests under any `__tests__/` or `*.spec.ts`
- Setting up Vitest config / Playwright config
- Contract testing between services (event schemas)
- Running LocalStack-backed integration tests

## Strategy
| Layer          | Tool         | Scope                                          |
|----------------|--------------|------------------------------------------------|
| Unit           | Vitest       | Zod schemas, pure logic, repositories (mocked) |
| Integration    | Vitest + LocalStack | Lambda handlers against real DynamoDB   |
| Contract       | Vitest       | Event payload schemas shared service-to-service|
| E2E            | Playwright   | Customer placement → kitchen → delivery flow  |
| Load           | Artillery    | Against LocalStack (Phase 6)                     |

## Vitest config (backend)
```ts
export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    coverage: { provider: "v8", reporter: ["text","html"], thresholds: { lines: 80 } }
  }
});
```

## Repository pattern (mockable)
```ts
export class OrderRepository {
  constructor(private db: DynamoDBDocumentClient = defaultClient) {}
  async create(input: CreateOrderInput) { /* put */ }
}
// test injects fake client
```

## LocalStack integration test
```ts
beforeAll(async () => {
  await seedMenuTable(); // awslocal via test helper
});
it("places order", async () => {
  const res = await handler({ body: JSON.stringify(validOrder) });
  expect(res.statusCode).toBe(201);
});
```

## E2E (Playwright via MCP for opencode)
```ts
test("full order flow", async ({ page }) => {
  await page.goto("/menu");
  await page.click("text=Margherita");
  await page.click("text=Add to cart");
  await page.click("text=Checkout");
  await expect(page).toHaveURL(/orders\/.+/);
});
```
opencode can use the `playwright` MCP server to drive these.

## Must-haves
- Every Lambda handler has unit tests for happy + Zod-failure + downstream-failure paths
- Event contracts (PizzaEvent schemas) tested in `packages/shared`
- Critical flows (order placement, payment, offer apply) require integration test
- E2E smoke test runs in CI against ephemeral LocalStack

## Anti-patterns to flag
- Tests calling real external (Stripe, partner) APIs → use mocks in CI
- Snapshot tests for large objects (brittle) → assert shape, not exact
- Skipping DLQ path tests (these are usually where prod fails)
- No coverage gate
