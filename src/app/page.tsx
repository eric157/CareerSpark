
import ChatInterface from '@/components/features/chat/ChatInterface';
import ResumeUploadForm from '@/components/features/resume-upload/ResumeUploadForm';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { UploadCloud } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-primary mb-3 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          Career Spark
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
          Ignite your job search with AI-powered resume analysis and personalized recommendations.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-2 space-y-8">
          <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 animate-fadeInUp border-primary/20" style={{ animationDelay: '0.3s' }}>
            <CardHeader>
              <CardTitle className="text-2xl font-semibold flex items-center gap-3 text-primary">
                 <UploadCloud className="h-7 w-7" />
                 Upload & Analyze Resume
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Provide your resume (PDF or DOCX). Our AI will extract key info to tailor job matches specifically for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResumeUploadForm />
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-3 animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
          <ChatInterface />
        </div>
      </div>

      <footer className="mt-16 pt-8 border-t text-center text-muted-foreground text-sm animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
        <p>&copy; {new Date().getFullYear()} Career Spark. Your AI Career Co-pilot.</p>
        <p className="mt-1">Powered by Genkit and Next.js.</p>
      </footer>
    </div>
  );
}
