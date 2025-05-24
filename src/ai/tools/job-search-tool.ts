
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
  numResults: z.number().optional().default(5).describe('The desired number of search results (max 10, will be capped by API limits).'),
  location: z.string().optional().describe('Optional location for the job search (e.g., "Austin, TX", "Remote")'),
});
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;

const JobSearchResultSchema = z.object({
  id: z.string().describe('A unique identifier for the job listing.'),
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job.'),
  url: z.string().url().describe('A URL link to the job posting or a Google Jobs link.'),
  description: z.string().optional().describe('A brief snippet or summary of the job, used as description.'), // Changed from snippet to description for clarity
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28").'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract").')
});
export type JobSearchResult = z.infer<typeof JobSearchResultSchema>;

const JobSearchOutputSchema = z.array(JobSearchResultSchema).describe('A list of job search results.');
export type JobSearchOutput = z.infer<typeof JobSearchOutputSchema>;


async function fetchJobsFromSerpApi(input: JobSearchInput): Promise<JobSearchOutput> {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.warn("SERPAPI_API_KEY is not configured. Returning mock data. Please add your API key to .env file.");
    return generateDynamicMockResults(input, 'SERPAPI_API_KEY not found.');
  }

  const searchParams = new URLSearchParams({
    engine: 'google_jobs',
    q: input.query,
    api_key: apiKey,
    hl: 'en', // language
    gl: 'us', // country (you might want to make this configurable)
    num: (input.numResults ?? 5).toString(), // SerpApi uses 'num' for number of results
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
      return generateDynamicMockResults(input, `SerpApi Error: ${response.status}. ${errorBody}`);
    }

    const data = await response.json();

    if (data.error) {
        console.error('SerpApi returned an error in the response body:', data.error);
        return generateDynamicMockResults(input, `SerpApi returned an error: ${data.error}`);
    }
    
    if (!data.jobs_results || data.jobs_results.length === 0) {
      console.log('No job results from SerpApi for query:', input.query);
      return [];
    }

    return data.jobs_results.map((job: any) => {
      let jobUrl = job.link || job.related_links?.find((l:any) => l.link)?.link;
      if (!jobUrl && job.job_id) {
        jobUrl = `https://www.google.com/search?q=${encodeURIComponent(input.query)}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htilrad=0&htidocid=${job.job_id}`;
      }
      
      try {
        new URL(jobUrl); 
      } catch (e) {
        console.warn(`Invalid or missing URL for job "${job.title}", using placeholder. Original: ${jobUrl}`);
        jobUrl = `https://www.google.com/search?q=${encodeURIComponent(job.title || input.query)}+${encodeURIComponent(job.company_name || '')}`;
      }

      return {
        id: job.job_id || uuidv4(), // Use job_id if available, otherwise generate a UUID
        title: job.title || 'N/A',
        company: job.company_name || 'N/A',
        location: job.location,
        url: jobUrl,
        description: job.description || job.snippet, // Use description or snippet as the job description
        postedDate: job.detected_extensions?.posted_at,
        employmentType: job.detected_extensions?.schedule_type,
      };
    }).filter((job: JobSearchResult) => job.url); 
  
  } catch (error) {
    console.error('Failed to fetch jobs from SerpApi:', error);
    return generateDynamicMockResults(input, `Failed to connect to SerpApi. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function generateDynamicMockResults(input: JobSearchInput, errorInfo?: string): JobSearchOutput {
  const results: JobSearchOutput = [];
  const queryKeywords = input.query.toLowerCase().split(' ').filter(kw => kw.length > 1);
  
  let baseTitle = "Software Engineer";
  let baseCompany = "Tech Solutions Inc.";
  let baseLocation = input.location || "Remote";

  if (queryKeywords.includes("manager")) baseTitle = "Product Manager";
  if (queryKeywords.includes("data")) baseTitle = "Data Scientist";
  if (queryKeywords.includes("ux") || queryKeywords.includes("ui")) baseTitle = "UX Designer";
  if (queryKeywords.includes("analyst")) baseTitle = "Business Analyst";
  if (queryKeywords.includes("devops")) baseTitle = "DevOps Engineer";

  const locations = ["New York, NY", "San Francisco, CA", "Austin, TX", "Chicago, IL", "Boston, MA", "Seattle, WA", "London, UK", "Berlin, Germany", "Remote"];
  const companies = ["Innovatech", "FutureAI Dynamics", "CyberSec Corp Ltd.", "EcoWorld Solutions", "HealthFirst Digital", "QuantumLeap Tech"];
  const jobTypes = ["Full-time", "Contract", "Part-time", "Internship", "Temporary"];

  for (let i = 0; i < (input.numResults ?? 5); i++) {
    const roleFromQuery = queryKeywords.find(kw => !["remote", "full-time", "contract", "manager", "data", "ux", "ui", "analyst", "devops", ...locations.join(' ').toLowerCase().split(' ')].includes(kw));
    const dynamicRole = roleFromQuery ? (roleFromQuery.charAt(0).toUpperCase() + roleFromQuery.slice(1)) : baseTitle.split(' ')[0];
    
    const titleSuffixes = ['Lead', 'Senior', 'Associate', 'Junior', 'Principal'];
    const dynamicTitle = `${dynamicRole} ${baseTitle.split(' ').slice(1).join(' ')} ${titleSuffixes[i % titleSuffixes.length]}`;
    
    const dynamicCompany = `${companies[i % companies.length]} ${queryKeywords.includes("startup") ? "Startup Division" : (i % 2 === 0 ? "Global" : "Ventures")}`;
    const dynamicLocation = input.location || locations[i % locations.length];
    const postedDate = new Date(Date.now() - (i * 24 * 60 * 60 * 1000) - (Math.random() * 10 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0];
    const jobUrl = `https://mockjobs.dev/posting/${dynamicTitle.toLowerCase().replace(/\s+/g, '-')}-${dynamicCompany.toLowerCase().replace(/\s+/g, '-')}-${i + 1}`;

    results.push({
      id: uuidv4(), // Generate a unique ID for mock results
      title: dynamicTitle,
      company: dynamicCompany,
      location: dynamicLocation,
      url: jobUrl,
      description: errorInfo ? `Could not fetch real jobs: ${errorInfo}. ` : `Seeking a talented ${dynamicTitle} for ${dynamicCompany} in ${dynamicLocation}. Key skills based on query: ${input.query}. This is a mock result.`,
      postedDate: `${Math.floor(Math.random() * 20) + 1} days ago`,
      employmentType: jobTypes[i % jobTypes.length]
    });
  }
  return results;
}


export const searchJobsTool = ai.defineTool(
  {
    name: 'searchJobsTool',
    description: 'Searches the web for job listings based on a query, and optionally a location. Use this to find current job openings if the user asks for jobs and no specific listings are provided, or if the provided listings are insufficient. Returns job details including ID, title, company, location, URL, description, posted date, and employment type.',
    inputSchema: JobSearchInputSchema,
    outputSchema: JobSearchOutputSchema,
  },
  async (input) => {
    return fetchJobsFromSerpApi(input);
  }
);

