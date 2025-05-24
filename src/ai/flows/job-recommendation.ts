
// src/ai/flows/job-recommendation.ts
'use server';

/**
 * @fileOverview Recommends jobs to a user based on their resume and preferences using an agentic approach.
 *
 * - jobRecommendation - A function that handles the job recommendation process.
 * - JobRecommendationInput - The input type for the jobRecommendation function.
 * - JobRecommendationOutput - The return type for the jobRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchJobsTool } from '@/ai/tools/job-search-tool';

const JobRecommendationInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume. This provides crucial context about skills, experience, and education."),
  userPreferences: z
    .string()
    .describe(
      "A description of the user's immediate job search query or preferences, including desired roles, industries, keywords, and locations. This might be a direct query from a chat interface."
    ),
  jobListings: z.array(z.string()).optional().describe('An optional list of pre-existing job listings to consider. If provided, these should be evaluated first.'),
});
export type JobRecommendationInput = z.infer<typeof JobRecommendationInputSchema>;

const RecommendedJobSchema = z.object({
  id: z.string().describe('A unique identifier for the job listing, derived from its source (e.g., SerpApi job_id).'),
  title: z.string().describe('The title of the job.'),
  company: z.string().describe('The company offering the job.'),
  location: z.string().describe('The location of the job. If not specified or known, use a general term like "Various locations" or "Not specified", but always include the field.'),
  summary: z.string().describe('A concise, AI-generated summary (2-3 sentences) explaining specifically why this job is a good match for the user, referencing their resume skills/experience and stated preferences.'),
  description: z.string().describe('The full job description obtained from the source. This can be the same as the summary if a more detailed description is not available from the source.'),
  relevanceScore: z
    .number()
    .min(0).max(100)
    .describe(
      'A score (0-100) indicating how relevant the job is to the user\'s comprehensive profile (resume + preferences). Higher scores mean better alignment.'
    ),
  source: z.string().optional().describe("Indicates if the job was from 'providedListings' or 'webSearch' (if found via searchJobsTool). Omit if not applicable."),
  url: z.string().url().optional().describe("URL to the job posting, if available (e.g., from web search). Omit this field if no URL is available from the source."),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28"). This must be a string if provided. Omit this field entirely if not available as a string from the source or if it\'s null. Do not use `null`.'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract"). This must be a string if provided. Omit this field entirely if not available as a string from the source or if it\'s null. Do not use `null`.')
});

const JobRecommendationOutputSchema = z.object({
  recommendedJobs: z
    .array(RecommendedJobSchema)
    .describe('A list of up to 5 highly relevant jobs recommended to the user, with detailed justifications and relevance scores.'),
  searchQueryUsed: z.string().optional().describe("If the 'searchJobsTool' was used, this is the exact query that was constructed and used for the search. Omit this field entirely if the 'searchJobsTool' was not used."),
  reasoningForSearch: z.string().optional().describe("If the 'searchJobsTool' was used, briefly explain how the search query was derived from the resume and user preferences. Omit if tool not used."),
  noResultsFeedback: z.string().optional().describe("If a search was performed but yielded no suitable results, provide a brief, helpful message here. e.g., 'Your search for X in Y did not yield many results. You could try broadening your criteria.' Omit if results were found or no search was performed.")
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
  prompt: `You are an expert AI Career Advisor. Your primary goal is to provide highly relevant job recommendations (up to 5) to the user based on their resume and stated preferences.

User's Resume Details:
{{resumeText}}

User's Stated Preferences / Current Search Query:
{{userPreferences}}

{{#if jobListings}}
Consider these provided Job Listings first:
{{#each jobListings}}
- Job Content: {{{this}}} (Source: providedListings)
{{/each}}
{{else}}
No specific job listings were initially provided by the user.
{{/if}}

Your Task (Follow these steps meticulously):

1.  **Understand the User:**
    *   Thoroughly analyze the 'resumeText' to identify key skills, past roles, experiences, and education.
    *   Analyze 'userPreferences' for immediate search keywords, desired roles, industries, locations, or job types.

2.  **Search Strategy (If Necessary):**
    *   Evaluate if the 'jobListings' (if provided) are sufficient and relevant.
    *   If no 'jobListings' are provided, OR if the provided ones are insufficient or not highly relevant to the user's overall profile (resume + preferences), YOU MUST use the 'searchJobsTool' to find suitable job openings.
    *   **Constructing the Search Query:** If you decide to use 'searchJobsTool':
        *   Formulate an OPTIMAL search query string for the tool. This query should be a synthesis of the most important keywords/roles from 'userPreferences' AND key skills/job titles from 'resumeText'. For example, if preferences are "entry-level marketing" and resume shows "graphic design, social media", a good query might be "entry-level marketing social media graphic design".
        *   Consider location from 'userPreferences' for the tool's location parameter. If no location is specified, you can omit it or use a general term if appropriate for the role types.
        *   Record the exact query you use in the 'searchQueryUsed' field of your output.
        *   Briefly explain your reasoning for this query in the 'reasoningForSearch' field.
        *   If you do not use the 'searchJobsTool', omit 'searchQueryUsed' and 'reasoningForSearch' entirely from the output.

3.  **Evaluate and Select Jobs:**
    *   From ALL available sources (provided 'jobListings' AND/OR results from 'searchJobsTool'), select up to 5 of the MOST RELEVANT jobs.
    *   **Deep Evaluation Criteria:** For each potential job:
        *   **Skill Match:** Compare required/desired skills in the job description against skills in 'resumeText'.
        *   **Experience Alignment:** Assess if the job's experience level aligns with the user's background.
        *   **Preference Fit:** Check against 'userPreferences' (role types, industry, location, keywords).
        *   **Job Details:** Note the 'postedDate' (prefer more recent if available) and 'employmentType'.

4.  **Format Output for Each Recommended Job:**
    *   For each of the selected top 5 jobs, populate ALL fields in the 'RecommendedJobSchema' based on the source information (either the provided listing or the 'searchJobsTool' output).
    *   'id': Use the unique identifier from the source (e.g., tool's 'id', or generate one if processing a raw provided listing).
    *   'title', 'company', 'location', 'description': Directly from the source. The 'description' should be the full job description.
    *   'summary': This is CRITICAL. Write a concise (2-3 sentences) and personalized summary explaining EXACTLY WHY this job is a strong match. Refer to specific skills/experiences from the user's 'resumeText' and elements from 'userPreferences' that align with the job. For example: "This Senior Developer role at TechCorp aligns with your extensive Java experience and preference for remote work in the fintech sector."
    *   'relevanceScore': Assign a score from 0 to 100, reflecting your comprehensive analysis of the match. A higher score means a stronger, more multi-faceted match.
    *   'source': Indicate 'providedListings' or 'webSearch'.
    *   'url': Provide the URL if the job came from 'searchJobsTool' and a URL is available. Omit this field if not available.
    *   'postedDate', 'employmentType': If these are available AS STRINGS from the source, include them. If they are not available, are null, or are not strings, OMIT these fields entirely for that job. DO NOT use 'null'.

5.  **Handling No/Poor Results from Search:**
    *   If you used 'searchJobsTool' but it returned no results, or the results were of very low relevance even after your analysis, return an empty 'recommendedJobs' array.
    *   In this specific case (search performed, no good results), provide a helpful message in the 'noResultsFeedback' field. For example: "My search for 'senior quantum physicist in rural Alaska' based on your profile didn't find matching roles. You might consider broadening your location or role type." Omit this field if you found good jobs or didn't perform a search.

Output MUST strictly adhere to 'JobRecommendationOutputSchema'.
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

