import { streamText } from "ai";
import { thinkingModel, defaultModel } from "@/lib/models";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();

  // 첫 메시지(리포트 생성)는 opus로 깊은 분석, 후속 채팅은 sonnet
  const isFirstAnalysis = messages.filter((m: { role: string }) => m.role === "user").length === 1;

  const result = streamText({
    model: isFirstAnalysis ? thinkingModel : defaultModel,
    system: `당신은 VibCheck의 아이디어 검증 전문가입니다.
비개발자 출신 바이브 코더가 아이디어를 가져오면, 그 아이디어의 구현 가능성을 분석해주세요.

핵심 원칙:
- 비개발자가 이해할 수 있는 쉬운 언어를 사용하세요
- 기술 용어를 쓸 때는 반드시 쉬운 설명을 병기하세요
- 구현 가능성을 솔직하고 구체적으로 판단하세요
- 가능하다면 어떻게 시작해야 하는지 구체적 로드맵을 제시하세요`,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
