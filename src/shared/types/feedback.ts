export type FeedbackCategory = 'feature' | 'tool-request' | 'bug' | 'general';

export interface FeedbackMetadata {
  tool?: string;
  path: string;
  userAgent: string;
  screenSize: string;
  theme: string;
  appVersion: string;
}

export interface FeedbackPayload {
  category: FeedbackCategory;
  title: string;
  description: string;
  email?: string;
  rating?: number;
  metadata?: FeedbackMetadata;
  timestamp: string;
}

export interface FeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
}
