import JobList from '@/components/features/jobs/JobList';
import { mockJobs } from '@/data/jobs';
import { Briefcase, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// This page could be a server component if data fetching is done here.
// For now, it uses mock data and passes it to a client component for interactivity.

export default function JobsPage() {
  // In a real app, jobs would be fetched based on user profile, preferences, search, etc.
  // This could involve calling the jobRecommendation AI flow.
  const jobs = mockJobs;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          Job Listings
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore job opportunities tailored to your profile and preferences.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        <aside className="md:col-span-1 space-y-6 p-4 border rounded-lg shadow-sm bg-card">
          <h3 className="text-lg font-semibold">Filter Jobs</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="keywords" className="text-sm font-medium">Keywords</label>
              <Input id="keywords" placeholder="e.g., React, Product Manager" className="mt-1" />
            </div>
            <div>
              <label htmlFor="location" className="text-sm font-medium">Location</label>
              <Input id="location" placeholder="e.g., San Francisco, Remote" className="mt-1" />
            </div>
            <div>
              <label htmlFor="jobType" className="text-sm font-medium">Job Type</label>
              <Select>
                <SelectTrigger id="jobType" className="mt-1">
                  <SelectValue placeholder="All Job Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">
              <Search className="mr-2 h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </aside>

        <main className="md:col-span-3">
          <JobList jobs={jobs} />
        </main>
      </div>
    </div>
  );
}
