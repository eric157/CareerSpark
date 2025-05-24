
import ChatInterface from '@/components/features/chat/ChatInterface';
import ResumeUploadForm from '@/components/features/resume-upload/ResumeUploadForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { UploadCloud } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Career Spark!</CardTitle>
          <CardDescription className="text-lg">
            Your AI-powered co-pilot for navigating the job market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Start by uploading your resume below. Then, use the chat to tell me about your career goals or ask for job recommendations.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
             <UploadCloud className="h-6 w-6 text-primary" />
             Upload & Analyze Your Resume
          </CardTitle>
          <CardDescription>
            Provide your resume (PDF or DOCX) so the AI can give you personalized job matches.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResumeUploadForm />
        </CardContent>
      </Card>
      
      <Separator />

      <ChatInterface />
    </div>
  );
}
