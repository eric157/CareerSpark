
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
  numResults: z.number().optional().default(10).describe('The desired number of search results (max 10, will be capped by API limits). This also dictates how many detailed listing lookups will be attempted.'),
  location: z.string().optional().describe('Optional location for the job search (e.g., "Austin, TX", "Remote")'),
});
export type JobSearchInput = z.infer<typeof JobSearchInputSchema>;

const JobSearchResultSchema = z.object({
  id: z.string().describe("A unique identifier for the job listing. MUST be the 'job_id' from SerpApi if available, otherwise a generated UUID."),
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job. If not provided by SerpApi, it will be undefined.'),
  url: z.string().url().optional().describe("A URL link to the job posting. This should be the most direct application or viewing link available. Omit this field entirely if no valid URL is available from SerpApi or if it's null."),
  description: z.string().optional().describe('A brief snippet or summary of the job, used as description. Will be undefined if not provided by SerpApi.'),
  postedDate: z.string().optional().describe('The date the job was posted (e.g., "2 days ago", "2024-07-28"). Will be undefined if not available as a string from SerpApi.'),
  employmentType: z.string().optional().describe('Type of employment (e.g., "Full-time", "Contract"). Will be undefined if not available as a string from SerpApi.')
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

  // Step 1: Initial search for jobs to get job_ids
  const initialSearchParams = new URLSearchParams({
    engine: 'google_jobs',
    q: input.query,
    api_key: apiKey,
    hl: 'en',
    gl: 'us',
    num: Math.min(input.numResults ?? 10, 15).toString(), 
  });

  if (input.location) {
    initialSearchParams.append('location', input.location);
  }

  const INITIAL_API_ENDPOINT = `https://serpapi.com/search.json?${initialSearchParams.toString()}`;
  let initialData;

  try {
    // console.log(`Fetching initial jobs from SerpApi: ${INITIAL_API_ENDPOINT.replace(apiKey, 'SERPAPI_API_KEY_HIDDEN')}`);
    const initialResponse = await fetch(INITIAL_API_ENDPOINT);

    if (!initialResponse.ok) {
      const errorBody = await initialResponse.text();
      console.error(`SerpApi HTTP Error (google_jobs): ${initialResponse.status} ${initialResponse.statusText}. Error Body: ${errorBody}`);
      return generateDynamicMockResults(input, `SerpApi HTTP Error (google_jobs): ${initialResponse.status}. ${errorBody}.`);
    }
    initialData = await initialResponse.json();

    if (initialData.error) {
        console.error('SerpApi returned an error in initial search (google_jobs):', initialData.error, `Query: "${input.query}", Location: "${input.location || 'N/A'}"`);
        return generateDynamicMockResults(input, `SerpApi API Error (google_jobs): ${initialData.error}`);
    }
    
    if (!initialData.jobs_results || initialData.jobs_results.length === 0) {
      console.log('No job results from SerpApi (google_jobs) for query:', input.query, 'Location:', input.location || 'N/A');
      return []; // Return empty if API is fine but no results
    }

  } catch (error) {
    console.error('Failed to fetch initial jobs from SerpApi (Network/other error):', error);
    return generateDynamicMockResults(input, `Failed to connect to SerpApi (google_jobs). ${error instanceof Error ? error.message : String(error)}`);
  }

  const processedJobsPromises = initialData.jobs_results.slice(0, Math.min(input.numResults ?? 10, 15)).map(async (initialJob: any): Promise<JobSearchResult | null> => {
    let determinedUrl: string | undefined = undefined;
    const jobId = initialJob.job_id; // This is the critical ID from SerpApi

    if (jobId) {
      const listingParams = new URLSearchParams({
        engine: 'google_jobs_listing',
        q: jobId,
        api_key: apiKey,
      });
      const LISTING_API_ENDPOINT = `https://serpapi.com/search.json?${listingParams.toString()}`;

      try {
        const listingResponse = await fetch(LISTING_API_ENDPOINT);
        if (!listingResponse.ok) {
          const listingErrorBody = await listingResponse.text();
          console.warn(`SerpApi HTTP Error for listing ${jobId} (google_jobs_listing): ${listingResponse.status} ${listingResponse.statusText}. Body: ${listingErrorBody}. Falling back on initialJob.link if available.`);
          determinedUrl = initialJob.link; 
        } else {
          const listingData = await listingResponse.json();
          if (listingData.error) {
            console.warn(`SerpApi Error in listing response for ${jobId} (google_jobs_listing): ${listingData.error}. Falling back.`);
            determinedUrl = initialJob.link; 
          } else if (listingData.apply_options && listingData.apply_options.length > 0) {
            // Prioritize "Apply on Company Website" or "Apply Direct"
            const companyApplyOption = listingData.apply_options.find((opt: any) => 
              opt.title?.toLowerCase().includes('company website') || 
              opt.title?.toLowerCase().includes('apply direct')
            );
            determinedUrl = companyApplyOption?.link || listingData.apply_options[0].link;
          } else {
            determinedUrl = initialJob.link;
          }
        }
      } catch (listingError) {
        console.warn(`Failed to fetch listing details for job_id ${jobId} (google_jobs_listing Network/other):`, listingError instanceof Error ? listingError.message : String(listingError), `. Falling back.`);
        determinedUrl = initialJob.link; 
      }
    } else {
        determinedUrl = initialJob.link; // No job_id from initial search, try to use initialJob.link
    }
    
    // Validate and finalize determinedUrl
    if (determinedUrl) {
        try {
            new URL(determinedUrl); // Check if it's a valid URL
        } catch (e) {
            // If the primary determinedUrl is invalid, and we have a job_id, construct Google Jobs detail page as a last resort.
            if (jobId) {
              determinedUrl = `https://www.google.com/search?q=${encodeURIComponent(initialJob.title || input.query)}+${encodeURIComponent(initialJob.company_name || '')}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htidocid=${jobId}`;
              try { new URL(determinedUrl); } catch (e2) { determinedUrl = undefined; } // Final check on fallback
            } else {
              determinedUrl = undefined; // Invalid and no job_id to make a fallback
            }
        }
    } else if (jobId) { // If no URL found yet, but we have a job_id, create Google Jobs link
        determinedUrl = `https://www.google.com/search?q=${encodeURIComponent(initialJob.title || input.query)}+${encodeURIComponent(initialJob.company_name || '')}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htidocid=${jobId}`;
        try { new URL(determinedUrl); } catch (e2) { determinedUrl = undefined; } 
    }

    const description = initialJob.description || `Details for ${initialJob.title || 'this role'} at ${initialJob.company_name || 'this company'}.`;
    
    const postedAt = initialJob.detected_extensions?.posted_at;
    const scheduleType = initialJob.detected_extensions?.schedule_type;

    return {
      id: jobId || uuidv4(), // MUST have an ID. Prioritize SerpApi's job_id.
      title: initialJob.title || 'N/A',
      company: initialJob.company_name || 'N/A',
      location: initialJob.location || undefined,
      url: determinedUrl || undefined, // Ensure it's undefined if no valid URL
      description: description,
      postedDate: typeof postedAt === 'string' ? postedAt : undefined,
      employmentType: typeof scheduleType === 'string' ? scheduleType : undefined,
    };
  });

  const resolvedJobs = await Promise.all(processedJobsPromises);
  return resolvedJobs.filter(job => job !== null) as JobSearchOutput;
}


function generateDynamicMockResults(input: JobSearchInput, errorInfo?: string): JobSearchOutput {
  const results: JobSearchOutput = [];
  const queryKeywords = input.query.toLowerCase().split(' ').filter(kw => kw.length > 1);
  
  let baseTitle = "Software Engineer";
  if (queryKeywords.includes("manager")) baseTitle = "Product Manager";
  if (queryKeywords.includes("data")) baseTitle = "Data Scientist";
  if (queryKeywords.includes("designer")) baseTitle = "UX Designer";
  if (queryKeywords.includes("analyst")) baseTitle = "Business Analyst";

  const locations = ["New York, NY", "San Francisco, CA", "Austin, TX", "Remote", "Chicago, IL"];
  const companies = ["Innovatech Solutions", "FutureAI Dynamics", "CyberSec Corp Ltd.", "GreenLeaf Organics", "Quantum Leap AI"];
  const jobTypes = ["Full-time", "Contract", "Part-time", "Internship"];

  const numToGenerate = Math.min(input.numResults ?? 3, 3); 

  for (let i = 0; i < numToGenerate ; i++) {
    const roleFromQuery = queryKeywords.find(kw => !["remote", "full-time", "contract", "internship", ...locations.join(' ').toLowerCase().split(' ')].includes(kw));
    const dynamicRole = roleFromQuery ? (roleFromQuery.charAt(0).toUpperCase() + roleFromQuery.slice(1)) : baseTitle.split(' ')[0];
    
    const titleSuffixes = ['Lead', 'Senior', 'Associate', 'Junior', 'Principal'];
    const dynamicTitle = `${titleSuffixes[i % titleSuffixes.length]} ${dynamicRole} ${baseTitle.split(' ').slice(1).join(' ')}`;
    
    const dynamicCompany = companies[i % companies.length];
    const dynamicLocation = input.location || locations[i % locations.length];
    const jobUrl = `https://mockjobs.dev/posting/${dynamicTitle.toLowerCase().replace(/\s+/g, '-')}-${dynamicCompany.toLowerCase().split(' ')[0]}-${i + 1}`;
    const mockDescription = errorInfo 
        ? `MOCK DATA (Real job search failed: ${errorInfo}). ` 
        : `MOCK DATA: Seeking a talented ${dynamicTitle} for ${dynamicCompany} in ${dynamicLocation}. Key skills based on query: ${input.query}. This role involves working on cutting-edge projects and collaborating with a dynamic team to achieve innovative solutions. Responsibilities include A, B, and C. Ideal candidates will have experience in X, Y, and Z.`;

    results.push({
      id: uuidv4(),
      title: dynamicTitle,
      company: dynamicCompany,
      location: dynamicLocation,
      url: jobUrl,
      description: mockDescription,
      postedDate: `${Math.floor(Math.random() * 28) + 1} days ago`,
      employmentType: jobTypes[i % jobTypes.length]
    });
  }
  return results;
}


export const searchJobsTool = ai.defineTool(
  {
    name: 'searchJobsTool',
    description: 'Searches the web for job listings based on a query, and optionally a location. It attempts to find direct application links. Use this to find current job openings. Returns job details including ID, title, company, location, URL, description, posted date, and employment type.',
    inputSchema: JobSearchInputSchema,
    outputSchema: JobSearchOutputSchema,
  },
  async (input) => {
    const cappedInput = { ...input, numResults: Math.min(input.numResults ?? 10, 15) }; 
    return fetchJobsFromSerpApi(cappedInput);
  }
);
