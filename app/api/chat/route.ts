import { streamText, convertToModelMessages } from "ai";
import { defaultModel } from "@/lib/models";
import { buildChatSystemPrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, report, searchContext } = await req.json();

  const systemPrompt = buildChatSystemPrompt(
    report || "",
    searchContext || ""
  );

  // DefaultChatTransport sends UIMessage format (with parts[]),
  // but streamText expects CoreMessage format (with content).
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: defaultModel,
    system: systemPrompt,
    messages: modelMessages,
  });

  return result.toUIMessageStreamResponse();
}
