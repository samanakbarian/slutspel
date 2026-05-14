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

export interface NewsArticle {
  id?: string;
  title: string;
  body?: string;
  source: string;
  url?: string;
  date: string;
  time?: string;
  tag: NewsTag;
  priority?: string;
  scraped?: boolean;
}

// Matches the v2 scraper API response format
export interface SillySeasonData {
  season: string;
  league: string;
  headline: string;
  subline?: string;
  roster: Player[];
  rink_positions?: Record<string, unknown>;
  hot_rumors_in?: Player[];
  hot_rumors_out?: Player[];
  news_feed: NewsArticle[];
  _meta?: {
    lastRefresh: string;
    scrapedArticles: number;
    newArticles: number;
    tagCounts?: Record<string, number>;
    sources?: Record<string, number | string>;
  };
}
