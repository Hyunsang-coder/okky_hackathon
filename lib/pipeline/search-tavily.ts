import type { TavilyResult } from "./types";

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

interface TavilySearchParams {
  query: string;
  topic?: "general" | "news";
  search_depth?: "basic" | "advanced";
  max_results?: number;
  time_range?: string;
  include_domains?: string[];
  include_answer?: "basic" | "advanced";
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

async function tavilySearch(
  params: TavilySearchParams
): Promise<TavilySearchResult[]> {
  if (!TAVILY_API_KEY) {
    console.warn("TAVILY_API_KEY not set, skipping Tavily search");
    return [];
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        ...params,
      }),
    });

    if (!res.ok) {
      console.error(`Tavily search failed: ${res.status}`);
      return [];
    }

    const data: TavilyResponse = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("Tavily search error:", error);
    return [];
  }
}

export async function searchTavily(queries: {
  competitors: string;
  trends: string;
  technical: string;
}): Promise<TavilyResult[]> {
  const searches: Array<{
    params: TavilySearchParams;
    category: TavilyResult["category"];
  }> = [
    {
      category: "competitors",
      params: {
        query: queries.competitors,
        topic: "general",
        search_depth: "advanced",
        max_results: 8,
        include_domains: [
          "producthunt.com",
          "g2.com",
          "alternativeto.net",
          "techcrunch.com",
        ],
      },
    },
    {
      category: "trends",
      params: {
        query: queries.trends,
        topic: "news",
        search_depth: "basic",
        max_results: 8,
        time_range: "month",
      },
    },
    {
      category: "technical",
      params: {
        query: queries.technical,
        topic: "general",
        search_depth: "basic",
        max_results: 5,
        include_answer: "basic",
      },
    },
  ];

  const results = await Promise.allSettled(
    searches.map(async ({ params, category }) => {
      const items = await tavilySearch(params);
      return items
        .filter((item) => item.score > 0.5)
        .map(
          (item): TavilyResult => ({
            title: item.title,
            url: item.url,
            content: item.content.slice(0, 500),
            score: item.score,
            category,
          })
        );
    })
  );

  // Merge and deduplicate by URL
  const seen = new Set<string>();
  const merged: TavilyResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      for (const item of result.value) {
        if (!seen.has(item.url)) {
          seen.add(item.url);
          merged.push(item);
        }
      }
    }
  }

  return merged.sort((a, b) => b.score - a.score);
}
