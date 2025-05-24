
// src/ai/flows/job-recommendation.ts
'use server';

/**
 * @fileOverview Recommends jobs to a user based on their resume and preferences.
 *
 * - jobRecommendation - A function that handles the job recommendation process.
 * - JobRecommendationInput - The input type for the jobRecommendation function.
 * - JobRecommendationOutput - The return type for the jobRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchJobsTool } from '@/ai/tools/job-search-tool';

const JobRecommendationInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume."),
  userPreferences: z
    .string()
    .describe(
      "A description of the user's job preferences, including desired roles, industries, and locations."
    ),
  jobListings: z.array(z.string()).optional().describe('An optional list of job listings to consider. If not provided or insufficient, use the searchJobsTool to find relevant jobs.'),
});
export type JobRecommendationInput = z.infer<typeof JobRecommendationInputSchema>;

const RecommendedJobSchema = z.object({
  id: z.string().describe('A unique identifier for the job listing, derived from its source (e.g., SerpApi job_id).'),
  title: z.string().describe('The title of the job.'),
  company: z.string().describe('The company offering the job.'),
  location: z.string().describe('The location of the job.'),
  summary: z.string().describe('A brief summary of the job description or why it is a good match.'),
  description: z.string().describe('The full job description. This can be the same as the summary if a more detailed description is not available from the source.'),
  relevanceScore: z
    .number()
    .min(0).max(100)
    .describe(
      'A score indicating the relevance of the job to the user\'s resume and preferences (0-100).' +
      ' Briefly explain why this job is a good match for the user as part of the summary.'
    ),
  source: z.string().optional().describe("Indicates if the job was from 'providedListings' or 'webSearch'."),
  url: z.string().url().optional().describe("URL to the job posting, if found via web search."),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28").'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract").')
});

const JobRecommendationOutputSchema = z.object({
  recommendedJobs: z
    .array(RecommendedJobSchema)
    .describe('A list of jobs recommended to the user, with relevance scores.'),
  searchQueryUsed: z.string().optional().describe("If a web search was performed, this is the query that was used. Omit this field entirely if no web search was performed.")
});
export type JobRecommendationOutput = z.infer<typeof JobRecommendationOutputSchema>;

export async function jobRecommendation(input: JobRecommendationInput): Promise<JobRecommendationOutput> {
  return jobRecommendationFlow(input);
}

const jobRecommendationPrompt = ai.definePrompt({
  name: 'jobRecommendationPrompt',
  input: {schema: JobRecommendationInputSchema},
  output: {schema: JobRecommendationOutputSchema},
  tools: [searchJobsTool],
  prompt: `You are an AI job recommendation expert. Your goal is to recommend the most relevant jobs to the user based on their resume, preferences, and available job listings.

User Resume:
{{resumeText}}

User Preferences:
{{userPreferences}}

{{#if jobListings}}
Consider these provided Job Listings first:
{{#each jobListings}}
- {{{this}}} (Source: providedListings)
{{/each}}
{{else}}
No specific job listings were provided.
{{/if}}

Instructions:
1. Analyze the user's resume and preferences.
2. If no jobListings are provided, or if the provided listings do not seem sufficient or highly relevant based on user preferences, use the 'searchJobsTool' to find suitable job openings. Construct a concise and effective search query for the tool based on the user's resume and preferences (e.g., "software engineer remote typescript", "product manager fintech New York"). If you use the 'searchJobsTool', include the exact query you used in the 'searchQueryUsed' field of your output. If you do not use the 'searchJobsTool', omit the 'searchQueryUsed' field entirely from your output.
3. From all available sources (provided listings and/or web search results), select up to 5 of the most relevant jobs.
4. For each recommended job, provide:
    - id: The unique identifier from the source (e.g., tool output's 'id' field).
    - title: The job title.
    - company: The company name.
    - location: The job location.
    - summary: A brief summary explaining its relevance and why it's a good match.
    - description: The full job description from the source. If the source provides a snippet/summary, use that.
    - relevanceScore: A score (0-100) indicating relevance.
    - source: 'providedListings' or 'webSearch'.
    - url: The URL to the job posting (if from 'webSearch').
    - postedDate: The posting date, if available from the source.
    - employmentType: The type of employment, if available from the source.
5. If using the searchJobsTool, ensure the tool's output (id, title, company, location, url, description, postedDate, employmentType) is used to populate the fields in the recommendedJobs array. The 'summary' field for web-searched jobs should combine the tool's description/snippet with your reasoning for the match.
6. Aim for high relevance. If no suitable jobs are found even after searching, return an empty recommendedJobs array.
`,
});

const jobRecommendationFlow = ai.defineFlow(
  {
    name: 'jobRecommendationFlow',
    inputSchema: JobRecommendationInputSchema,
    outputSchema: JobRecommendationOutputSchema,
  },
  async (input) => {
    const {output} = await jobRecommendationPrompt(input);
    return output!;
  }
);

