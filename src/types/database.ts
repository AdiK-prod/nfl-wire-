export type TeamID = string;

export type Category =
  | 'transaction'
  | 'injury'
  | 'game_analysis'
  | 'rumor'
  | 'general';

export type SourceType = 'global' | 'team_specific' | 'user_submitted';

export type SourceStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

export type NewsletterStatus = 'draft' | 'sent';

export type Feedback = 'thumbs_up' | 'thumbs_down' | null;

export interface Team {
  id: string;
  name: string;
  city: string;
  slug: string;
  abbreviation: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  logo_url: string | null;
  division: string;
  conference: string;
  is_active: boolean;
  created_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  team_id: string;
  subscribed_at: string;
  is_active: boolean;
  last_opened_at: string | null;
}

export interface Source {
  id: string;
  team_id: string | null;
  url: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  relevance_score: number | null;
  submitted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  source_id: string;
  team_id: string;
  title: string;
  original_url: string;
  raw_content: string;
  ai_summary: string | null;
  published_at: string;
  relevance_confirmed: boolean;
  category: Category | null;
  created_at: string;
}

export interface Newsletter {
  id: string;
  team_id: string;
  sent_at: string | null;
  subject_line: string;
  html_content: string;
  status: NewsletterStatus;
  created_at: string;
}

export interface NewsletterMetric {
  id: string;
  newsletter_id: string;
  subscriber_id: string;
  opened_at: string | null;
  feedback: Feedback;
  created_at: string;
}

