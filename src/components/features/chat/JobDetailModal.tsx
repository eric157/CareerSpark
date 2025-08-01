
'use client';

import type { RecommendedJob } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, CalendarDays, Briefcase, MapPin, Building, Info } from 'lucide-react';

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
        <DialogHeader className="p-6 pb-4 border-b sticky top-0 bg-card z-10">
          <DialogTitle className="text-2xl font-bold text-primary">{job.title || 'Job Title Not Available'}</DialogTitle>
          <DialogDescription asChild>
            <div className="text-sm space-y-1 pt-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building size={16} />
                <span>{job.company || 'Company Not Available'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={16} />
                <span>{job.location || 'Location Not Available'}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 pt-4 pb-6">
            {job.summary && (
                <div>
                    <h4 className="font-semibold text-lg mb-1.5 text-foreground">Summary</h4>
                    <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-md leading-relaxed">{job.summary || 'Not Available'}</p>
                </div>
            )}
            
            <div>
              <h4 className="font-semibold text-lg mb-1.5 text-foreground">Full Description</h4>
              {job.description && job.description.trim() ? (
                <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{job.description}</p>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground italic p-3 bg-secondary/30 rounded-md">
                    <Info size={16} />
                    <span>Full description not available.</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pt-2">
              {job.postedDate && (
                <div className="flex items-start gap-2 text-sm">
                  <CalendarDays size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Posted:</span> <span className="text-muted-foreground">{job.postedDate}</span>
                  </div>
                </div>
              )}
              {job.employmentType && (
                <div className="flex items-start gap-2 text-sm">
                  <Briefcase size={16} className="text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">Type:</span> <span className="text-muted-foreground">{job.employmentType}</span>
                  </div>
                </div>
              )}
            </div>
             <div className="pt-3">
                <Badge 
                    variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} 
                    className="text-sm py-1 px-3 shadow-sm"
                >
                    Relevance: {job.relevanceScore}%
                </Badge>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              {job.url ? (
                <a href={job.url} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto">
                    <ExternalLink size={16} className="mr-2" />
                    View Original Post
                  </Button>
                </a>
              ) : (
                 <Button className="w-full sm:w-auto" disabled>
                    <ExternalLink size={16} className="mr-2" />
                    No Direct Link
                  </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
