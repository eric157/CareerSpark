
'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, Loader2, ListChecks } from 'lucide-react';
import { parseResume, type ParseResumeOutput } from '@/ai/flows/resume-parsing';
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
          
          window.dispatchEvent(new CustomEvent('resumeUpdated'));

          toast({
            title: "Resume Parsed Successfully!",
            description: "Your key skills have been extracted. You can now chat with the AI for personalized job recommendations.",
            variant: "default",
            duration: 6000,
          });
          
          const fileInput = document.getElementById('resumeFile') as HTMLInputElement;
          if (fileInput) {
            fileInput.value = ''; 
          }
          setFile(null); 
          
        } catch (aiError) {
          console.error('AI parsing error:', aiError);
          setError('Failed to parse resume. Please try again or use a different file.');
          setUploadProgress(0); // Reset progress on AI error
          toast({
            title: "Parsing Error",
            description: "There was an issue parsing your resume. Please check the file and try again.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file. Please ensure it is not corrupted.');
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
          <Label htmlFor="resumeFile" className="block text-sm font-medium text-foreground mb-1.5">Select Resume File</Label>
          <Input
            id="resumeFile"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx"
            className="mt-1 text-sm file:text-primary file:font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 hover:file:bg-primary/20 transition-colors duration-200 shadow-sm focus:ring-2 focus:ring-primary/50 focus:border-primary"
            disabled={isLoading}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Supported formats: PDF, DOCX. Max size: {MAX_FILE_SIZE_MB}MB.
          </p>
        </div>
        {isLoading && (
          <div className="space-y-2 pt-2">
            <Progress value={uploadProgress} className="w-full h-2.5 rounded-full [&>div]:rounded-full" />
            <p className="text-sm text-primary flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing your resume... This may take a moment.
            </p>
          </div>
        )}
        {error && (
          <Alert variant="destructive" className="mt-2 shadow-md">
            <AlertTriangle className="h-5 w-5" />
            <AlertTitle className="font-semibold">Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button 
          type="submit" 
          disabled={isLoading || !file} 
          className="w-full sm:w-auto text-sm py-2.5 px-6 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...
            </>
          ) : (
            'Analyze Resume'
          )}
        </Button>
      </form>

      {parsedData && !isLoading && (
        <Card className="mt-6 border-primary/30 shadow-lg bg-gradient-to-br from-card to-secondary/10 animate-fadeInUp">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-600 dark:text-green-500">
              <CheckCircle className="h-6 w-6" />
              Resume Analysis Complete!
            </CardTitle>
            <CardDescription className="text-xs">
              Key information extracted. Ready for personalized job matching in the chat!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm pt-2">
            <div>
              <h3 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5 text-primary">
                <ListChecks className="h-4 w-4"/> Top Skills Extracted:
              </h3>
              {parsedData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {parsedData.skills.slice(0, 7).map((skill, index) => ( 
                    <span key={index} className="bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary/90 text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                      {skill}
                    </span>
                  ))}
                  {parsedData.skills.length > 7 && <span className="text-xs text-muted-foreground italic mt-1">...and more.</span>}
                </div>
              ) : <p className="text-xs text-muted-foreground">No prominent skills extracted. Try a different resume or ensure skills are clearly listed.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
