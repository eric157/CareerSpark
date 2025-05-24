
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
  id: z.string().describe('A unique identifier for the job listing, typically the job_id from SerpApi.'),
  title: z.string().describe('The job title.'),
  company: z.string().describe('The name of the company offering the job.'),
  location: z.string().optional().describe('The location of the job. If not provided, it will be undefined.'),
  url: z.string().url().optional().describe('A URL link to the job posting. This should be the most direct application or viewing link available (e.g., from apply_options). Omit this field entirely if no valid URL is available from the source or if it\'s null. Do not use `null`.'),
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

  // Step 1: Initial search for jobs to get job_ids
  const initialSearchParams = new URLSearchParams({
    engine: 'google_jobs',
    q: input.query,
    api_key: apiKey,
    hl: 'en',
    gl: 'us',
    num: Math.min(input.numResults ?? 10, 15).toString(), // Cap initial results, details fetched for these.
  });

  if (input.location) {
    initialSearchParams.append('location', input.location);
  }

  const INITIAL_API_ENDPOINT = `https://serpapi.com/search.json?${initialSearchParams.toString()}`;
  let initialData;

  try {
    console.log(`Fetching initial jobs from SerpApi: ${INITIAL_API_ENDPOINT.replace(apiKey, 'SERPAPI_API_KEY_HIDDEN')}`);
    const initialResponse = await fetch(INITIAL_API_ENDPOINT);

    if (!initialResponse.ok) {
      const errorBody = await initialResponse.text();
      console.error(`SerpApi HTTP Error (google_jobs): ${initialResponse.status} ${initialResponse.statusText}`, errorBody);
      return generateDynamicMockResults(input, `SerpApi HTTP Error (google_jobs): ${initialResponse.status}. ${errorBody}.`);
    }
    initialData = await initialResponse.json();

    if (initialData.error) {
        console.error('SerpApi returned an error in initial search (google_jobs):', initialData.error);
        console.error(`Context - Query: "${input.query}", Location: "${input.location || 'N/A'}"`);
        return generateDynamicMockResults(input, `SerpApi API Error (google_jobs): ${initialData.error}`);
    }
    
    if (!initialData.jobs_results || initialData.jobs_results.length === 0) {
      console.log('No job results from SerpApi (google_jobs) for query:', input.query, 'Location:', input.location || 'N/A');
      return [];
    }

  } catch (error) {
    console.error('Failed to fetch initial jobs from SerpApi (Network/other error):', error);
    return generateDynamicMockResults(input, `Failed to connect to SerpApi (google_jobs). ${error instanceof Error ? error.message : String(error)}`);
  }

  // Step 2: For each job_id, fetch detailed listing for apply_options
  const processedJobsPromises = initialData.jobs_results.map(async (initialJob: any): Promise<JobSearchResult | null> => {
    let determinedUrl: string | undefined = undefined;
    const jobId = initialJob.job_id;

    if (jobId) {
      const listingParams = new URLSearchParams({
        engine: 'google_jobs_listing',
        q: jobId,
        api_key: apiKey,
      });
      const LISTING_API_ENDPOINT = `https://serpapi.com/search.json?${listingParams.toString()}`;

      try {
        // console.log(`Fetching listing details for job_id: ${jobId}`);
        const listingResponse = await fetch(LISTING_API_ENDPOINT);
        if (!listingResponse.ok) {
          console.warn(`SerpApi HTTP Error for listing ${jobId} (google_jobs_listing): ${listingResponse.status} ${listingResponse.statusText}. Falling back on URL from initial search if available.`);
          determinedUrl = initialJob.link; // Fallback
        } else {
          const listingData = await listingResponse.json();
          if (listingData.error) {
            console.warn(`SerpApi Error in listing response for ${jobId} (google_jobs_listing): ${listingData.error}. Falling back.`);
            determinedUrl = initialJob.link; // Fallback
          } else if (listingData.apply_options && listingData.apply_options.length > 0) {
            const companyApplyOption = listingData.apply_options.find((opt: any) => 
              opt.title?.toLowerCase().includes('company website') || 
              opt.title?.toLowerCase().includes('apply direct')
            );
            determinedUrl = companyApplyOption?.link || listingData.apply_options[0].link;
          } else {
            // No apply_options, try original link from initial search
            determinedUrl = initialJob.link;
          }
        }
      } catch (listingError) {
        console.warn(`Failed to fetch listing details for job_id ${jobId} (google_jobs_listing):`, listingError instanceof Error ? listingError.message : String(listingError), `. Falling back.`);
        determinedUrl = initialJob.link; // Fallback
      }
    } else {
        // No job_id from initial search, try to use initialJob.link
        determinedUrl = initialJob.link;
    }
    
    // Validate determinedUrl and provide a Google Jobs detail page as a final fallback if needed and job_id exists
    if (determinedUrl) {
        try {
            new URL(determinedUrl);
        } catch (e) {
            // console.warn(`Invalid URL from primary sources for job "${initialJob.title}": ${determinedUrl}. Trying Google Jobs detail link.`);
            if (initialJob.job_id) {
              determinedUrl = `https://www.google.com/search?q=${encodeURIComponent(initialJob.title || input.query)}+${encodeURIComponent(initialJob.company_name || '')}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htidocid=${initialJob.job_id}`;
              try { new URL(determinedUrl); } catch (e2) { determinedUrl = undefined; } // Final check
            } else {
              determinedUrl = undefined;
            }
        }
    } else if (initialJob.job_id) { // If no URL found yet, but we have a job_id, create Google Jobs link
        determinedUrl = `https://www.google.com/search?q=${encodeURIComponent(initialJob.title || input.query)}+${encodeURIComponent(initialJob.company_name || '')}&ibp=htl;jobs#fpstate=tldetail&htivrt=jobs&htidocid=${initialJob.job_id}`;
        try { new URL(determinedUrl); } catch (e2) { determinedUrl = undefined; } // Final check
    } else {
        determinedUrl = undefined;
    }

    const description = initialJob.description || `Details for ${initialJob.title || 'this role'} at ${initialJob.company_name || 'this company'}.`;

    return {
      id: initialJob.job_id || uuidv4(), // Use SerpApi job_id if available
      title: initialJob.title || 'N/A',
      company: initialJob.company_name || 'N/A',
      location: initialJob.location || undefined,
      url: determinedUrl,
      description: description,
      postedDate: typeof initialJob.detected_extensions?.posted_at === 'string' ? initialJob.detected_extensions.posted_at : undefined,
      employmentType: typeof initialJob.detected_extensions?.schedule_type === 'string' ? initialJob.detected_extensions.schedule_type : undefined,
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
    const cappedInput = { ...input, numResults: Math.min(input.numResults ?? 10, 15) }; // numResults now indicates how many detailed listings will be attempted.
    return fetchJobsFromSerpApi(cappedInput);
  }
);
