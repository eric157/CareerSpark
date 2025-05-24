
'use client';

import type { RecommendedJob } from '@/types';
import JobCard from './JobCard';
import { useState } from 'react';
import PersonalizedExplanationDialog from './PersonalizedExplanationDialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface JobListProps {
  jobs: RecommendedJob[];
  initialEmptyMessage?: string | null; // To display feedback from AI flow if no jobs
}

export default function JobList({ jobs, initialEmptyMessage }: JobListProps) {
  const [selectedJobForExplanation, setSelectedJobForExplanation] = useState<RecommendedJob | null>(null);

  const handleViewExplanation = (job: RecommendedJob) => {
    setSelectedJobForExplanation(job);
  };

  if (!jobs || jobs.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{initialEmptyMessage ? "Search Feedback" : "No Jobs Found"}</AlertTitle>
        <AlertDescription>
          {initialEmptyMessage || "We couldn't find any jobs matching your current criteria. Try adjusting your filters or check back later."}
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
