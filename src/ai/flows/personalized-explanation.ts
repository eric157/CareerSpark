// src/ai/flows/personalized-explanation.ts
'use server';

/**
 * @fileOverview Generates personalized explanations for job recommendations.
 *
 * - generatePersonalizedExplanation - A function that generates a personalized explanation of why a job is a good match for a user.
 * - PersonalizedExplanationInput - The input type for the generatePersonalizedExplanation function.
 * - PersonalizedExplanationOutput - The return type for the generatePersonalizedExplanation function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedExplanationInputSchema = z.object({
  resumeData: z.string().describe('The parsed data from the user resume.'),
  jobDescription: z.string().describe('The description of the job listing.'),
  userPreferences: z.string().describe('The user specified preferences.'),
});

export type PersonalizedExplanationInput = z.infer<
  typeof PersonalizedExplanationInputSchema
>;

const PersonalizedExplanationOutputSchema = z.object({
  explanation: z.string().describe('A personalized explanation of why the job is a good match for the user.'),
  relevancyScore: z.number().describe('A numerical score indicating the relevancy of the job to the user (0-100).'),
});

export type PersonalizedExplanationOutput = z.infer<
  typeof PersonalizedExplanationOutputSchema
>;

export async function generatePersonalizedExplanation(
  input: PersonalizedExplanationInput
): Promise<PersonalizedExplanationOutput> {
  return personalizedExplanationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedExplanationPrompt',
  input: {schema: PersonalizedExplanationInputSchema},
  output: {schema: PersonalizedExplanationOutputSchema},
  prompt: `You are an AI career coach specializing in matching candidates to jobs.

  Given the following information about a user's resume, their preferences, and a job description, generate a personalized explanation of why this job is a good match for the user.
  Also, provide a relevancy score from 0 to 100.

  Resume Data: {{{resumeData}}}
  Job Description: {{{jobDescription}}}
  User Preferences: {{{userPreferences}}}

  Explanation:`, // The explanation will be populated by the LLM
});

const personalizedExplanationFlow = ai.defineFlow(
  {
    name: 'personalizedExplanationFlow',
    inputSchema: PersonalizedExplanationInputSchema,
    outputSchema: PersonalizedExplanationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
