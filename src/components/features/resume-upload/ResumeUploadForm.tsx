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
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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
    setUploadProgress(30); // Initial progress

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
          localStorage.setItem('parsedResumeData', JSON.stringify(result)); // Persist data
          toast({
            title: "Resume Parsed Successfully!",
            description: "Your profile has been updated with the extracted information.",
            variant: "default",
            duration: 5000,
          });
          // Optionally redirect to profile page after a delay
          // setTimeout(() => router.push('/profile'), 2000);
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
          <Label htmlFor="resumeFile" className="text-base font-medium">Resume File</Label>
          <Input
            id="resumeFile"
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.docx"
            className="mt-1 text-base file:text-primary file:font-semibold file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-primary/10 hover:file:bg-primary/20"
            disabled={isLoading}
          />
          <p className="mt-1 text-sm text-muted-foreground">
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
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Upload Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" disabled={isLoading || !file} className="w-full sm:w-auto text-base py-3 px-6">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing...
            </>
          ) : (
            'Analyze Resume'
          )}
        </Button>
      </form>

      {parsedData && (
        <Card className="mt-8 border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <CheckCircle className="h-7 w-7 text-green-500" />
              Resume Analysis Complete!
            </CardTitle>
            <CardDescription>
              Here's what we extracted from your resume. This information will be used for job matching.
              You can view this on your <a href="/profile" className="text-primary hover:underline">profile page</a>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="text-accent"/>Skills</h3>
              {parsedData.skills.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 bg-secondary/30 p-4 rounded-md">
                  {parsedData.skills.map((skill, index) => (
                    <li key={index} className="text-sm">{skill}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No skills extracted.</p>}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Briefcase className="text-accent"/>Experience</h3>
              {parsedData.experience.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 bg-secondary/30 p-4 rounded-md">
                  {parsedData.experience.map((exp, index) => (
                    <li key={index} className="text-sm">{exp}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No experience extracted.</p>}
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><GraduationCap className="text-accent"/>Education</h3>
              {parsedData.education.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 bg-secondary/30 p-4 rounded-md">
                  {parsedData.education.map((edu, index) => (
                    <li key={index} className="text-sm">{edu}</li>
                  ))}
                </ul>
              ) : <p className="text-sm text-muted-foreground">No education extracted.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
