
import type { ParseResumeOutput } from "@/ai/flows/resume-parsing";
import type { JobRecommendationOutput } from "@/ai/flows/job-recommendation";

export type ParsedResumeData = ParseResumeOutput;

// This is the primary type for job data used across the UI, 
// directly derived from the AI flow's output structure.
export type RecommendedJob = JobRecommendationOutput["recommendedJobs"][number];

// This type is now redundant as RecommendedJob is sourced from the AI flow which uses searchJobsTool's output.
// Keeping it commented out for a short while for reference, then can be fully deleted.
/*
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
  salaryRange?: string; 
  imageUrl?: string;    
  dataAihint?: string;  
  relevancyScore?: number; 
  personalizedExplanation?: string; 
  source?: string; 
}
*/

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  relatedJobs?: RecommendedJob[]; 
  searchQueryUsed?: string; 
  noResultsFeedback?: string; // Added to display feedback from AI
}
