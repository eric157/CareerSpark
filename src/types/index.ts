
import type { ParseResumeOutput } from "@/ai/flows/resume-parsing";
import type { JobRecommendationOutput } from "@/ai/flows/job-recommendation";

export type ParsedResumeData = ParseResumeOutput;

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  description: string; // Full job description
  url?: string;
  postedDate?: string;
  employmentType?: string;
  salaryRange?: string;
  imageUrl?: string; // Optional company logo or job image
  dataAihint?: string; // for placeholder images
  relevancyScore?: number;
  personalizedExplanation?: string;
}

// This maps to one item in the recommendedJobs array from JobRecommendationOutput
export type RecommendedJob = JobRecommendationOutput["recommendedJobs"][number];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  relatedJobs?: RecommendedJob[]; // Optional: if AI response includes job recommendations
  searchQueryUsed?: string; // Optional: if AI performed a search
}
