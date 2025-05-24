

import type { ParseResumeOutput } from "@/ai/flows/resume-parsing";
import type { JobRecommendationOutput } from "@/ai/flows/job-recommendation";

export type ParsedResumeData = ParseResumeOutput;

// This is the primary type for job data used across the UI, 
// now directly derived from the AI flow's output structure.
export type RecommendedJob = JobRecommendationOutput["recommendedJobs"][number];


// The JobListing type can be kept for reference or potential future use if needed,
// but RecommendedJob is now the main type for dynamically fetched jobs.
export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  description: string; 
  url?: string;
  postedDate?: string;
  employmentType?: string;
  salaryRange?: string; // This field is not reliably provided by SerpApi or current flows.
  imageUrl?: string;    // This field is not provided by SerpApi or current flows.
  dataAihint?: string;  // This field is not provided by SerpApi or current flows.
  relevancyScore?: number; // This is part of RecommendedJob.
  personalizedExplanation?: string; // This is generated on demand.
  source?: string; // This is part of RecommendedJob.
}


export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  relatedJobs?: RecommendedJob[]; 
  searchQueryUsed?: string; 
}

