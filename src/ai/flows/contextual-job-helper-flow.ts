'use server';
/**
 * @fileOverview A Genkit flow that uses RAG to answer user questions.
 *
 * It retrieves relevant context using a tool and then prompts an LLM
 * to answer the user's question based on that context and its general knowledge.
 *
 * Exports:
 * - contextualJobHelper - The main function to trigger the RAG flow.
 * - ContextualJobHelperInput - Input type (user's question).
 * - ContextualJobHelperOutput - Output type (LLM's answer).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { relevantInfoRetrieverTool } from '@/ai/tools/relevant-info-retriever-tool';

// Input Schema
const ContextualJobHelperInputSchema = z.object({
  userQuery: z.string().describe("The user's question about job searching, interviews, resumes, etc."),
});
export type ContextualJobHelperInput = z.infer<typeof ContextualJobHelperInputSchema>;

// Output Schema
const ContextualJobHelperOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the user\'s query, based on retrieved context and general knowledge.'),
  retrievedContextItems: z.array(z.string()).optional().describe('Snippets of context retrieved and used by the LLM.'),
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
      retrievedSnippets: z.array(z.string()),
    }) 
  },
  output: { schema: ContextualJobHelperOutputSchema },
  prompt: `You are an expert Career Advisor AI. Your task is to provide a comprehensive and helpful answer to the user's question.
Use the provided context snippets as a starting point or to supplement your answer.
If the snippets directly address part of the question, prioritize using that information and integrate it smoothly into your overall response.
If the snippets are not very relevant or don't fully cover the question, rely more on your general knowledge to give a thorough and detailed response.
Ensure your answer is well-structured, easy to understand, and directly addresses the user's query.

Provided Context Snippets:
{{#if retrievedSnippets.length}}
  {{#each retrievedSnippets}}
  - {{{this}}}
  {{/each}}
{{else}}
  (No specific context snippets were retrieved for this query, or they were not deemed highly relevant by the retrieval system.)
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
    // Step 1: Retrieve relevant context using the tool
    const retrievedSnippets = await relevantInfoRetrieverTool({ query: input.userQuery });

    // Step 2: Generate an answer using the LLM with the retrieved context
    const { output } = await contextualHelpPrompt({
      userQuery: input.userQuery,
      retrievedSnippets: retrievedSnippets,
    });
    
    if (!output) {
        // Should not happen with a defined output schema, but handle defensively
        return { answer: "I'm sorry, I encountered an issue and couldn't generate a response." };
    }

    // Return the LLM's answer, and include the snippets for transparency if needed.
    return {
        answer: output.answer,
        retrievedContextItems: retrievedSnippets.length > 0 ? retrievedSnippets : undefined,
    };
  }
);
