
import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-explanation.ts';
import '@/ai/flows/job-recommendation.ts';
import '@/ai/flows/resume-parsing.ts';
import '@/ai/tools/job-search-tool.ts'; // Added import for the new tool
