import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readWebResult,
  searchPublicHotels,
  WebSearchError,
  webSearchInput,
} from "../lib/web-search.ts";
const text = "See hotel listing.";
const citation = {
  type: "url_citation",
  start_index: 4,
  end_index: 17,
  url: "https://www.booking.com/hotel/fixture.html",
  title: "Hotel listing",
};
const payload = {
  status: "completed",
  output: [
    { type: "web_search_call", status: "completed" },
    {
      type: "message",
      role: "assistant",
      content: [{ type: "output_text", text, annotations: [citation] }],
    },
  ],
};
test("web results require an actual completed search and provider citations", () => {
  const result = readWebResult(payload, new Date("2026-11-06T00:00:00Z"));
  assert.equal(result.verification, "public-web-leads");
  assert.equal(result.answer, text);
  assert.equal(result.sources[0].url, citation.url);
  assert.equal(result.citations[0].start, 4);
  assert.throws(
    () => readWebResult({ ...payload, output: payload.output.slice(1) }),
    (e: unknown) =>
      e instanceof WebSearchError && e.code === "search_not_performed",
  );
  assert.throws(
    () =>
      readWebResult({
        status: "completed",
        output: [
          payload.output[0],
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text: "Uncited invented prices",
                annotations: [],
              },
            ],
          },
        ],
      }),
    (e: unknown) =>
      e instanceof WebSearchError && e.code === "no_cited_results",
  );
});
test("unsafe citation URLs and incomplete outputs are not shown as sourced results", () => {
  assert.throws(() => readWebResult({ ...payload, status: "incomplete" }));
  for (const url of [
    "javascript:alert(1)",
    "https://user:password@example.com/page",
  ])
    assert.throws(() =>
      readWebResult({
        status: "completed",
        output: [
          payload.output[0],
          {
            type: "message",
            role: "assistant",
            content: [
              {
                type: "output_text",
                text,
                annotations: [{ ...citation, url }],
              },
            ],
          },
        ],
      }),
    );
});
test("search uses the Responses web tool with dates and adults, and refuses unsupported models safely", async () => {
  const original = globalThis.fetch;
  const keys = [
    "AI_API_KEY",
    "AI_MODEL",
    "AI_WEB_SEARCH_MODEL",
    "AI_WEB_SEARCH_REASONING_EFFORT",
  ];
  const old = keys.map((k) => process.env[k]);
  process.env.AI_API_KEY = "fixture";
  process.env.AI_MODEL = "fixture-model";
  process.env.AI_WEB_SEARCH_REASONING_EFFORT = "low";
  delete process.env.AI_WEB_SEARCH_MODEL;
  const stay = {
    destination: "Goa",
    checkIn: "2027-01-02",
    checkOut: "2027-01-05",
    adults: 2,
    hotelName: "",
    budget: 5000,
  };
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url, "https://api.openai.com/v1/responses");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "fixture-model");
      assert.equal(body.reasoning.effort, "low");
      assert.equal(body.tools[0].type, "web_search");
      assert.equal(body.tools[0].external_web_access, true);
      assert.equal(body.tool_choice, "required");
      assert.equal(body.store, false);
      assert.deepEqual(JSON.parse(body.input), stay);
      return Response.json(payload);
    };
    assert.equal((await searchPublicHotels(stay)).sources.length, 1);
    globalThis.fetch = async () =>
      Response.json(
        { error: { message: "do not expose raw provider details" } },
        { status: 400 },
      );
    await assert.rejects(
      () => searchPublicHotels(stay),
      (e: unknown) =>
        e instanceof WebSearchError &&
        e.code === "search_model_unsupported" &&
        !e.message.includes("raw provider"),
    );
  } finally {
    globalThis.fetch = original;
    keys.forEach((k, i) => {
      if (old[i] === undefined) delete process.env[k];
      else process.env[k] = old[i];
    });
  }
});
test("web stay validation rejects impossible dates and invalid occupancy", () => {
  assert.equal(
    webSearchInput.safeParse({
      destination: "Goa",
      checkIn: "2027-02-30",
      checkOut: "2027-03-04",
      adults: 2,
    }).success,
    false,
  );
  assert.equal(
    webSearchInput.safeParse({
      destination: "Goa",
      checkIn: "2027-01-03",
      checkOut: "2027-01-02",
      adults: 2,
    }).success,
    false,
  );
  assert.equal(
    webSearchInput.safeParse({
      destination: "Goa",
      checkIn: "2027-01-02",
      checkOut: "2027-01-03",
      adults: 0,
    }).success,
    false,
  );
});
