
'use client';

import type { RecommendedJob } from '@/types'; 
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin, CalendarDays, ExternalLink, Sparkles, Briefcase } from 'lucide-react';

interface JobCardProps {
  job: RecommendedJob; 
  onViewExplanation: (job: RecommendedJob) => void; 
}

export default function JobCard({ job, onViewExplanation }: JobCardProps) {
  const companyInitials = job.company?.substring(0, 2).toUpperCase() || '??';
  const placeholderImageUrl = `https://placehold.co/64x64.png?text=${encodeURIComponent(companyInitials)}`;
  const dataAiHintForPlaceholder = job.company?.split(' ')[0]?.toLowerCase() || "company";

  return (
    <Card className="hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4 md:p-6 bg-secondary/30">
         <Image
            src={placeholderImageUrl} 
            alt={`${job.company} logo`}
            width={64}
            height={64}
            className="rounded-lg border object-contain bg-muted"
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
         {job.relevanceScore && (
            <div className="text-right">
                <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-sm">
                    {job.relevanceScore}% Match
                </Badge>
            </div>
         )}
      </CardHeader>
      <CardContent className="p-4 md:p-6 space-y-3">
        <p className="text-sm text-foreground font-medium">AI Match Summary:</p>
        <p className="text-sm text-foreground line-clamp-3 bg-primary/5 p-2 rounded-md">{job.summary}</p>
        
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View full description snippet</summary>
          <p className="mt-1 text-foreground/80 line-clamp-5 bg-muted/30 p-2 rounded-md">{job.description}</p>
        </details>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {job.postedDate && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Posted: {job.postedDate}</span>
            </div>
          )}
        </div>
        
      </CardContent>
      <CardFooter className="p-4 md:p-6 bg-muted/20 flex flex-col sm:flex-row justify-between items-center gap-2">
        <Button variant="outline" onClick={() => onViewExplanation(job)} className="w-full sm:w-auto">
          <Sparkles className="mr-2 h-4 w-4 text-primary" />
          Why this match?
        </Button>
        {job.url ? (
          <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button className="w-full">
              View & Apply <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </a>
        ) : (
          <Button className="w-full sm:w-auto" disabled>
            No direct link
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
