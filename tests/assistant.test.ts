import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appGuide,
  generateAppAnswer,
  isAppQuestion,
  scopeReply,
  AssistantError,
  appHelpAnswer,
  providerFailure,
} from "../lib/assistant.ts";
test("app help fallback recognizes product questions without answering unrelated topics", () => {
  assert.equal(isAppQuestion("How do I track my hotel booking?"), true);
  assert.equal(isAppQuestion("What is the capital of Japan?"), false);
  assert.equal(isAppQuestion("Write me a sorting algorithm"), false);
});
test("API uses explicit model and low reasoning, redirects outside scope and filters invented source IDs", async () => {
  const oldFetch = globalThis.fetch;
  const keys = ["AI_API_KEY", "AI_MODEL", "AI_REASONING_EFFORT"];
  const previous = keys.map((k) => process.env[k]);
  process.env.AI_API_KEY = "fixture-key";
  process.env.AI_MODEL = "fixture-model";
  process.env.AI_REASONING_EFFORT = "low";
  let inScope = false;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, "fixture-model");
    assert.equal(body.reasoning_effort, "low");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.ok(body.messages[0].content.includes("ONLY scope"));
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              in_scope: inScope,
              answer: "Model answer",
              source_ids: [appGuide.id, "invented-source"],
            }),
          },
        },
      ],
    });
  };
  try {
    const rejected = await generateAppAnswer("Write a poem", [appGuide]);
    assert.equal(rejected.answer, scopeReply);
    assert.deepEqual(rejected.sources, []);
    inScope = true;
    const answer = await generateAppAnswer("How do price alerts work?", [
      appGuide,
    ]);
    assert.equal(answer.answer, "Model answer");
    assert.deepEqual(answer.sources, [appGuide]);
    delete process.env.AI_MODEL;
    await assert.rejects(
      () => generateAppAnswer("My booking", [appGuide]),
      (error: unknown) =>
        error instanceof AssistantError &&
        error.code === "configuration_missing",
    );
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
  }
});
test("fallback greets naturally and asks for stay details without claiming live prices", () => {
  const greeting = appHelpAnswer("hello", [appGuide]);
  assert.ok(greeting.answer.startsWith("Hi!"));
  assert.notEqual(greeting.answer, scopeReply);
  const goa = appHelpAnswer("compare for goa", [appGuide]);
  assert.ok(goa.answer.includes("check-in"));
  assert.ok(goa.answer.includes("have not fetched prices"));
  assert.equal(goa.actions[0].href, "/web-search?destination=Goa");
  assert.equal(goa.actions[1].href, "/explore?cityCode=GOI");
  assert.notEqual(goa.answer, appGuide.text);
});
test("provider failures distinguish configuration, billing and capability problems", () => {
  assert.equal(providerFailure(401).code, "invalid_api_key");
  assert.equal(
    providerFailure(404, "model_not_found").code,
    "model_unavailable",
  );
  assert.equal(
    providerFailure(429, "insufficient_quota").code,
    "quota_unavailable",
  );
  assert.equal(
    providerFailure(429, "rate_limit_exceeded").code,
    "rate_limited",
  );
  assert.equal(
    providerFailure(400, "unsupported_value", "reasoning_effort").code,
    "reasoning_unsupported",
  );
  assert.equal(
    providerFailure(400, "unsupported_parameter", "response_format").code,
    "structured_output_unsupported",
  );
});
test("chat plans a complete stay search but cannot execute an out-of-scope plan", async () => {
  const original = globalThis.fetch;
  const keys = ["AI_API_KEY", "AI_MODEL", "AI_REASONING_EFFORT"];
  const old = keys.map((k) => process.env[k]);
  process.env.AI_API_KEY = "fixture";
  process.env.AI_MODEL = "fixture";
  process.env.AI_REASONING_EFFORT = "low";
  const plan = {
    destination: "Goa",
    checkIn: "2027-01-02",
    checkOut: "2027-01-04",
    adults: 2,
    hotelName: "",
    budget: 0,
  };
  let inScope = true;
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.ok(
      body.response_format.json_schema.schema.required.includes(
        "search_request",
      ),
    );
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              in_scope: inScope,
              answer: "Search request prepared.",
              source_ids: [],
              search_request: plan,
            }),
          },
        },
      ],
    });
  };
  try {
    assert.deepEqual(
      (
        await generateAppAnswer(
          "Search Goa 2027-01-02 to 2027-01-04 for 2 adults",
          [appGuide],
        )
      ).searchRequest,
      plan,
    );
    inScope = false;
    assert.equal(
      (await generateAppAnswer("Unrelated question", [appGuide])).searchRequest,
      null,
    );
  } finally {
    globalThis.fetch = original;
    keys.forEach((k, i) => {
      if (old[i] === undefined) delete process.env[k];
      else process.env[k] = old[i];
    });
  }
});
test("model errors expose a safe diagnostic without echoing raw provider secrets", async () => {
  const oldFetch = globalThis.fetch;
  const keys = ["AI_API_KEY", "AI_MODEL", "AI_REASONING_EFFORT"];
  const old = keys.map((k) => process.env[k]);
  process.env.AI_API_KEY = "fixture-key";
  process.env.AI_MODEL = "fixture-model";
  process.env.AI_REASONING_EFFORT = "low";
  try {
    globalThis.fetch = async () =>
      Response.json(
        {
          error: {
            code: "model_not_found",
            message: "raw-provider-secret-value",
          },
        },
        { status: 404 },
      );
    await assert.rejects(
      () => generateAppAnswer("Hello", [appGuide]),
      (e: unknown) =>
        e instanceof AssistantError &&
        e.code === "model_unavailable" &&
        !e.message.includes("raw-provider-secret"),
    );
    globalThis.fetch = async () => {
      throw Error("network-private-value");
    };
    await assert.rejects(
      () => generateAppAnswer("Hello", [appGuide]),
      (e: unknown) =>
        e instanceof AssistantError &&
        e.code === "network_error" &&
        !e.message.includes("network-private"),
    );
    globalThis.fetch = async () =>
      Response.json({
        choices: [{ message: { content: "not structured JSON" } }],
      });
    await assert.rejects(
      () => generateAppAnswer("Hello", [appGuide]),
      (e: unknown) =>
        e instanceof AssistantError && e.code === "invalid_response",
    );
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) => {
      if (old[i] === undefined) delete process.env[k];
      else process.env[k] = old[i];
    });
  }
});
