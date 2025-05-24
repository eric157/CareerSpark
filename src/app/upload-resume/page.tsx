import ResumeUploadForm from '@/components/features/resume-upload/ResumeUploadForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

export default function UploadResumePage() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <UploadCloud className="h-8 w-8 text-primary" />
          Upload Your Resume
        </h1>
        <p className="text-lg text-muted-foreground">
          Let our AI analyze your resume to extract key skills, experiences, and education.
          This will help us provide you with the most relevant job recommendations.
        </p>
      </header>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Resume Analysis</CardTitle>
          <CardDescription>
            Upload your resume in PDF or DOCX format. Our AI will process it to build your profile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUploadForm />
        </CardContent>
      </Card>
    </div>
  );
}
