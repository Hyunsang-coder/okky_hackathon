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

  // Sliding window: keep last 10 messages (≈5 round-trips) to control token usage
  const trimmedMessages = modelMessages.slice(-10);

  const result = streamText({
    model: defaultModel,
    system: {
      role: "system",
      content: systemPrompt,
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    messages: trimmedMessages,
  });

  return result.toUIMessageStreamResponse();
}
