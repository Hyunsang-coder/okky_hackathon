"use client";

const EXAMPLES = [
  "인스타 사진 분석해서 해시태그 추천하는 앱",
  "유튜브 영상 자동 요약 크롬 확장",
  "동네 맛집 리뷰 모아주는 서비스",
  "반려식물 건강 사진 진단 앱",
];

export function ExampleChips({
  onSelect,
}: {
  onSelect: (idea: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXAMPLES.map((example) => (
        <button
          key={example}
          onClick={() => onSelect(example)}
          className="rounded-full border border-foreground/10 px-3 py-1.5 text-sm text-foreground/60 transition-colors hover:border-foreground/30 hover:text-foreground"
        >
          {example}
        </button>
      ))}
    </div>
  );
}
