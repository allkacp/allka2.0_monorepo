import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachReadOnlyGuard, CutoverMiddleware, CutoverReadOnlyViolation } from "./read-only-guard";

class FakePrismaClient {
  middlewares: CutoverMiddleware[] = [];
  $use(middleware: CutoverMiddleware) {
    this.middlewares.push(middleware);
  }
  async run(params: { model?: string; action: string }, terminal: () => Promise<unknown>) {
    const chain = this.middlewares.reduceRight<() => Promise<unknown>>(
      (next, mw) => () => mw(params, next as never),
      terminal,
    );
    return chain();
  }
}

describe("attachReadOnlyGuard", () => {
  for (const action of [
    "create",
    "createMany",
    "update",
    "updateMany",
    "upsert",
    "delete",
    "deleteMany",
    "executeRaw",
    "executeRawUnsafe",
  ]) {
    it(`blocks ${action} before it reaches the database`, async () => {
      const client = attachReadOnlyGuard(new FakePrismaClient());
      let terminalRan = false;
      await assert.rejects(
        () =>
          client.run({ model: "User", action }, async () => {
            terminalRan = true;
            return "should never run";
          }),
        CutoverReadOnlyViolation,
      );
      assert.equal(terminalRan, false, "the underlying write must never execute");
    });
  }

  for (const action of ["findMany", "findFirst", "findUnique", "count", "groupBy", "aggregate", "queryRaw"]) {
    it(`allows ${action} through untouched`, async () => {
      const client = attachReadOnlyGuard(new FakePrismaClient());
      const result = await client.run({ model: "User", action }, async () => "ok");
      assert.equal(result, "ok");
    });
  }

  it("names the model and action in the error message", async () => {
    const client = attachReadOnlyGuard(new FakePrismaClient());
    await assert.rejects(
      () => client.run({ model: "Project", action: "deleteMany" }, async () => "x"),
      /Project\.deleteMany/,
    );
  });

  it("names raw SQL writes without a model", async () => {
    const client = attachReadOnlyGuard(new FakePrismaClient());
    await assert.rejects(
      () => client.run({ model: undefined, action: "executeRawUnsafe" }, async () => "x"),
      /\(raw\)\.executeRawUnsafe/,
    );
  });
});
