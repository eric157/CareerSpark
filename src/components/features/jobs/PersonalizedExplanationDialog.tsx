
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
import { Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import type { RecommendedJob } from '@/types';
import { generatePersonalizedExplanation, type PersonalizedExplanationOutput } from '@/ai/flows/personalized-explanation';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface PersonalizedExplanationDialogProps {
  job: RecommendedJob; 
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PersonalizedExplanationDialog({ job, isOpen, onOpenChange }: PersonalizedExplanationDialogProps) {
  const [explanationData, setExplanationData] = useState<PersonalizedExplanationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);

  useEffect(() => {
    // Load resume data once when component might become active or props change
    const storedResumeData = localStorage.getItem('parsedResumeData');
    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        const text = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
        setParsedResumeText(text);
      } catch (e) {
        console.error("Failed to parse resume data for explanation dialog", e);
        setParsedResumeText("Could not load resume data."); // Fallback
      }
    } else {
      setParsedResumeText("No resume data found in profile."); // Fallback
    }
  }, []); // Empty dependency to run once or add dependencies if it needs to re-fetch

  useEffect(() => {
    if (isOpen && job && parsedResumeText !== null) { // Ensure resume text is loaded
      const fetchExplanation = async () => {
        setIsLoading(true);
        setError(null);
        setExplanationData(null);

        try {
          // User preferences can be generic or fetched if available from another source
          const userPreferences = "User is actively looking for relevant roles."; 
          
          const result = await generatePersonalizedExplanation({
            resumeData: parsedResumeText, // Use the state variable
            jobDescription: job.description || job.summary, // Use description, fallback to summary
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
  }, [isOpen, job, parsedResumeText]); // Depend on parsedResumeText

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg md:max-w-xl lg:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Personalized Match Explanation
          </DialogTitle>
          <DialogDescription>
            AI-powered insights on why "{job.title}" at {job.company} could be a great fit for you, based on your resume.
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
          {parsedResumeText === "No resume data found in profile." && !isLoading && !error && (
             <div className="text-center text-muted-foreground p-4">
                Please <a href="/upload-resume" className="text-primary hover:underline">upload your resume</a> to get a personalized explanation.
            </div>
          )}
          {explanationData && (
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <p className="text-sm font-medium text-muted-foreground">AI Relevancy Score</p>
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
                  <p style={{ whiteSpace: 'pre-line' }}>{explanationData.explanation}</p>
                </div>
              </div>
              
              <div className="mt-4 p-4 border-t">
                 <h4 className="font-semibold text-md mb-2 text-foreground">Job Details Considered:</h4>
                 <p className="text-sm text-muted-foreground line-clamp-4">{job.description || job.summary}</p>
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
