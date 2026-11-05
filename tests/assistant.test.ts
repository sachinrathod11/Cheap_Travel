import { test } from "node:test";
import assert from "node:assert/strict";
import {
  appGuide,
  generateAppAnswer,
  isAppQuestion,
  scopeReply,
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
      /configuration missing/,
    );
  } finally {
    globalThis.fetch = oldFetch;
    keys.forEach((k, i) => {
      if (previous[i] === undefined) delete process.env[k];
      else process.env[k] = previous[i];
    });
  }
});
