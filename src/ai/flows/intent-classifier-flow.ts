'use server';
/**
 * @fileOverview A Genkit flow to classify user intent.
 *
 * Determines if a user's query is primarily a 'job_search' or a 'general_question'.
 *
 * Exports:
 * - classifyUserIntent - The main function to trigger the intent classification.
 * - IntentClassifierInput - Input type (user's query).
 * - IntentClassifierOutput - Output type (classified intent).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Input Schema
const IntentClassifierInputSchema = z.object({
  userQuery: z.string().describe("The user's chat message."),
});
export type IntentClassifierInput = z.infer<typeof IntentClassifierInputSchema>;

// Output Schema
const IntentClassifierOutputSchema = z.object({
  intent: z.enum(['job_search', 'general_question'])
    .describe("The classified intent: 'job_search' if the user is looking for jobs, 'general_question' if they are asking for information or advice."),
});
export type IntentClassifierOutput = z.infer<typeof IntentClassifierOutputSchema>;

// Exported function to call the flow
export async function classifyUserIntent(
  input: IntentClassifierInput
): Promise<IntentClassifierOutput> {
  return intentClassificationFlow(input);
}

const intentClassificationPrompt = ai.definePrompt({
  name: 'intentClassificationPrompt',
  input: { schema: IntentClassifierInputSchema },
  output: { schema: IntentClassifierOutputSchema },
  prompt: `You are an expert query classifier. Your task is to determine the primary intent of the user's query related to job searching and career advice.
Classify the intent as either 'job_search' or 'general_question'.

- 'job_search': The user is primarily looking for job listings, recommendations for specific roles, or wants to find open positions.
  Examples:
    - "find software engineer jobs in new york"
    - "entry level marketing roles remote"
    - "show me data scientist positions"
    - "i need a job in finance"
    - "recommend some backend developer jobs"
    - "latest openings for project manager"

- 'general_question': The user is asking for information, advice, explanations, roadmaps, or how-to guides related to careers, job searching strategies, skills, interview preparation, company information, etc., and is NOT primarily asking for job listings.
  Examples:
    - "what are the best skills for a product manager?"
    - "give me a roadmap for AI engineer"
    - "how to prepare for a behavioral interview?"
    - "tell me about the company culture at Google"
    - "explain the STAR method"
    - "pros and cons of remote work"
    - "what are common interview questions for a data analyst?"

User Query: {{{userQuery}}}

Based on this query, the primary intent is:
`,
});

const intentClassificationFlow = ai.defineFlow(
  {
    name: 'intentClassificationFlow',
    inputSchema: IntentClassifierInputSchema,
    outputSchema: IntentClassifierOutputSchema,
  },
  async (input) => {
    const { output } = await intentClassificationPrompt(input);
    if (!output) {
      // Fallback or error handling if LLM doesn't produce valid output
      console.warn('Intent classification failed to produce output, defaulting to general_question');
      return { intent: 'general_question' };
    }
    return output;
  }
);
