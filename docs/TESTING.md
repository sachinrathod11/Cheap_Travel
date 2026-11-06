# Search verification

`npm test` checks pricing, booking validation, assistant planning and response parsing. Web-search unit tests replace fetch with fixtures; they do not establish live model capability or hotel availability.

## Full chat-to-search flow without API charges

Use a dedicated local development database, start it with `docker compose up -d --wait db`, and apply `npm run db:init`. Build with `npm run build`, then start a test-only server:

```sh
AI_API_KEY=fixture AI_MODEL=fixture AI_WEB_SEARCH_MODEL=fixture \
AUTH_SECRET="$(openssl rand -base64 32)" \
NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require=./tests/fixtures/openai-web-preload.cjs" \
PORT=3118 npm start
```

In a second terminal in the repository, run:

```sh
TEST_APP_URL=http://127.0.0.1:3118 npm run test:web-backend
```

This tests real signup/session routing, chat clarification, validated chat-to-tool execution, source handling and the shared database quota. Only OpenAI requests are replaced by fixture responses. The test removes its exact temporary account afterward. Stop this server when finished. Never load the fixture in a deployed server and never describe fixture results as real hotel prices.

## Real provider capability

With real credentials configured privately, `npm run ai:check` tests text conversation and `npm run ai:web-check` separately tests a real cited web search. These can incur API usage charges. Neither a model listing nor the mocked tests establish support for web search. Follow [provider setup](PROVIDERS.md) for model settings and interpretation of results.
