import ChatInterface from '@/components/features/chat/ChatInterface';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold tracking-tight">Welcome to Career Spark!</CardTitle>
          <CardDescription className="text-lg">
            Your AI-powered co-pilot for navigating the job market. Let's find your next opportunity!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Use the chat below to tell me about your career goals, ask for job recommendations, or get insights into job descriptions.
            You can also upload your resume to get personalized matches.
          </p>
        </CardContent>
      </Card>
      
      <ChatInterface />
    </div>
  );
}
