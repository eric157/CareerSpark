'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import type { JobListing } from '@/types';
import { generatePersonalizedExplanation, type PersonalizedExplanationOutput } from '@/ai/flows/personalized-explanation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PersonalizedExplanationDialogProps {
  job: JobListing;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PersonalizedExplanationDialog({ job, isOpen, onOpenChange }: PersonalizedExplanationDialogProps) {
  const [explanationData, setExplanationData] = useState<PersonalizedExplanationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && job) {
      const fetchExplanation = async () => {
        setIsLoading(true);
        setError(null);
        setExplanationData(null);

        try {
          // Assume resume data and preferences are available (e.g., from localStorage or a store)
          const storedResumeData = localStorage.getItem('parsedResumeData');
          const resumeData = storedResumeData 
            ? JSON.parse(storedResumeData) 
            : { skills: [], experience: [], education: [] };
          
          // Combine parsed resume data into a string format expected by the AI flow
          const resumeString = `Skills: ${resumeData.skills.join(', ') || 'Not specified'}. Experience: ${resumeData.experience.join('; ') || 'Not specified'}. Education: ${resumeData.education.join('; ') || 'Not specified'}.`;
          
          // User preferences could be collected from a form or profile settings
          const userPreferences = "Interested in senior frontend roles, remote work, and innovative tech companies.";

          const result = await generatePersonalizedExplanation({
            resumeData: resumeString,
            jobDescription: job.description,
            userPreferences: userPreferences,
          });
          setExplanationData(result);
        } catch (e) {
          console.error('Error fetching explanation:', e);
          setError('Failed to generate explanation. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };
      fetchExplanation();
    }
  }, [isOpen, job]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Personalized Match Explanation
          </DialogTitle>
          <DialogDescription>
            AI-powered insights on why "{job.title}" at {job.company} could be a great fit for you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4 max-h-[60vh] overflow-y-auto px-1">
          {isLoading && (
            <div className="flex flex-col items-center justify-center space-y-3 h-40">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your personalized explanation...</p>
            </div>
          )}
          {error && (
            <div className="flex flex-col items-center justify-center space-y-3 h-40 text-destructive">
              <AlertTriangle className="h-10 w-10" />
              <p className="font-semibold">Error</p>
              <p>{error}</p>
            </div>
          )}
          {explanationData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Relevancy Score</p>
                <div className="w-full max-w-xs text-center">
                   <Progress value={explanationData.relevancyScore} className="h-3 mb-1" />
                   <Badge variant={explanationData.relevancyScore > 70 ? "default" : explanationData.relevancyScore > 40 ? "secondary" : "destructive"} className="text-lg font-bold">
                    {explanationData.relevancyScore}%
                  </Badge>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-lg mb-2 text-foreground">Why this job is a good match:</h4>
                <div className="prose prose-sm max-w-none p-4 bg-secondary/30 rounded-md text-foreground">
                  {/* Using dangerouslySetInnerHTML for potentially markdown formatted output, ensure sanitization if from untrusted source */}
                  {/* For simplicity, treating as plain text now */}
                  <p style={{ whiteSpace: 'pre-line' }}>{explanationData.explanation}</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 border-t">
                 <h4 className="font-semibold text-md mb-2 text-foreground">Job Details Considered:</h4>
                 <p className="text-sm text-muted-foreground line-clamp-4">{job.description}</p>
              </div>

            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
