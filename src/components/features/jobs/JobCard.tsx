
'use client';

import type { RecommendedJob } from '@/types'; // Changed from JobListing
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin, CalendarDays, DollarSign, ExternalLink, Sparkles, Briefcase } from 'lucide-react';

interface JobCardProps {
  job: RecommendedJob; // Changed from JobListing
  onViewExplanation: (job: RecommendedJob) => void; // Changed from JobListing
}

export default function JobCard({ job, onViewExplanation }: JobCardProps) {
  // Fallback image logic if job.imageUrl (not in RecommendedJob) is missing
  const companyInitials = job.company?.substring(0, 2).toUpperCase() || '??';
  const placeholderImageUrl = `https://placehold.co/64x64.png?text=${encodeURIComponent(companyInitials)}`;
  const dataAiHintForPlaceholder = job.company?.split(' ')[0]?.toLowerCase() || "company";

  return (
    <Card className="hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4 md:p-6 bg-secondary/30">
         <Image
            src={placeholderImageUrl} // Use placeholder as imageUrl is not in RecommendedJob
            alt={`${job.company} logo`}
            width={64}
            height={64}
            className="rounded-lg border object-contain bg-muted" // Added bg-muted for placeholder
            data-ai-hint={dataAiHintForPlaceholder}
          />
        <div className="flex-1">
          <CardTitle className="text-xl md:text-2xl">{job.title}</CardTitle>
          <CardDescription className="text-base text-muted-foreground">{job.company}</CardDescription>
          <div className="mt-1 flex flex-wrap gap-2 items-center text-sm">
            {job.location && <span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-muted-foreground" /> {job.location}</span>}
            {job.employmentType && <Badge variant="outline" className="flex items-center gap-1"><Briefcase className="h-3 w-3"/>{job.employmentType}</Badge>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-3">
        {/* Use job.summary as the primary short description. job.description is also available for more detail. */}
        <p className="text-sm text-foreground line-clamp-3">{job.summary}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {job.postedDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {/* Assuming postedDate is a string like "X days ago" or a date string */}
              <span>Posted: {job.postedDate}</span>
            </div>
          )}
          {/* SalaryRange is not part of RecommendedJob currently, so this part won't render often
          {job.salaryRange && (
             <div className="flex items-center gap-1.5 text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>{job.salaryRange}</span>
            </div>
          )}
          */}
        </div>
        
      </CardContent>
      <CardFooter className="p-4 md:p-6 bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2">
        <Button variant="outline" onClick={() => onViewExplanation(job)} className="w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Why is this a match?
        </Button>
        {job.url && (
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            <Button className="w-full sm:w-auto">
              Apply Now <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        )}
      </CardFooter>
    </Card>
  );
}

