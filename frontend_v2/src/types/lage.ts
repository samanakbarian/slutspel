export interface LageSnapshot {
  title: string;
  season: string;
  league: string;
  readiness: {
    score: number;
    summary: string;
  };
  critical_now: string[];
  latest_impact: {
    title: string;
    impact_level: 'low' | 'medium' | 'high';
    meaning: string;
  };
  squad_status: {
    goalies: string;
    defense: string;
    centers: string;
    forwards: string;
  };
  economy_status: {
    risk_level: string;
    budget_pressure: string;
    next_question: string;
  };
  meta: {
    schema_version: string;
    generated_at: string;
    source_updated_at?: string | null;
    freshness_status: 'fresh' | 'stale' | 'critical' | 'unknown';
    new_signals: number;
    scraped_articles: number;
    expiring_contracts: number;
  };
}
