import type {
  GitHubRepo,
  TavilyResult,
  EcosystemSignalType,
  RankedResults,
} from "./types";

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.max(0, (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function scoreRepo(
  repo: GitHubRepo,
  signal: EcosystemSignalType,
  userKeywords: string[]
): number {
  const weights =
    signal === "EMERGING"
      ? {
          stars: 0.1,
          recency: 0.3,
          descMatch: 0.2,
          readme: 0.1,
          topics: 0.1,
          license: 0.05,
          commitFreq: 0.15,
        }
      : {
          stars: 0.25,
          recency: 0.2,
          descMatch: 0.2,
          readme: 0.15,
          topics: 0.1,
          license: 0.1,
          commitFreq: 0,
        };

  // Stars score
  const starsScore = Math.min(1, Math.log10(repo.stargazers_count + 1) / 5);

  // Recency score (decay over 365 days)
  const pushDays = daysSince(repo.pushed_at);
  const recencyScore = Math.max(0, 1 - pushDays / 365);

  // Description match
  const desc = (repo.description || "").toLowerCase();
  const matchCount = userKeywords.filter((kw) =>
    desc.includes(kw.toLowerCase())
  ).length;
  const descMatchScore = Math.min(1, matchCount / Math.max(1, userKeywords.length));

  // README quality
  const readmeScore = repo.readme_excerpt && repo.readme_excerpt.length > 500 ? 1 : 0.3;

  // Topics
  const topicScore = repo.topics && repo.topics.length > 0 ? 1 : 0;

  // License
  const licenseScore = repo.license ? 1 : 0;

  // Commit frequency (EMERGING only)
  let commitScore = 0;
  if (signal === "EMERGING" && repo.recent_commit_date) {
    const commitDays = daysSince(repo.recent_commit_date);
    commitScore = commitDays < 30 ? 1 : commitDays < 90 ? 0.7 : commitDays < 180 ? 0.3 : 0;
  }

  let score =
    weights.stars * starsScore +
    weights.recency * recencyScore +
    weights.descMatch * descMatchScore +
    weights.readme * readmeScore +
    weights.topics * topicScore +
    weights.license * licenseScore +
    weights.commitFreq * commitScore;

  // Multi-query boost
  const hits = repo.query_hits || 1;
  if (hits >= 4) score *= 1.75;
  else if (hits >= 3) score *= 1.5;
  else if (hits >= 2) score *= 1.25;

  return score;
}

function buildContextXml(
  github: GitHubRepo[],
  tavily: TavilyResult[],
  signal: EcosystemSignalType
): string {
  const parts: string[] = [];

  parts.push(`<ecosystem_signal type="${signal}">`);
  if (signal === "ESTABLISHED") {
    parts.push(
      "이 아이디어와 관련된 성숙한 오픈소스 생태계가 존재합니다. Fork/Contribute를 우선 검토하십시오."
    );
  } else if (signal === "EMERGING") {
    parts.push(
      `이 아이디어와 관련된 GitHub 프로젝트는 소수의 초기 단계 프로젝트만 존재합니다.
이는 다음을 의미할 수 있습니다:
1. 아직 충분히 탐색되지 않은 기회 영역 (선점 가능)
2. 기술적으로 어려워 시도가 적은 영역
3. 최근 등장한 새로운 분야

검색 결과의 프로젝트들이 활발히 개발 중인지, 방치된 상태인지를 반드시 구분하십시오.
Fork가 아닌 Build를 우선 고려하되, 활발한 소규모 프로젝트가 있다면 Contribute를 추천할 수 있습니다.`
    );
  } else if (signal === "UNKNOWN") {
    parts.push(
      `⚠️ 검색 서비스 장애로 GitHub/웹 검색 결과를 수집하지 못했습니다.
이것은 아이디어의 가치나 구현 가능성과 무관한 기술적 장애입니다.

반드시 다음을 준수하십시오:
1. "검색 결과가 없다"를 "유사 프로젝트가 없다"로 해석하지 마십시오
2. 검색 없이 판단할 수 있는 범위에서만 분석하십시오
3. 확신도(confidence)를 0.3 이하로 설정하십시오
4. 리포트에 "검색 서비스 장애로 정보가 제한적"임을 명시하십시오
5. 사용자에게 재시도를 권장하십시오`
    );
  } else {
    parts.push(
      `이 아이디어와 관련된 GitHub 프로젝트가 발견되지 않았습니다.
이는 두 가지 가능성이 있습니다:
1. 완전히 새로운 아이디어 → 선점 기회이나 참고할 코드가 없어 난이도 상승
2. 현실적으로 구현이 어려운 아이디어 → Tavily 검색 결과와 기술 분석을 기반으로 판단

Build/Fork/Contribute 중 Build만 해당되며,
"처음부터 만들어야 하는 부담"을 로드맵에 명확히 반영하십시오.`
    );
  }
  parts.push("</ecosystem_signal>");

  // GitHub results
  if (github.length > 0) {
    parts.push("\n<github_results>");
    for (const repo of github.slice(0, 8)) {
      parts.push(`<repo url="${repo.html_url}" stars="${repo.stargazers_count}" language="${repo.language || "N/A"}" pushed="${repo.pushed_at}">`);
      parts.push(`  <name>${repo.full_name}</name>`);
      parts.push(
        `  <description>${(repo.description || "설명 없음").slice(0, 200)}</description>`
      );
      if (repo.topics && repo.topics.length > 0) {
        parts.push(`  <topics>${repo.topics.join(", ")}</topics>`);
      }
      if (repo.readme_excerpt) {
        parts.push(
          `  <readme_excerpt>${repo.readme_excerpt.slice(0, 500)}</readme_excerpt>`
        );
      }
      if (repo.recent_commit_date) {
        parts.push(
          `  <recent_commit>${repo.recent_commit_date}</recent_commit>`
        );
      }
      parts.push("</repo>");
    }
    parts.push("</github_results>");
  }

  // Tavily results
  if (tavily.length > 0) {
    parts.push("\n<web_results>");
    for (const result of tavily.slice(0, 10)) {
      parts.push(
        `<source url="${result.url}" category="${result.category}" relevance="${result.score.toFixed(2)}">`
      );
      parts.push(`  <title>${result.title}</title>`);
      parts.push(`  <content>${result.content.slice(0, 500)}</content>`);
      parts.push("</source>");
    }
    parts.push("</web_results>");
  }

  return parts.join("\n");
}

export function rankResults(
  github: GitHubRepo[],
  tavily: TavilyResult[],
  signal: EcosystemSignalType,
  keywords: string[]
): RankedResults {
  // Score and sort GitHub repos
  const scoredGithub = github.map((repo) => ({
    ...repo,
    score: scoreRepo(repo, signal, keywords),
  }));
  scoredGithub.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Build context XML
  const contextXml = buildContextXml(scoredGithub, tavily, signal);

  return {
    github: scoredGithub,
    tavily,
    ecosystemSignal: signal,
    contextXml,
  };
}
