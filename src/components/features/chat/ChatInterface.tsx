
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, SendHorizonal, User, Cpu, Search } from 'lucide-react';
import type { ChatMessage, RecommendedJob } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { jobRecommendation } from '@/ai/flows/job-recommendation'; 
import { Skeleton } from '@/components/ui/skeleton';

// Mock job listings for AI flow input - these can be used if the AI decides they are relevant
// or it can use the new searchJobsTool to find others.
const MOCK_PROVIDED_JOB_LISTINGS = [
  "Software Engineer at Google, Mountain View, CA. Experience with Java, Python, C++. B.S. in Computer Science.",
  "Product Manager at Microsoft, Redmond, WA. 5+ years experience in product management. MBA preferred.",
  "UX Designer at Apple, Cupertino, CA. Portfolio required. Strong understanding of user-centered design principles.",
  "Data Scientist at Amazon, Seattle, WA. PhD or M.S. in a quantitative field. Experience with machine learning.",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string>("Experienced software engineer with skills in React, Node.js, and Python. Interested in remote work. Focus on web development roles.");

  useEffect(() => {
    // Load parsed resume data from localStorage if available
    const storedResumeData = localStorage.getItem('parsedResumeData');
    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        const text = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
        setParsedResumeText(text);
      } catch (e) {
        console.error("Failed to parse resume data from localStorage", e);
      }
    }
  }, []);


  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollViewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (scrollViewport) {
        scrollViewport.scrollTop = scrollViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Use jobRecommendation flow for job-related queries
      // The flow will decide whether to use provided listings or search via the tool
      const aiResponse = await jobRecommendation({
        resumeText: parsedResumeText, 
        userPreferences: userMessage.text, // Use user's query as preference
        jobListings: MOCK_PROVIDED_JOB_LISTINGS, // Provide some initial listings
      });
      
      let responseText = aiResponse.recommendedJobs.length > 0 
        ? "Here are some job recommendations based on your query:" 
        : "I couldn't find specific jobs for that query right now. Try rephrasing or broadening your search.";

      if (aiResponse.searchQueryUsed) {
        responseText += ` (I searched for: "${aiResponse.searchQueryUsed}")`;
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        relatedJobs: aiResponse.recommendedJobs,
        searchQueryUsed: aiResponse.searchQueryUsed,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Sorry, I encountered an error trying to process your request. Please ensure your resume is uploaded or try again.",
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-xl flex flex-col h-[calc(100vh-12rem)] max-h-[700px]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Cpu className="text-primary" /> AI Career Assistant
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-end gap-2 ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-xl px-4 py-3 shadow-md ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card text-card-foreground border border-border rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-line">{message.text}</p>
                {message.searchQueryUsed && (
                  <p className="text-xs opacity-70 mt-1 italic flex items-center gap-1">
                    <Search size={12}/> Searched for: "{message.searchQueryUsed}"
                  </p>
                )}
                {message.relatedJobs && message.relatedJobs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedJobs.map((job, index) => (
                       <Card key={index} className="bg-background/70 p-3">
                        <h4 className="font-semibold text-sm">{job.title}</h4>
                        <p className="text-xs text-muted-foreground">{job.company} - {job.location}</p>
                        <p className="text-xs mt-1 line-clamp-2">{job.summary}</p>
                        <div className="flex justify-between items-center mt-1">
                          <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-xs">Relevance: {job.relevanceScore}%</Badge>
                          {job.source && <Badge variant="outline" className="text-xs capitalize">{job.source === "webSearch" ? "Web Search" : "Provided"}</Badge>}
                        </div>
                        {job.url ? (
                           <a href={job.url} target="_blank" rel="noopener noreferrer">
                             <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary">View Original Post</Button>
                           </a>
                        ) : (
                          <Link href={`/jobs?title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}`} passHref>
                           <Button variant="link" size="sm" className="p-0 h-auto mt-1 text-primary">View Details</Button>
                          </Link>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
                <p className="mt-1 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.sender === 'user' && (
                 <Avatar className="h-8 w-8">
                  <AvatarFallback><User size={18}/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-md bg-card text-card-foreground border border-border rounded-bl-none">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[50px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
          <Button variant="ghost" size="icon" type="button" className="shrink-0" title="Attach resume (feature coming soon)" disabled>
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            placeholder="e.g., 'Find remote React jobs' or 'Entry level marketing roles'"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} className="shrink-0">
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
