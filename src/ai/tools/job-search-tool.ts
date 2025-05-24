
'use server';
/**
 * @fileOverview A Genkit tool for searching job listings on the web.
 *
 * Exports:
 * - searchJobsTool: The Genkit tool definition for job searching.
 * - JobSearchInput: Type for the input to the job search tool.
 * - JobSearchResult: Type for a single job search result.
 * - JobSearchOutput: Type for the array of job search results.
 *
 * Internal schemas (not exported): JobSearchInputSchema, JobSearchResultSchema, JobSearchOutputSchema.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const JobSearchInputSchema = z.object({
  query: z.string().describe('The search query for job roles (e.g., "React developer in San Francisco").'),
  numResults: z.number().optional().default(3).describe('The desired number of search results (max 5).'),
});
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;

const JobSearchResultSchema = z.object({
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job.'),
  url: z.string().url().describe('A URL link to the job posting.'),
  snippet: z.string().optional().describe('A brief snippet or summary of the job.'),
});
export type JobSearchResult = z.infer<typeof JobSearchResultSchema>;

const JobSearchOutputSchema = z.array(JobSearchResultSchema).describe('A list of job search results.');
export type JobSearchOutput = z.infer<typeof JobSearchOutputSchema>;


// This is a mock implementation that dynamically generates results based on the query.
// In a real application, you would integrate with a job search API.
const performWebSearch = async (input: JobSearchInput): Promise<JobSearchOutput> => {
  console.log(`Simulating web search for jobs with query: "${input.query}" and up to ${input.numResults} results.`);
  
  const results: JobSearchOutput = [];
  const queryKeywords = input.query.toLowerCase().split(' ').filter(kw => kw.length > 2);
  const primaryKeyword = queryKeywords.length > 0 ? queryKeywords[0] : "developer";
  const locationKeywords = queryKeywords.filter(kw => ['remote', 'san francisco', 'new york', 'austin', 'london', 'berlin'].includes(kw));
  const baseLocation = locationKeywords.length > 0 ? locationKeywords[0].charAt(0).toUpperCase() + locationKeywords[0].slice(1) : "Remote";

  const mockCompanySuffixes = ['Solutions', 'Corp', 'LLC', 'Tech', 'Innovations', 'Group'];
  const mockTitles = [
    `Senior ${primaryKeyword} Engineer`,
    `${primaryKeyword} Team Lead`,
    `Junior ${primaryKeyword}`,
    `Mid-Level ${primaryKeyword} Specialist`,
    `${primaryKeyword} Architect`
  ];

  const numToGenerate = Math.min(input.numResults ?? 3, 5); // Cap at 5 results for mock

  for (let i = 0; i < numToGenerate; i++) {
    const companyName = `${primaryKeyword.charAt(0).toUpperCase() + primaryKeyword.slice(1)} ${mockCompanySuffixes[i % mockCompanySuffixes.length]}`;
    const jobTitle = mockTitles[i % mockTitles.length];
    const location = i % 2 === 0 && locationKeywords.length > 1 ? locationKeywords[1].charAt(0).toUpperCase() + locationKeywords[1].slice(1) : baseLocation;
    
    results.push({
      title: jobTitle,
      company: companyName,
      location: location,
      url: `https://example.com/job/${primaryKeyword.replace(/\s+/g, '-')}-${companyName.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      snippet: `Exciting opportunity for a ${jobTitle} at ${companyName}. Looking for candidates skilled in ${input.query.split(' ').slice(0, 3).join(', ')}. Apply now to join our ${location}-based team!`,
    });
  }
  
  return results;
};

export const searchJobsTool = ai.defineTool(
  {
    name: 'searchJobsTool',
    description: 'Searches the web for job listings based on a query. Use this to find current job openings if the user asks for jobs and no specific listings are provided, or if the provided listings are insufficient.',
    inputSchema: JobSearchInputSchema,
    outputSchema: JobSearchOutputSchema,
  },
  async (input) => {
    // In a real scenario, you'd call a job search API here.
    return performWebSearch(input);
  }
);

