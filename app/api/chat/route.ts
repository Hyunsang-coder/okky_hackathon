import { streamText } from "ai";
import { defaultModel } from "@/lib/models";
import { buildChatSystemPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, report, searchContext } = await req.json();

  const systemPrompt = buildChatSystemPrompt(
    report || "",
    searchContext || ""
  );

  const result = streamText({
    model: defaultModel,
    system: systemPrompt,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
