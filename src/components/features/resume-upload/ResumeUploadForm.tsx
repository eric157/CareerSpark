
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2, ListChecks, Briefcase, GraduationCap } from 'lucide-react';
import { parseResume, type ParseResumeOutput } from '@/ai/flows/resume-parsing';
// useRouter is not needed if we're not redirecting
import { useToast } from '@/hooks/use-toast';

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];


export default function ResumeUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParseResumeOutput | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // const router = useRouter(); // Not redirecting anymore
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size exceeds ${MAX_FILE_SIZE_MB}MB.`);
        setFile(null);
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
        setError('Invalid file type. Please upload a PDF or DOCX file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
      setParsedData(null);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData(null);
    setUploadProgress(30); 

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const resumeDataUri = reader.result as string;
        setUploadProgress(60);
        try {
          const result = await parseResume({ resumeDataUri });
          setUploadProgress(100);
          setParsedData(result);
          localStorage.setItem('parsedResumeData', JSON.stringify(result)); 
          
          // Dispatch a custom event to notify ChatInterface
          window.dispatchEvent(new CustomEvent('resumeUpdated'));

          toast({
            title: "Resume Parsed Successfully!",
            description: "Your profile has been updated. You can now chat with the AI.",
            variant: "default",
            duration: 5000,
          });
          setFile(null); // Clear the file input
          // document.getElementById('resumeFile') as HTMLInputElement).value = ''; // More direct way to clear
        } catch (aiError) {
          console.error('AI parsing error:', aiError);
          setError('Failed to parse resume. Please try again or use a different file.');
          toast({
            title: "Parsing Error",
            description: "There was an issue parsing your resume. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file.');
        setIsLoading(false);
        setUploadProgress(0);
      };
    } catch (e) {
      console.error('Upload error:', e);
      setError('An unexpected error occurred during upload.');
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="resumeFile" className="text-sm font-medium">Resume File</Label>
          <Input
            id="resumeFile"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx"
            className="mt-1 text-sm file:text-primary file:font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Supported formats: PDF, DOCX. Max size: {MAX_FILE_SIZE_MB}MB.
          </p>
        </div>
        {isLoading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full h-2" />
            <p className="text-sm text-primary flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing your resume... This may take a moment.
            </p>
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mt-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isLoading || !file} className="w-full sm:w-auto text-sm py-2 px-4">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            'Analyze Resume'
          )}
        </Button>
      </form>

      {parsedData && !isLoading && (
        <Card className="mt-6 border-primary/50 shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-md flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Resume Analysis Complete!
            </CardTitle>
            <CardDescription className="text-xs">
              This extracted information is now being used for personalized job matching in the chat.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pt-2">
            <div>
              <h3 className="text-xs font-semibold mb-1 flex items-center gap-1"><ListChecks className="text-accent h-4 w-4"/>Skills Extracted:</h3>
              {parsedData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {parsedData.skills.slice(0, 5).map((skill, index) => ( // Show a few skills
                    <span key={index} className="bg-secondary/50 text-secondary-foreground/80 text-xs px-2 py-0.5 rounded-full">
                      {skill}
                    </span>
                  ))}
                  {parsedData.skills.length > 5 && <span className="text-xs text-muted-foreground">...and more.</span>}
                </div>
              ) : <p className="text-xs text-muted-foreground">No skills prominently extracted.</p>}
            </div>
            {/* Can add similar brief sections for experience and education if desired */}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

