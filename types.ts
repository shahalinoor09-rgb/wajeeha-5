
export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingLinks?: GroundingLink[];
  audioData?: string; // base64
  isProcessing?: boolean;
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface UserPreferences {
  budget: 'budget' | 'mid-range' | 'luxury';
  interests: string[];
  duration: string;
  language: string;
}

export interface SavedRecommendation {
  id: string;
  title: string;
  description: string;
  link?: string;
}
