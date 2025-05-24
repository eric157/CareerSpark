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

const JobRecommendationInputSchema = z.object({
  resumeText: z.string().describe('The text content of the user\'s resume.'),
  userPreferences: z
    .string()
    .describe(
      'A description of the user\'s job preferences, including desired roles, industries, and locations.'
    ),
  jobListings: z.array(z.string()).describe('A list of job listings to consider.'),
});
export type JobRecommendationInput = z.infer<typeof JobRecommendationInputSchema>;

const JobRecommendationOutputSchema = z.object({
  recommendedJobs: z
    .array(
      z.object({
        title: z.string().describe('The title of the job.'),
        company: z.string().describe('The company offering the job.'),
        location: z.string().describe('The location of the job.'),
        summary: z.string().describe('A brief summary of the job description.'),
        relevanceScore: z
          .number()
          .describe(
            'A score indicating the relevance of the job to the user\'s resume and preferences (0-100).' + 
            'Explain why this job is a good match for the user.'
          ),
      })
    )
    .describe('A list of jobs recommended to the user, with relevance scores.'),
});
export type JobRecommendationOutput = z.infer<typeof JobRecommendationOutputSchema>;

export async function jobRecommendation(input: JobRecommendationInput): Promise<JobRecommendationOutput> {
  return jobRecommendationFlow(input);
}

const jobRecommendationPrompt = ai.definePrompt({
  name: 'jobRecommendationPrompt',
  input: {schema: JobRecommendationInputSchema},
  output: {schema: JobRecommendationOutputSchema},
  prompt: `You are an AI job recommendation expert. Given a user's resume, their job preferences, and a list of job listings, you will recommend the most relevant jobs to the user. You will also provide a relevance score for each job, from 0 to 100, and explain why this job is a good match for the user.

User Resume:
{{resumeText}}

User Preferences:
{{userPreferences}}

Job Listings:
{{#each jobListings}}- {{{this}}}
{{/each}}`, // Correct Handlebars usage
});

const jobRecommendationFlow = ai.defineFlow(
  {
    name: 'jobRecommendationFlow',
    inputSchema: JobRecommendationInputSchema,
    outputSchema: JobRecommendationOutputSchema,
  },
  async input => {
    const {output} = await jobRecommendationPrompt(input);
    return output!;
  }
);
