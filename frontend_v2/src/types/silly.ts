export type ContractStatus = 'SIGNERAD' | 'UTGÅENDE' | 'FÖRLÄNGD' | 'LÄMNAR' | 'NYFÖRVÄRV' | 'LÅN_SLUT';
export type Position = 'GK' | 'LD' | 'RD' | 'CE' | 'LW' | 'RW';
export type NewsTag = 'BEKRÄFTAT_NYFÖRVÄRV' | 'BEKRÄFTAD_FÖRLUST' | 'HETT_RYKTE' | 'KONTRAKTSFÖRLÄNGNING' | 'FORUM_RYKTE' | 'ÖVRIGT';

export interface Player {
  name: string;
  number: number | null;
  pos: Position;
  status?: ContractStatus;
  contractUntil?: string;
  years?: number;
  date?: string;
  source?: string;
  note?: string;
  from?: string;
  to?: string;
  rumor_pct?: number;
  rumor_to?: string | null;
  age?: number;
}

export interface AIAnalysis {
  sentiment_pct: number;
  pros: string[];
  cons: string[];
}

export interface Impact {
  type: 'positive' | 'negative' | null;
  impact_toi?: string | null;
  impact_points?: string | null;
}

export interface NewsArticle {
  title: string;
  body?: string;
  source: string;
  url: string;
  date: string;
  tag: NewsTag;
  ai_analysis?: AIAnalysis | null;
  impact?: Impact | null;
}

export interface SillySeasonData {
  season: string;
  league: string;
  headline: string;
  last_manual_update: string;
  confirmed_extensions: Player[];
  confirmed_signings: Player[];
  confirmed_departures: Player[];
  expiring_contracts: Player[];
  hot_rumors_in: Player[];
  hot_rumors_out: Player[];
  roster: Player[];
  news_feed: NewsArticle[];
  _meta?: {
    scrapedArticles: number;
    newArticles: number;
    lastScrape: string;
  };
}
