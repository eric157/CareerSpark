
// src/ai/flows/job-recommendation.ts
'use server';

/**
 * @fileOverview Recommends jobs to a user based on their resume and chat query using SerpApi.
 *
 * - jobRecommendation - A function that handles the job recommendation process.
 * - JobRecommendationInput - The input type for the jobRecommendation function.
 * - JobRecommendationOutput - The return type for the jobRecommendation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { searchJobsTool } from '@/ai/tools/job-search-tool';

// Input: Just resume text and user's current query/preferences.
const JobRecommendationInputSchema = z.object({
  resumeText: z.string().describe("The text content of the user's resume. This provides crucial context about skills, experience, and education."),
  userPreferences: z
    .string()
    .describe(
      "A description of the user's immediate job search query or preferences from the chat interface (e.g., 'entry-level marketing roles in NYC', 'senior java developer remote')."
    ),
});
export type JobRecommendationInput = z.infer<typeof JobRecommendationInputSchema>;

const RecommendedJobSchema = z.object({
  id: z.string().describe("A unique identifier for the job listing, derived directly from the 'id' field of a result from 'searchJobsTool'. This field is CRITICAL and MUST be the exact ID provided by the tool for the corresponding job. DO NOT use 'unknown', placeholders, or invent IDs."),
  title: z.string().describe('The title of the job.'),
  company: z.string().describe('The company offering the job.'),
  location: z.string().describe('The location of the job. If not specified or known by the searchJobsTool, use a general term like "Various locations" or "Not specified", but always include this field.'),
  summary: z.string().describe('A concise, AI-generated summary (2-3 sentences) explaining specifically why this job is a good match for the user, referencing their resume skills/experience and stated preferences. Make this compelling and personalized.'),
  description: z.string().describe('The full job description obtained from the source. This can be the same as the summary if a more detailed description is not available from the source.'),
  relevanceScore: z
    .number()
    .min(0).max(100)
    .describe(
      'A score (0-100) indicating how relevant the job is to the user\'s comprehensive profile (resume + preferences). Higher scores mean better alignment.'
    ),
  source: z.string().default("webSearch").describe("Indicates the job was found via 'webSearch' using the searchJobsTool."),
  url: z.string().url().optional().describe("URL to the job posting. Omit this field entirely if no valid URL is available from the source (e.g., if searchJobsTool provides no URL for this job). Do not use `null`."),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28"). This must be a string if provided by searchJobsTool. Omit this field entirely if not available as a string from the source or if it\'s null. Do not use `null`.'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract"). This must be a string if provided by searchJobsTool. Omit this field entirely if not available as a string from the source or if it\'s null. Do not use `null`.')
});

const JobRecommendationOutputSchema = z.object({
  recommendedJobs: z
    .array(RecommendedJobSchema)
    .describe('A list of up to 5 highly relevant jobs recommended to the user, with detailed justifications and relevance scores.'),
  searchQueryUsed: z.string().optional().describe("The exact query string that was constructed and used for the 'searchJobsTool'. Omit this field if the tool was not used or no query was formed."),
  noResultsFeedback: z.string().optional().describe("If a search was performed but yielded no suitable results, provide a brief, helpful message here. e.g., 'Your search for X in Y did not yield many results. You could try broadening your criteria.' Omit this field if results were found.")
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
  prompt: `You are an expert AI Career Advisor. Your goal is to provide up to 5 highly relevant job recommendations using the 'searchJobsTool'.

User's Resume Details:
{{{resumeText}}}

User's Stated Preferences / Current Search Query:
{{{userPreferences}}}

Follow these steps:

1.  **Analyze User Input:**
    *   Carefully review the 'resumeText' for key skills, experiences, and career trajectory.
    *   Interpret the 'userPreferences' (their chat query) for desired roles, industries, locations, or job types.

2.  **Formulate Search Query for 'searchJobsTool':**
    *   Based on your analysis, construct an OPTIMAL search query string for the 'searchJobsTool'. This query MUST be a synthesis of the user's chat query ('userPreferences') AND key elements extracted from their 'resumeText'.
    *   For example, if 'userPreferences' is "remote marketing jobs" and 'resumeText' mentions "social media management" and "SEO", a good query for the tool might be "remote social media marketing SEO jobs".
    *   Extract a potential location from 'userPreferences' to pass to the tool's location parameter. If no location is specified, you can omit it for the tool.
    *   If 'userPreferences' is too vague and 'resumeText' is also uninformative, you may decide not to use the 'searchJobsTool'.

3.  **Execute Search & Evaluate Results (If 'searchJobsTool' is used):**
    *   Use the 'searchJobsTool' with your formulated query.
    *   From the search results, select up to 5 of the MOST RELEVANT jobs.
    *   **Evaluation Criteria for Each Job:**
        *   **Skill & Experience Match:** How well do the job requirements align with the 'resumeText'?
        *   **Preference Fit:** Does it match the 'userPreferences' (role, industry, location, type)?
        *   **Job Details:** Consider recency (if 'postedDate' is available from the tool) and 'employmentType' (if available from the tool).

4.  **Format Output for Each Recommended Job:**
    *   For each selected job, populate ALL fields in the 'RecommendedJobSchema'.
    *   **'id': CRITICAL! This MUST be the exact, non-empty string identifier provided by the 'searchJobsTool' for this specific job (from the tool's 'id' field in its output). DO NOT invent IDs, use placeholders like 'unknown', or leave it blank. If the tool did not provide a valid ID for a job result, you should discard that job result.**
    *   'title', 'company', 'location', 'description': Directly from the search tool's output for the corresponding job. If 'location' is missing from the tool's output for a job, set it to "Not specified".
    *   'summary': CRITICAL. Write a concise (2-3 sentences), personalized summary explaining EXACTLY WHY this job is a strong match for THIS user. Refer to specific skills/experiences from 'resumeText' and elements from 'userPreferences'. Example: "This Senior Developer role at TechCorp aligns with your 7 years of Java backend experience and preference for remote fintech positions mentioned in your resume and query."
    *   'relevanceScore': Assign a score from 0-100.
    *   'source': This should always be 'webSearch' if you used the tool.
    *   'url': Provide the URL from the search tool's output for the job. If the tool's output for this job does not include a 'url' or its value is not a valid URL string, OMIT this 'url' field entirely from your output for this job. DO NOT use 'null'.
    *   'postedDate', 'employmentType': If these are available AS STRINGS from the search tool's output for the job, include them. If they are not available as strings, are null, or are not provided by the tool for this job, OMIT these fields entirely from your output for this job. DO NOT use 'null'.

5.  **FINAL OUTPUT STRUCTURE - VERY IMPORTANT RULES FOR OPTIONAL FIELDS:**

    *   **Regarding the 'searchQueryUsed' field:**
        *   **If, AND ONLY IF, you successfully used the 'searchJobsTool' and made a search:** The 'searchQueryUsed' field MUST be present in your output, and its value MUST be the exact query string you passed to the tool.
        *   **Otherwise (if 'searchJobsTool' was NOT used):** The 'searchQueryUsed' field MUST BE COMPLETELY ABSENT from your output JSON. Do not include it with a 'null' or empty string value.

    *   **Regarding the 'noResultsFeedback' field:**
        *   **If, AND ONLY IF, the 'recommendedJobs' array in your output is EMPTY (either because the tool returned no relevant results, or you decided not to provide jobs for other reasons):** The 'noResultsFeedback' field MUST be present in your output, and its value MUST be a string providing a helpful message (e.g., "I couldn't find specific matches for '...' based on your resume. Try rephrasing your request or highlighting different skills.").
        *   **Otherwise (if the 'recommendedJobs' array CONTAINS one or more jobs):** The 'noResultsFeedback' field MUST BE COMPLETELY ABSENT from your output JSON. Do not include it with a 'null' or empty string value.

Output MUST strictly adhere to 'JobRecommendationOutputSchema'.
If the user's query is too vague and the resume provides little to go on, and you decide not to use the tool, it's okay to state that you need more specific information. In this case, 'recommendedJobs' would be empty, and you would use the 'noResultsFeedback' field, and 'searchQueryUsed' would be absent.
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

