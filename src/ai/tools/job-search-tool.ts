
'use server';
/**
 * @fileOverview A Genkit tool for searching job listings on the web.
 *
 * Exports:
 * - searchJobsTool: The Genkit tool definition for job searching.
 * - JobSearchInput: Type for the input to the job search tool.
 * - JobSearchResult: Type for a single job search result.
 * - JobSearchOutput: Type for the array of job search results.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Internal Schemas (not directly exported as constants)
const JobSearchInputSchema = z.object({
  query: z.string().describe('The search query for job roles (e.g., "React developer in San Francisco").'),
  numResults: z.number().optional().default(5).describe('The desired number of search results (max 10).'),
});
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;

const JobSearchResultSchema = z.object({
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job.'),
  url: z.string().url().describe('A URL link to the job posting.'),
  snippet: z.string().optional().describe('A brief snippet or summary of the job.'),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2024-07-28").'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract").')
});
export type JobSearchResult = z.infer<typeof JobSearchResultSchema>;

const JobSearchOutputSchema = z.array(JobSearchResultSchema).describe('A list of job search results.');
export type JobSearchOutput = z.infer<typeof JobSearchOutputSchema>;


// --- Real API Integration Placeholder ---
// Replace this mock function with actual API calls to a job search provider.
async function fetchJobsFromRealAPI(input: JobSearchInput): Promise<JobSearchOutput> {
  console.log(`Simulating REAL API call for jobs with query: "${input.query}", numResults: ${input.numResults}`);

  // const API_KEY = process.env.YOUR_JOB_API_KEY; // Store your API key in .env
  // const API_ENDPOINT = 'https://api.examplejobprovider.com/search';
  //
  // if (!API_KEY) {
  //   console.warn("API Key for job search is not configured. Returning mock data.");
  //   // Fallback to more dynamic mock data if API key is missing
  //   return generateDynamicMockResults(input);
  // }
  //
  // try {
  //   const response = await fetch(`${API_ENDPOINT}?query=${encodeURIComponent(input.query)}&limit=${input.numResults}&apiKey=${API_KEY}`, {
  //     method: 'GET',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //   });
  //
  //   if (!response.ok) {
  //     console.error(`API Error: ${response.status} ${response.statusText}`);
  //     // Fallback to mock data or throw error
  //     return generateDynamicMockResults(input, `API Error: ${response.status}`);
  //   }
  //
  //   const data = await response.json();
  //
  //   // IMPORTANT: You'll need to map the structure of `data` from your chosen API
  //   // to the `JobSearchResultSchema`.
  //   // Example mapping (highly dependent on the actual API response):
  //   // return data.jobs.map(job => ({
  //   //   title: job.title,
  //   //   company: job.companyName,
  //   //   location: job.location,
  //   //   url: job.jobUrl,
  //   //   snippet: job.descriptionSnippet,
  //   //   postedDate: job.datePosted,
  //   //   employmentType: job.employmentType
  //   // }));
  //
  //   // For now, we'll continue with dynamic mock generation.
  //   // Remove this line once you have integrated a real API.
     return generateDynamicMockResults(input);
  //
  // } catch (error) {
  //   console.error('Failed to fetch jobs from API:', error);
  //   // Fallback to mock data or throw error
  //   return generateDynamicMockResults(input, 'Failed to connect to API.');
  // }
  return generateDynamicMockResults(input); // Fallback for now
}

// This function generates more dynamic mock results based on the query
function generateDynamicMockResults(input: JobSearchInput, errorInfo?: string): JobSearchOutput {
  const results: JobSearchOutput = [];
  const queryKeywords = input.query.toLowerCase().split(' ').filter(kw => kw.length > 1);
  
  let baseTitle = "Software Engineer";
  let baseCompany = "Tech Solutions";
  let baseLocation = "Remote";

  if (queryKeywords.includes("manager")) baseTitle = "Product Manager";
  if (queryKeywords.includes("data")) baseTitle = "Data Scientist";
  if (queryKeywords.includes("ux") || queryKeywords.includes("ui")) baseTitle = "UX Designer";
  if (queryKeywords.includes("analyst")) baseTitle = "Business Analyst";


  const locations = ["New York, NY", "San Francisco, CA", "Austin, TX", "Chicago, IL", "Remote", "London, UK", "Berlin, Germany"];
  const companies = ["Innovatech", "FutureAI", "CyberSec Corp", "EcoWorld Ltd", "HealthFirst Inc."];
  const jobTypes = ["Full-time", "Contract", "Part-time", "Internship"];

  for (let i = 0; i < (input.numResults ?? 5); i++) {
    const qTitle = queryKeywords.find(kw => !["remote", "full-time", "contract", "manager", "data", "ux", "ui", "analyst", ...locations.join(' ').toLowerCase().split(' ')].includes(kw)) || baseTitle.split(' ')[0];
    const dynamicTitle = `${qTitle.charAt(0).toUpperCase() + qTitle.slice(1)} ${baseTitle.split(' ').slice(1).join(' ')} ${(i % 3 === 0) ? 'Lead' : (i % 3 === 1) ? 'Senior' : 'Associate'}`;
    const dynamicCompany = `${companies[i % companies.length]} ${queryKeywords.includes("startup") ? "Startup" : "Global"}`;
    const dynamicLocation = locations[i % locations.length];
    const postedDate = new Date(Date.now() - (i * 24 * 60 * 60 * 1000) - (Math.random() * 10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];


    results.push({
      title: dynamicTitle,
      company: dynamicCompany,
      location: queryKeywords.find(kw => locations.map(l=>l.toLowerCase()).includes(kw)) || dynamicLocation,
      url: `https://mockjobs.dev/posting/${dynamicTitle.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`,
      snippet: errorInfo ? `Could not fetch real jobs: ${errorInfo}. ` : `Seeking a ${dynamicTitle} to join ${dynamicCompany} in ${dynamicLocation}. Key skills: ${input.query}. This is a mock result.`,
      postedDate: postedDate,
      employmentType: jobTypes[i % jobTypes.length]
    });
  }
  return results;
}


export const searchJobsTool = ai.defineTool(
  {
    name: 'searchJobsTool',
    description: 'Searches the web for job listings based on a query. Use this to find current job openings if the user asks for jobs and no specific listings are provided, or if the provided listings are insufficient.',
    inputSchema: JobSearchInputSchema,
    outputSchema: JobSearchOutputSchema,
  },
  async (input) => {
    // In a real scenario, you'd call your chosen job search API here.
    // For now, it calls the placeholder function.
    return fetchJobsFromRealAPI(input);
  }
);
