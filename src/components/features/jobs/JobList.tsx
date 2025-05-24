
'use client';

import type { RecommendedJob } from '@/types'; // Changed from JobListing
import JobCard from './JobCard';
import { useState } from 'react';
import PersonalizedExplanationDialog from './PersonalizedExplanationDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface JobListProps {
  jobs: RecommendedJob[]; // Changed from JobListing
}

export default function JobList({ jobs }: JobListProps) {
  const [selectedJobForExplanation, setSelectedJobForExplanation] = useState<RecommendedJob | null>(null); // Changed from JobListing

  const handleViewExplanation = (job: RecommendedJob) => { // Changed from JobListing
    setSelectedJobForExplanation(job);
  };

  if (!jobs || jobs.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>No Jobs Found</AlertTitle>
        <AlertDescription>
          We couldn't find any jobs matching your criteria at the moment. Try adjusting your filters or check back later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onViewExplanation={handleViewExplanation} />
      ))}
      {selectedJobForExplanation && (
        <PersonalizedExplanationDialog
          job={selectedJobForExplanation}
          isOpen={!!selectedJobForExplanation}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedJobForExplanation(null);
            }
          }}
        />
      )}
    </div>
  );
}

