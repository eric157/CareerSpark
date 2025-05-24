
import type { ParseResumeOutput } from "@/ai/flows/resume-parsing";
import type { JobRecommendationOutput } from "@/ai/flows/job-recommendation";
import type { ContextualJobHelperOutput } from "@/ai/flows/contextual-job-helper-flow";

export type ParsedResumeData = ParseResumeOutput;

export type RecommendedJob = JobRecommendationOutput["recommendedJobs"][number];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string; // Can hold job recommendation intro OR RAG answer
  timestamp: Date;
  relatedJobs?: RecommendedJob[]; 
  searchQueryUsed?: string; 
  noResultsFeedback?: string;
  retrievedContextItems?: ContextualJobHelperOutput['retrievedContextItems']; // For RAG transparency
  isRAGResponse?: boolean; // To differentiate if needed for styling/display
}
