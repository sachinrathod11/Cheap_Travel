// Test-only process preload. Never load this in a deployed app.
const original = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (!url.startsWith("https://api.openai.com/")) return original(input, init);
  const request = new Request(input, init);
  const body = await request.json();
  if (url.endsWith("/chat/completions")) {
    const question = body.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");
    const dates = question.match(/\d{4}-\d{2}-\d{2}/g) || [];
    const adults = question.match(/([1-8]) adults/i);
    const plan =
      dates.length >= 2 && adults
        ? {
            destination: "Goa",
            checkIn: dates[0],
            checkOut: dates[1],
            adults: Number(adults[1]),
            hotelName: "",
            budget: 0,
          }
        : null;
    return Response.json({
      choices: [
        {
          message: {
            content: JSON.stringify({
              in_scope: true,
              answer: plan
                ? "Search request prepared."
                : "What are your dates and how many adults?",
              source_ids: [],
              search_request: plan,
            }),
          },
        },
      ],
    });
  }
  if (url.endsWith("/responses")) {
    const text = "Public hotel page [source]. Verify final booking conditions.";
    const start = text.indexOf("[source]");
    return Response.json({
      status: "completed",
      output: [
        { type: "web_search_call", status: "completed" },
        {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text,
              annotations: [
                {
                  type: "url_citation",
                  start_index: start,
                  end_index: start + 8,
                  url: "https://www.booking.com/hotel/test-fixture.html",
                  title: "Fixture hotel page",
                },
              ],
            },
          ],
        },
      ],
    });
  }
  throw Error("Unexpected OpenAI endpoint in fixture");
};
