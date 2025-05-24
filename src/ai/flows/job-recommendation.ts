
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

const JobRecommendationOutputSchema = z.object({
  recommendedJobs: z
    .array(
      z.object({
        title: z.string().describe('The title of the job.'),
        company: z.string().describe('The company offering the job.'),
        location: z.string().describe('The location of the job.'),
        summary: z.string().describe('A brief summary of the job description or why it is a good match.'),
        relevanceScore: z
          .number()
          .min(0).max(100)
          .describe(
            'A score indicating the relevance of the job to the user\'s resume and preferences (0-100).' +
            ' Briefly explain why this job is a good match for the user as part of the summary.'
          ),
        source: z.string().optional().describe("Indicates if the job was from 'providedListings' or 'webSearch'."),
        url: z.string().url().optional().describe("URL to the job posting, if found via web search.")
      })
    )
    .describe('A list of jobs recommended to the user, with relevance scores.'),
  searchQueryUsed: z.string().optional().describe("If a web search was performed, this is the query that was used.")
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
2. If no jobListings are provided, or if the provided listings do not seem sufficient or highly relevant based on user preferences, use the 'searchJobsTool' to find suitable job openings. Construct a concise and effective search query for the tool based on the user's resume and preferences (e.g., "software engineer remote typescript", "product manager fintech New York"). Include this query in the 'searchQueryUsed' field of your output.
3. From all available sources (provided listings and/or web search results), select up to 5 of the most relevant jobs.
4. For each recommended job, provide a title, company, location, a summary explaining its relevance and why it's a good match, and a relevance score (0-100).
5. Indicate the source of each job ('providedListings' or 'webSearch'). If from 'webSearch', include the job URL.
6. If using the searchJobsTool, ensure the tool's output (job title, company, location, url, snippet) is used to populate the fields in the recommendedJobs array. The 'summary' field for web-searched jobs should combine the snippet with your reasoning for the match.
7. Aim for high relevance. If no suitable jobs are found even after searching, return an empty recommendedJobs array and explain briefly in a general message if possible (though the structured output is primary).
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
