
'use client';

import { useState, useEffect, FormEvent } from 'react';
import JobList from '@/components/features/jobs/JobList';
import { Briefcase, Search, Loader2, Info, AlertTriangle } from 'lucide-react';
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
import Link from 'next/link';

export default function JobsPage() {
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [jobType, setJobType] = useState('all'); // Default to 'all'

  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [resumeFetchError, setResumeFetchError] = useState<string | null>(null);
  const [initialSearchMessage, setInitialSearchMessage] = useState<string | null>(null);


  useEffect(() => {
    const storedResumeData = localStorage.getItem('parsedResumeData');
    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        const text = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
        setParsedResumeText(text);
        setResumeFetchError(null);
      } catch (e) {
        console.error("Failed to parse resume data from localStorage for Jobs page", e);
        setParsedResumeText(""); // Indicate error or missing
        setResumeFetchError("Could not load your resume profile. Job search will be generic. Please re-upload for personalized results.");
      }
    } else {
       setParsedResumeText(""); // Indicate no resume uploaded
    }
  }, []);


  const fetchJobs = async (currentKeywords: string, currentLocation: string, currentJobType: string) => {
    setIsLoading(true);
    setError(null);
    setInitialSearchMessage(null);

    if (parsedResumeText === null) { // Still loading resume from localStorage
      setTimeout(() => fetchJobs(currentKeywords, currentLocation, currentJobType), 200);
      return;
    }
    
    let userPreferences = `Find jobs related to: ${currentKeywords || 'general opportunities'}`;
    if (currentLocation) {
      userPreferences += ` in ${currentLocation}`;
    }
    if (currentJobType && currentJobType !== 'all') { 
      userPreferences += ` (Type: ${currentJobType})`;
    }
    
    const effectiveResumeText = parsedResumeText || "User has not uploaded a resume. Provide general job recommendations based on preferences.";

    try {
      const result = await jobRecommendation({
        resumeText: effectiveResumeText,
        userPreferences: userPreferences,
      });
      setJobs(result.recommendedJobs);
      if (result.recommendedJobs.length === 0 && result.noResultsFeedback) {
        setInitialSearchMessage(result.noResultsFeedback);
      } else if (result.recommendedJobs.length === 0) {
        setInitialSearchMessage("No jobs found for your current filters. Try broadening your search!");
      }
    } catch (e) {
      console.error("Failed to fetch job recommendations:", e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
      setError(`Could not load job recommendations: ${errorMessage}. Please try again later.`);
      setJobs([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch when component mounts or resume text becomes available
  useEffect(() => {
    if(parsedResumeText !== null){ // Ensures localStorage has been checked
        fetchJobs(keywords, location, jobType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedResumeText]); 

  const handleFilterSubmit = (e: FormEvent) => {
    e.preventDefault();
    fetchJobs(keywords, location, jobType);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          Browse Job Listings
        </h1>
        <p className="text-lg text-muted-foreground">
          Filter and explore AI-powered job recommendations. 
          {parsedResumeText ? " Results are tailored to your uploaded resume." : " Upload your resume for personalized matches!"}
        </p>
         {resumeFetchError && (
            <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Resume Error</AlertTitle>
                <AlertDescription>{resumeFetchError} <Link href="/upload-resume" className="font-bold hover:underline">Upload Resume</Link></AlertDescription>
            </Alert>
        )}
        {!parsedResumeText && parsedResumeText !== null && !resumeFetchError && (
             <Alert className="mt-2">
                <Info className="h-4 w-4" />
                <AlertTitle>Tip</AlertTitle>
                <AlertDescription><Link href="/upload-resume" className="font-bold hover:underline">Upload your resume</Link> to get job recommendations more relevant to your skills and experience.</AlertDescription>
            </Alert>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <aside className="md:col-span-1 space-y-6 p-4 border rounded-lg shadow-sm bg-card">
          <h3 className="text-lg font-semibold">Filter Jobs</h3>
          <form onSubmit={handleFilterSubmit} className="space-y-4">
            <div>
              <label htmlFor="keywords" className="text-sm font-medium">Keywords</label>
              <Input 
                id="keywords" 
                placeholder="e.g., React, Marketing" 
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
                  <SelectItem value="all">All Job Types</SelectItem>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || parsedResumeText === null}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
              Apply Filters
            </Button>
          </form>
        </aside>

        <main className="md:col-span-3">
          {isLoading && (
             <div className="flex flex-col justify-center items-center py-10 space-y-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Searching for jobs...</p>
             </div>
          )}
          {!isLoading && error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error Fetching Jobs</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && (
            <JobList jobs={jobs} initialEmptyMessage={initialSearchMessage} />
          )}
        </main>
      </div>
    </div>
  );
}

