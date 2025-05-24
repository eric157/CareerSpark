// src/ai/flows/resume-parsing.ts
'use server';
/**
 * @fileOverview Resume parsing flow.
 *
 * This file defines a Genkit flow for extracting key information (skills, experience, education) from uploaded resumes.
 * It exports:
 *   - `parseResume`: An async function to trigger the resume parsing flow.
 *   - `ParseResumeInput`: The input type for the `parseResume` function (a data URI of the resume).
 *   - `ParseResumeOutput`: The output type for the `parseResume` function (extracted resume information).
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the input schema
const ParseResumeInputSchema = z.object({
  resumeDataUri: z
    .string()
    .describe(
      'The resume file as a data URI that must include a MIME type and use Base64 encoding. Expected format: \'data:<mimetype>;base64,<encoded_data>\'.' 
    ),
});
export type ParseResumeInput = z.infer<typeof ParseResumeInputSchema>;

// Define the output schema
const ParseResumeOutputSchema = z.object({
  skills: z.array(z.string()).describe('List of skills extracted from the resume.'),
  experience: z
    .array(z.string())
    .describe('List of professional experiences extracted from the resume.'),
  education: z.array(z.string()).describe('List of education details extracted from the resume.'),
});
export type ParseResumeOutput = z.infer<typeof ParseResumeOutputSchema>;

// Define the prompt
const resumeParsingPrompt = ai.definePrompt({
  name: 'resumeParsingPrompt',
  input: {schema: ParseResumeInputSchema},
  output: {schema: ParseResumeOutputSchema},
  prompt: `You are a resume parsing expert. Extract key information from the resume provided, including skills, experience, and education.

Resume: {{media url=resumeDataUri}}

Skills: A list of skills mentioned in the resume.
Experience: A list of professional experiences with job titles and company names. Omit dates.
Education: A list of education details including degrees and institutions. Omit dates.`,
});

// Define the flow
const resumeParsingFlow = ai.defineFlow(
  {
    name: 'resumeParsingFlow',
    inputSchema: ParseResumeInputSchema,
    outputSchema: ParseResumeOutputSchema,
  },
  async input => {
    const {output} = await resumeParsingPrompt(input);
    return output!;
  }
);

// Exported function to call the flow
export async function parseResume(input: ParseResumeInput): Promise<ParseResumeOutput> {
  return resumeParsingFlow(input);
}
