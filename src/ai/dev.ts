
import { config } from 'dotenv';
config();

import '@/ai/flows/personalized-explanation.ts';
import '@/ai/flows/job-recommendation.ts';
import '@/ai/flows/resume-parsing.ts';
import '@/ai/flows/contextual-job-helper-flow.ts'; // Added RAG flow
import '@/ai/flows/intent-classifier-flow.ts'; // Added Intent Classification flow

import '@/ai/tools/job-search-tool.ts';
import '@/ai/tools/relevant-info-retriever-tool.ts'; // Added RAG retriever tool
