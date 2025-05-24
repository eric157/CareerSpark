
import ChatInterface from '@/components/features/chat/ChatInterface';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Career Spark!</CardTitle>
          <CardDescription className="text-lg">
            Your AI-powered co-pilot for navigating the job market.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-2">
            Start by <Link href="/upload-resume" className="text-primary hover:underline font-semibold">uploading your resume</Link>. 
            Then, use the chat below to tell me about your career goals, ask for job recommendations, or get insights into job descriptions.
          </p>
          <p className="text-sm text-muted-foreground">
            Our AI will use your resume and your queries to find the latest job openings for you.
          </p>
        </CardContent>
      </Card>
      
      <ChatInterface />
    </div>
  );
}
