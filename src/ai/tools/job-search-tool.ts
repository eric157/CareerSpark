
'use server';
/**
 * @fileOverview A Genkit tool for searching job listings on the web using SerpApi.
 *
 * Exports:
 * - searchJobsTool: The Genkit tool definition for job searching.
 * - JobSearchInput: Type for the input to the job search tool.
 * - JobSearchResult: Type for a single job search result.
 * - JobSearchOutput: Type for the array of job search results.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Internal Schemas (not directly exported as constants)
const JobSearchInputSchema = z.object({
  query: z.string().describe('The search query for job roles (e.g., "React developer in San Francisco").'),
  numResults: z.number().optional().default(10).describe('The desired number of search results (max 10, will be capped by API limits).'), // Increased default to 10 for more options
  location: z.string().optional().describe('Optional location for the job search (e.g., "Austin, TX", "Remote")'),
});
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;

const JobSearchResultSchema = z.object({
  id: z.string().describe('A unique identifier for the job listing.'),
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job. If not provided, it will be undefined.'),
  url: z.string().url().describe('A URL link to the job posting or a Google Jobs link.'),
  description: z.string().optional().describe('A brief snippet or summary of the job, used as description.'),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28"). Will be undefined if not available as a string.'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract"). Will be undefined if not available as a string.')
});
export type JobSearchResult = z.infer<typeof JobSearchResultSchema>;

const JobSearchOutputSchema = z.array(JobSearchResultSchema).describe('A list of job search results.');
export type JobSearchOutput = z.infer<typeof JobSearchOutputSchema>;


async function fetchJobsFromSerpApi(input: JobSearchInput): Promise<JobSearchOutput> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.warn("SERPAPI_API_KEY is not configured. Returning mock data. Please add your API key to .env file.");
    return generateDynamicMockResults(input, 'SERPAPI_API_KEY not found. Real job search disabled.');
  }

  const searchParams = new URLSearchParams({
    engine: 'google_jobs',
    q: input.query,
    api_key: apiKey,
    hl: 'en', 
    gl: 'us', 
    num: Math.min(input.numResults ?? 10, 20).toString(), // SerpApi 'num' usually maxes around 10-20 for jobs
  });

  if (input.location) {
    searchParams.append('location', input.location);
  }

  const API_ENDPOINT = `https://serpapi.com/search.json?${searchParams.toString()}`;

  try {
    console.log(`Fetching jobs from SerpApi: ${API_ENDPOINT.replace(apiKey, 'SERPAPI_API_KEY_HIDDEN')}`);
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`SerpApi Error: ${response.status} ${response.statusText}`, errorBody);
      // Fallback to mocks on API error to keep the app somewhat functional
      return generateDynamicMockResults(input, `SerpApi Error: ${response.status}. ${errorBody}. Consider checking API key or query.`);
    }

    const data = await response.json();

    if (data.error) {
        console.error('SerpApi returned an error in the response body:', data.error);
        return generateDynamicMockResults(input, `SerpApi returned an error: ${data.error}`);
    }
    
    if (!data.jobs_results || data.jobs_results.length === 0) {
      console.log('No job results from SerpApi for query:', input.query);
      return []; // Return empty array, the flow will handle 'noResultsFeedback'
    }

    return data.jobs_results.map((job: any) => {
      let jobUrl = job.link || job.related_links?.find((l:any) => l.link?.includes('apply') || l.text?.toLowerCase().includes('apply'))?.link || job.related_links?.find((l:any) => l.link)?.link;
      if (!jobUrl && job.job_id) {
        // Fallback to a generic Google Jobs search link if no direct link is found
        jobUrl = `https://www.google.com/search?q=${encodeURIComponent(job.title || input.query)}+${encodeURIComponent(job.company_name || '')}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htidocid=${job.job_id}`;
      }
      
      try {
        if (jobUrl) new URL(jobUrl); 
        else throw new Error("Missing URL");
      } catch (e) {
        console.warn(`Invalid or missing URL for job "${job.title}", using placeholder Google search. Original: ${jobUrl}`);
        jobUrl = `https://www.google.com/search?q=${encodeURIComponent(job.title || input.query)}+${encodeURIComponent(job.company_name || '')}`;
      }

      return {
        id: job.job_id || uuidv4(),
        title: job.title || 'N/A',
        company: job.company_name || 'N/A',
        location: job.location, // SerpApi usually provides this; if not, it will be undefined
        url: jobUrl,
        // Use description or snippet. If neither, provide a generic one.
        description: job.description || job.snippet || `Details for ${job.title} at ${job.company_name}.`,
        // Ensure null from SerpApi becomes undefined for Zod optional strings
        postedDate: job.detected_extensions?.posted_at || undefined, 
        employmentType: job.detected_extensions?.schedule_type || undefined,
      };
    }).filter((job: JobSearchResult) => job.url); // Ensure jobs have a URL
  
  } catch (error) {
    console.error('Failed to fetch jobs from SerpApi:', error);
    // Fallback to mocks on network or unexpected error
    return generateDynamicMockResults(input, `Failed to connect to SerpApi. ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Keeps mock generator for fallback if API key is missing or API fails catastrophically
function generateDynamicMockResults(input: JobSearchInput, errorInfo?: string): JobSearchOutput {
  const results: JobSearchOutput = [];
  const queryKeywords = input.query.toLowerCase().split(' ').filter(kw => kw.length > 1);
  
  let baseTitle = "Software Engineer";
  if (queryKeywords.includes("manager")) baseTitle = "Product Manager";
  if (queryKeywords.includes("data")) baseTitle = "Data Scientist";

  const locations = ["New York, NY", "San Francisco, CA", "Austin, TX", "Remote"];
  const companies = ["Innovatech", "FutureAI Dynamics", "CyberSec Corp Ltd."];
  const jobTypes = ["Full-time", "Contract", "Part-time"];

  for (let i = 0; i < Math.min(input.numResults ?? 3, 3) ; i++) { // Generate fewer mocks
    const roleFromQuery = queryKeywords.find(kw => !["remote", "full-time", "contract", ...locations.join(' ').toLowerCase().split(' ')].includes(kw));
    const dynamicRole = roleFromQuery ? (roleFromQuery.charAt(0).toUpperCase() + roleFromQuery.slice(1)) : baseTitle.split(' ')[0];
    
    const titleSuffixes = ['Lead', 'Senior', 'Associate'];
    const dynamicTitle = `${dynamicRole} ${baseTitle.split(' ').slice(1).join(' ')} ${titleSuffixes[i % titleSuffixes.length]}`;
    
    const dynamicCompany = companies[i % companies.length];
    const dynamicLocation = input.location || locations[i % locations.length];
    const jobUrl = `https://mockjobs.dev/posting/${dynamicTitle.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;

    results.push({
      id: uuidv4(),
      title: dynamicTitle,
      company: dynamicCompany,
      location: dynamicLocation,
      url: jobUrl,
      description: errorInfo ? `MOCK DATA (Real search failed: ${errorInfo}). ` : `MOCK DATA: Seeking a talented ${dynamicTitle} for ${dynamicCompany} in ${dynamicLocation}. Key skills based on query: ${input.query}.`,
      postedDate: `${Math.floor(Math.random() * 10) + 1} days ago`,
      employmentType: jobTypes[i % jobTypes.length]
    });
  }
  return results;
}


export const searchJobsTool = ai.defineTool(
  {
    name: 'searchJobsTool',
    description: 'Searches the web for job listings based on a query, and optionally a location. Use this to find current job openings. Returns job details including ID, title, company, location, URL, description, posted date, and employment type.',
    inputSchema: JobSearchInputSchema,
    outputSchema: JobSearchOutputSchema,
  },
  async (input) => {
    // Cap the number of results to a reasonable limit to avoid excessive API calls/costs
    const cappedInput = { ...input, numResults: Math.min(input.numResults ?? 10, 15) };
    return fetchJobsFromSerpApi(cappedInput);
  }
);

