
'use client';

import type { RecommendedJob } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CalendarDays, Briefcase, MapPin, Building } from 'lucide-react';

interface JobDetailModalProps {
  job: RecommendedJob | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function JobDetailModal({ job, isOpen, onClose }: JobDetailModalProps) {
  if (!job) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold text-primary">{job.title}</DialogTitle>
          <DialogDescription className="text-sm space-y-1 pt-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building size={16} />
              <span>{job.company}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin size={16} />
              <span>{job.location}</span>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="space-y-4">
            {job.summary && (
                <div>
                    <h4 className="font-semibold text-md mb-1.5">Summary</h4>
                    <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md">{job.summary}</p>
                </div>
            )}
            
            <div>
              <h4 className="font-semibold text-md mb-1.5">Full Description</h4>
              <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{job.description || 'Full description not available.'}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {job.postedDate && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays size={16} className="text-primary" />
                  <div>
                    <span className="font-medium">Posted:</span> {job.postedDate}
                  </div>
                </div>
              )}
              {job.employmentType && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase size={16} className="text-primary" />
                  <div>
                    <span className="font-medium">Type:</span> {job.employmentType}
                  </div>
                </div>
              )}
            </div>
             <div className="pt-2">
                <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-sm py-1 px-3 shadow-sm">
                    Relevance: {job.relevanceScore}%
                </Badge>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t flex flex-col sm:flex-row gap-2">
          {job.url && (
            <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <ExternalLink size={16} className="mr-2" />
                View Original Post
              </Button>
            </a>
          )}
          <DialogClose asChild>
            <Button variant="outline" className="w-full sm:w-auto">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
