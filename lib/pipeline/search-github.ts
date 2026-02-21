import type { GitHubRepo, EcosystemSignalType } from "./types";
import { fetchWithRetry } from "./fetch-with-retry";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface GitHubSearchResponse {
  total_count: number;
  items: GitHubRepo[];
}

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
  };
  if (GITHUB_TOKEN) {
    headers.Authorization = `token ${GITHUB_TOKEN}`;
  }
  return fetchWithRetry(url, { headers }, { timeoutMs: 10_000 });
}

async function searchWithFilters(
  queries: string[],
  minStars: number,
  pushedAfter: string
): Promise<GitHubRepo[]> {
  const allRepos = new Map<string, GitHubRepo & { query_hits: number }>();

  const results = await Promise.allSettled(
    queries.map(async (query) => {
      const q = encodeURIComponent(
        `${query} in:description,readme stars:>=${minStars} pushed:>${pushedAfter} -is:fork archived:false`
      );
      const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=10`;
      const res = await githubFetch(url);
      if (!res.ok) return [];
      const data: GitHubSearchResponse = await res.json();
      return data.items || [];
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const repo of result.value) {
        const existing = allRepos.get(repo.full_name);
        if (existing) {
          existing.query_hits = (existing.query_hits || 1) + 1;
        } else {
          allRepos.set(repo.full_name, { ...repo, query_hits: 1 });
        }
      }
    }
  }

  return Array.from(allRepos.values());
}

async function fetchReadme(fullName: string): Promise<string | null> {
  try {
    const res = await githubFetch(
      `https://api.github.com/repos/${fullName}/readme`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const content = atob(data.content);
    return content.slice(0, 1000);
  } catch {
    return null;
  }
}

async function fetchActivityInfo(
  fullName: string
): Promise<{
  recent_commit_date?: string;
  languages?: Record<string, number>;
}> {
  const [commitsRes, langsRes] = await Promise.allSettled([
    githubFetch(
      `https://api.github.com/repos/${fullName}/commits?per_page=1`
    ),
    githubFetch(`https://api.github.com/repos/${fullName}/languages`),
  ]);

  const result: {
    recent_commit_date?: string;
    languages?: Record<string, number>;
  } = {};

  if (commitsRes.status === "fulfilled" && commitsRes.value.ok) {
    const commits = await commitsRes.value.json();
    if (commits.length > 0) {
      result.recent_commit_date =
        commits[0].commit?.committer?.date || commits[0].commit?.author?.date;
    }
  }

  if (langsRes.status === "fulfilled" && langsRes.value.ok) {
    result.languages = await langsRes.value.json();
  }

  return result;
}

export async function searchGitHub(
  queries: string[],
  topics: string[]
): Promise<{ repos: GitHubRepo[]; signal: EcosystemSignalType }> {
  if (queries.length === 0) {
    return { repos: [], signal: "NOVEL" };
  }

  // Add topic-based queries
  const topicQueries = topics
    .slice(0, 2)
    .map((t) => `topic:${t}`);
  const allQueries = [...queries.slice(0, 4), ...topicQueries].slice(0, 5);

  // Phase 1: strict search
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 8);
  const strictDate = sixMonthsAgo.toISOString().split("T")[0];

  let repos = await searchWithFilters(allQueries, 10, strictDate);
  let signal: EcosystemSignalType = "ESTABLISHED";

  if (repos.length < 3) {
    // Phase 2: broad search
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const broadDate = twoYearsAgo.toISOString().split("T")[0];

    const broadRepos = await searchWithFilters(allQueries, 1, broadDate);
    if (broadRepos.length === 0 && repos.length === 0) {
      signal = "NOVEL";
    } else {
      signal = "EMERGING";
      // Merge, preferring repos with more query hits
      const merged = new Map<string, GitHubRepo>();
      for (const r of repos) merged.set(r.full_name, r);
      for (const r of broadRepos) {
        if (!merged.has(r.full_name)) merged.set(r.full_name, r);
      }
      repos = Array.from(merged.values());
    }
  }

  // Sort by stars desc, then enrich top repos
  repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  const topRepos = repos.slice(0, 10);

  // Enrich with README (top 5~10)
  const readmeLimit = signal === "EMERGING" ? 5 : 8;
  const readmeResults = await Promise.allSettled(
    topRepos.slice(0, readmeLimit).map(async (repo) => {
      const readme = await fetchReadme(repo.full_name);
      return { full_name: repo.full_name, readme };
    })
  );
  for (const result of readmeResults) {
    if (result.status === "fulfilled" && result.value.readme) {
      const repo = topRepos.find(
        (r) => r.full_name === result.value.full_name
      );
      if (repo) repo.readme_excerpt = result.value.readme;
    }
  }

  // EMERGING: fetch activity info
  if (signal === "EMERGING") {
    const activityResults = await Promise.allSettled(
      topRepos.slice(0, 5).map(async (repo) => {
        const info = await fetchActivityInfo(repo.full_name);
        return { full_name: repo.full_name, ...info };
      })
    );
    for (const result of activityResults) {
      if (result.status === "fulfilled") {
        const repo = topRepos.find(
          (r) => r.full_name === result.value.full_name
        );
        if (repo) {
          repo.recent_commit_date = result.value.recent_commit_date;
          repo.languages = result.value.languages;
        }
      }
    }
  }

  return { repos: topRepos, signal };
}
