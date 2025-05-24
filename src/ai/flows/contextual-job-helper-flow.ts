
'use server';
/**
 * @fileOverview A Genkit flow that uses RAG to answer user questions.
 *
 * It retrieves relevant context using a tool and then prompts an LLM
 * to answer the user's question based on that context and its general knowledge.
 * It can also use provided resume text if the question is about the user's resume.
 *
 * Exports:
 * - contextualJobHelper - The main function to trigger the RAG flow.
 * - ContextualJobHelperInput - Input type (user's question, optional resume text).
 * - ContextualJobHelperOutput - Output type (LLM's answer).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { relevantInfoRetrieverTool } from '@/ai/tools/relevant-info-retriever-tool';

// Input Schema
const ContextualJobHelperInputSchema = z.object({
  userQuery: z.string().describe("The user's question about job searching, interviews, resumes, etc."),
  resumeText: z.string().optional().describe('The text content of the user\'s parsed resume, if available and relevant to the query.'),
});
export type ContextualJobHelperInput = z.infer<typeof ContextualJobHelperInputSchema>;

// Output Schema
const ContextualJobHelperOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s query, based on retrieved context and general knowledge.'),
  retrievedContextItems: z.array(z.string()).optional().describe('Snippets of context retrieved and used by the LLM for general questions.'),
});
export type ContextualJobHelperOutput = z.infer<typeof ContextualJobHelperOutputSchema>;

// Exported function to call the flow
export async function contextualJobHelper(
  input: ContextualJobHelperInput
): Promise<ContextualJobHelperOutput> {
  return contextualJobHelperRAGFlow(input);
}

// Define the RAG prompt
const contextualHelpPrompt = ai.definePrompt({
  name: 'contextualHelpPrompt',
  input: { 
    schema: z.object({
      userQuery: z.string(),
      resumeText: z.string().optional(),
      retrievedSnippets: z.array(z.string()),
    }) 
  },
  output: { schema: ContextualJobHelperOutputSchema },
  prompt: `You are an expert Career Advisor AI. Your task is to provide a comprehensive and helpful answer to the user's question.

{{#if resumeText}}
The user has provided the following resume information:
--- RESUME START ---
{{{resumeText}}}
--- RESUME END ---

If the user's question is specifically about their resume (e.g., "what do you think of my resume?", "how can I improve this section?", "is my resume good for X role?"), use the provided resume information AS THE PRIMARY BASIS for your answer and provide constructive feedback or analysis.
{{/if}}

For general career questions not directly about the provided resume, or if no resume is provided or the question is not about the resume, use the following context snippets and your general knowledge.
If the snippets directly address part of the question, prioritize using that information and integrate it smoothly.
If the snippets are not very relevant or don't fully cover the question, rely more on your broader knowledge to give a thorough and detailed response.

Provided Context Snippets (for general career questions):
{{#if retrievedSnippets.length}}
  {{#each retrievedSnippets}}
  - {{{this}}}
  {{/each}}
{{else}}
  (No specific context snippets were retrieved for this query for general questions, or they were not deemed highly relevant by the retrieval system.)
{{/if}}

User's Question: {{{userQuery}}}

Answer:`,
});


// Define the RAG flow
const contextualJobHelperRAGFlow = ai.defineFlow(
  {
    name: 'contextualJobHelperRAGFlow',
    inputSchema: ContextualJobHelperInputSchema,
    outputSchema: ContextualJobHelperOutputSchema,
  },
  async (input) => {
    // Step 1: Retrieve relevant context using the tool (for general questions)
    // We can decide to skip this if the query is clearly about the resume and resumeText is provided.
    // For simplicity now, we retrieve snippets regardless, LLM prompt will differentiate.
    const retrievedSnippets = await relevantInfoRetrieverTool({ query: input.userQuery });

    // Step 2: Generate an answer using the LLM with the retrieved context and potentially resume text
    const { output } = await contextualHelpPrompt({
      userQuery: input.userQuery,
      resumeText: input.resumeText,
      retrievedSnippets: retrievedSnippets,
    });
    
    if (!output) {
        // Should not happen with a defined output schema, but handle defensively
        return { answer: "I'm sorry, I encountered an issue and couldn't generate a response." };
    }

    // Return the LLM's answer, and include the snippets for transparency if needed.
    return {
        answer: output.answer,
        // Only return retrievedContextItems if the resumeText wasn't the primary focus (or wasn't available)
        // This logic can be refined. For now, let's include them if they exist.
        retrievedContextItems: retrievedSnippets.length > 0 ? retrievedSnippets : undefined,
    };
  }
);

