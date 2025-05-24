'use server';
/**
 * @fileOverview A Genkit tool that simulates retrieving relevant information snippets.
 *
 * Exports:
 * - relevantInfoRetrieverTool: The Genkit tool definition.
 * - RelevantInfoRetrieverInput: Type for the input to the tool.
 * - RelevantInfoRetrieverOutput: Type for the array of retrieved text snippets.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RelevantInfoRetrieverInputSchema = z.object({
  query: z.string().describe('The user query or topic to search for relevant information.'),
});
export type RelevantInfoRetrieverInput = z.infer<typeof RelevantInfoRetrieverInputSchema>;

const RelevantInfoRetrieverOutputSchema = z.array(
  z.string().describe('A snippet of relevant text information.')
).describe('A list of relevant text snippets found for the query.');
export type RelevantInfoRetrieverOutput = z.infer<typeof RelevantInfoRetrieverOutputSchema>;

// Mock knowledge base
const mockKnowledgeBase = [
  {
    id: 'kb1',
    keywords: ['behavioral', 'interview', 'star method', 'questions'],
    content:
      'When answering behavioral interview questions, use the STAR method: Situation, Task, Action, Result. This provides a structured way to describe your experiences and their outcomes.',
  },
  {
    id: 'kb2',
    keywords: ['resume', 'skills', 'ats', 'applicant tracking system', 'tailor'],
    content:
      'Tailor your resume for each job application. Highlight skills and keywords mentioned in the job description to improve your chances of passing Applicant Tracking Systems (ATS).',
  },
  {
    id: 'kb3',
    keywords: ['salary', 'negotiation', 'research', 'compensation'],
    content:
      'Before negotiating salary, research average compensation for similar roles in your location and industry. Be prepared to articulate your value and contributions to the company.',
  },
  {
    id: 'kb4',
    keywords: ['software engineer', 'technical interview', 'coding challenge', 'system design'],
    content:
      'Software engineer technical interviews often involve live coding challenges (focusing on data structures and algorithms) and system design questions to assess problem-solving abilities.',
  },
  {
    id: 'kb5',
    keywords: ['networking', 'job search', 'linkedin', 'informational interview'],
    content:
      'Networking is crucial in a job search. Actively engage on platforms like LinkedIn, attend industry events (even virtual ones), and conduct informational interviews to learn and make connections.',
  },
  {
    id: 'kb6',
    keywords: ['cover letter', 'purpose', 'application'],
    content:
      'A cover letter complements your resume by allowing you to express your interest in a specific role and company, and to highlight how your skills and experiences align with their needs. Make it concise and targeted.'
  },
  {
    id: 'kb7',
    keywords: ['follow up', 'interview', 'thank you note'],
    content:
      "Always send a thank-you note or email within 24 hours after an interview. It's a professional courtesy that reiterates your interest and allows you to mention anything you might have missed."
  }
];

async function retrieveRelevantSnippets(
  input: RelevantInfoRetrieverInput
): Promise<RelevantInfoRetrieverOutput> {
  const queryWords = input.query.toLowerCase().split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) {
    return [];
  }

  const relevantSnippets: string[] = [];
  const addedSnippetIds = new Set<string>();

  mockKnowledgeBase.forEach((doc) => {
    let matchCount = 0;
    queryWords.forEach((queryWord) => {
      if (doc.keywords.some(kw => kw.includes(queryWord))) {
        matchCount++;
      } else if (doc.content.toLowerCase().includes(queryWord)) {
        matchCount++;
      }
    });

    // Add snippet if it has at least one keyword match and hasn't been added
    // Prioritize snippets with more matches, up to a limit of 3 snippets
    if (matchCount > 0 && !addedSnippetIds.has(doc.id) && relevantSnippets.length < 3) {
      relevantSnippets.push(doc.content);
      addedSnippetIds.add(doc.id);
    }
  });
  
  if (relevantSnippets.length === 0 && input.query.length > 5) {
    // Fallback for less specific queries - return a generic tip if no direct matches
     relevantSnippets.push("For effective job searching, ensure your resume is up-to-date and tailored to the roles you're applying for. Networking and preparing for interviews are also key steps.");
  }

  return relevantSnippets;
}

export const relevantInfoRetrieverTool = ai.defineTool(
  {
    name: 'relevantInfoRetrieverTool',
    description: 'Retrieves snippets of information relevant to a user query about job searching, resumes, interviews, etc. from a knowledge base.',
    inputSchema: RelevantInfoRetrieverInputSchema,
    outputSchema: RelevantInfoRetrieverOutputSchema,
  },
  async (input) => {
    return retrieveRelevantSnippets(input);
  }
);
