"use client";

import { useState, useEffect } from "react";

const EXAMPLES = [
  // 터무니없는 아이디어
  "고양이 표정으로 주식 매매 시그널 주는 앱",
  "냉장고 사진 찍으면 오늘의 운세 알려주는 서비스",
  "꿈 일기 쓰면 로또 번호 추천해주는 앱",
  "셀카 찍으면 닮은 조선시대 인물 찾아주는 서비스",
  // 실현 가능한 아이디어
  "GitHub 커밋 패턴 분석해서 번아웃 예측하는 도구",
  "회의록 음성 녹음하면 액션아이템 자동 추출하는 서비스",
  "반려식물 사진으로 건강 상태 진단하는 앱",
  "이력서 넣으면 면접 예상 질문 생성해주는 도구",
  // 이미 존재하는 아이디어
  "유튜브 영상 자동 요약 크롬 확장",
  "동네 맛집 리뷰 모아주는 서비스",
  "인스타 사진 분석해서 해시태그 추천하는 앱",
  "실시간 환율 변동 알림 앱",
  // 트렌디한 아이디어
  "AI로 내 코드 리뷰해주는 슬랙 봇",
  "운동 자세 카메라로 교정해주는 웹앱",
  "AI가 내 일정 보고 점심 메뉴 추천해주는 봇",
  "내 블로그 글 분석해서 SEO 점수 매기는 도구",
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function ExampleChips({
  onSelect,
}: {
  onSelect: (idea: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    setSelected(pickRandom(EXAMPLES, 4));
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      {selected.map((example) => (
        <button
          key={example}
          onClick={() => onSelect(example)}
          className="rounded-full border border-outline/60 bg-surface/60 px-3 py-1.5 text-sm text-muted transition-colors hover:border-primary hover:bg-primary-soft hover:text-foreground"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
