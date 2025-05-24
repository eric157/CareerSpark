
'use client';

import { useState, useEffect, FormEvent } from 'react';
import JobList from '@/components/features/jobs/JobList';
import { Briefcase, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobRecommendation } from '@/ai/flows/job-recommendation';
import type { RecommendedJob } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function JobsPage() {
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState(''); // Initialized to empty string

  const [parsedResumeText, setParsedResumeText] = useState<string>("");

  useEffect(() => {
    // Load parsed resume data from localStorage if available
    const storedResumeData = localStorage.getItem('parsedResumeData');
    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        const text = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
        setParsedResumeText(text);
      } catch (e) {
        console.error("Failed to parse resume data from localStorage", e);
      }
    } else {
       // Default resume text if none in local storage
       setParsedResumeText("Seeking entry-level roles in software development. Proficient in JavaScript and Python.");
    }
  }, []);


  const fetchJobs = async (currentKeywords: string, currentLocation: string, currentJobType: string) => {
    setIsLoading(true);
    setError(null);

    if (!parsedResumeText) {
      // Wait for resume text to be loaded or set to default
      setTimeout(() => fetchJobs(currentKeywords, currentLocation, currentJobType), 100);
      return;
    }

    let userPreferences = `Find jobs related to: ${currentKeywords || 'software developer'}`;
    if (currentLocation) {
      userPreferences += ` in ${currentLocation}`;
    }
    if (currentJobType && currentJobType !== 'all') { // Handle 'all' value for job type
      userPreferences += ` (Type: ${currentJobType})`;
    }

    try {
      const result = await jobRecommendation({
        resumeText: parsedResumeText,
        userPreferences: userPreferences,
        // No jobListings provided, forcing web search
      });
      setJobs(result.recommendedJobs);
    } catch (e) {
      console.error("Failed to fetch job recommendations:", e);
      setError("Could not load job recommendations. Please try again later.");
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Fetch initial jobs when resume text is available/set
    if(parsedResumeText){
        fetchJobs(keywords, location, jobType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedResumeText]); // Only re-run when parsedResumeText changes initially

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchJobs(keywords, location, jobType);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          Dynamic Job Listings
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore AI-powered job recommendations based on your profile and search.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <aside className="md:col-span-1 space-y-6 p-4 border rounded-lg shadow-sm bg-card">
          <h3 className="text-lg font-semibold">Filter Jobs</h3>
          <form onSubmit={handleFilterSubmit} className="space-y-4">
            <div>
              <label htmlFor="keywords" className="text-sm font-medium">Keywords</label>
              <Input 
                id="keywords" 
                placeholder="e.g., React, Product Manager" 
                className="mt-1" 
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="location" className="text-sm font-medium">Location</label>
              <Input 
                id="location" 
                placeholder="e.g., San Francisco, Remote" 
                className="mt-1" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="jobType" className="text-sm font-medium">Job Type</label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger id="jobType" className="mt-1">
                  <SelectValue placeholder="All Job Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Job Types</SelectItem> {/* Changed value to "all" */}
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </form>
        </aside>

        <main className="md:col-span-3">
          {isLoading && (
             <div className="flex justify-center items-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
             </div>
          )}
          {!isLoading && error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && (
            <JobList jobs={jobs} />
          )}
        </main>
      </div>
    </div>
  );
}
