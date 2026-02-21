export type Classification = "SEARCHABLE" | "IMPOSSIBLE" | "AMBIGUOUS";
export type Complexity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
export type DataStatus =
  | "AVAILABLE_FREE"
  | "AVAILABLE_PAID"
  | "BUILDABLE"
  | "UNAVAILABLE";
export type EcosystemSignalType = "ESTABLISHED" | "EMERGING" | "NOVEL" | "UNKNOWN";
export type PlatformRiskStatus = "NONE" | "OPEN" | "REVIEW_REQUIRED" | "ENTERPRISE_ONLY" | "DEPRECATED";
export type LegalRiskSeverity = "NONE" | "CAUTION" | "HIGH_RISK";
export type LegalRiskCategory = "개인정보" | "저작권" | "초상권" | "약관위반" | "기타";

export interface PlatformRisk {
  status: PlatformRiskStatus;
  platform: string;
  detail: string;
}

export interface LegalRisk {
  severity: LegalRiskSeverity;
  category: LegalRiskCategory;
  detail: string;
}

export interface DataDependency {
  name: string;
  status: DataStatus;
  detail: string;
}

export interface KeywordExtraction {
  classification: Classification;
  complexity?: Complexity;
  data_dependencies?: DataDependency[];
  reason: string;
  alternative?: string;
  platform_risk?: PlatformRisk;
  legal_risks?: LegalRisk[];
  github_queries: string[];
  github_queries_ko?: string[];
  tavily_queries: {
    competitors: string;
    trends: string;
    technical: string;
    korean?: string;
  };
  topics: string[];
}

export interface GitHubRepo {
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  created_at: string;
  open_issues_count: number;
  license: { spdx_id: string } | null;
  readme_excerpt?: string;
  recent_commit_date?: string;
  languages?: Record<string, number>;
  // ranking
  score?: number;
  query_hits?: number;
}

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
  category: "competitors" | "trends" | "technical" | "korean";
}

export interface SearchResults {
  github: GitHubRepo[];
  tavily: TavilyResult[];
  ecosystemSignal: EcosystemSignalType;
}

export interface RankedResults {
  github: GitHubRepo[];
  tavily: TavilyResult[];
  ecosystemSignal: EcosystemSignalType;
  contextXml: string;
}
