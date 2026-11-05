import nextEnv from "@next/env";
import {
  AssistantError,
  appGuide,
  generateAppAnswer,
} from "../lib/assistant.ts";
nextEnv.loadEnvConfig(process.cwd());
try {
  const result = await generateAppAnswer(
    "Hello, how can you help me with Cheap Travel?",
    [appGuide],
  );
  console.log(
    "AI connection succeeded: the configured model answered a real app request.",
  );
  console.log(result.answer);
} catch (error) {
  if (error instanceof AssistantError)
    console.error(`AI check failed [${error.code}]: ${error.message}`);
  else
    console.error(
      "AI check failed [unexpected_response]: The provider response could not be read.",
    );
  process.exitCode = 1;
}
