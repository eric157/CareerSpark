
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, SendHorizonal, User, Cpu, Search, AlertTriangle, Info } from 'lucide-react';
import type { ChatMessage, RecommendedJob } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { jobRecommendation } from '@/ai/flows/job-recommendation'; 
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Alert, AlertDescription } from '@/components/ui/alert'; // Added Alert


export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    const storedResumeData = localStorage.getItem('parsedResumeData');
    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        const text = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
        setParsedResumeText(text);
        setResumeError(null);
      } catch (e) {
        console.error("Failed to parse resume data from localStorage", e);
        setParsedResumeText(""); // Set to empty string to indicate an issue
        setResumeError("Could not load your resume data. Please try re-uploading.");
      }
    } else {
      setParsedResumeText(""); // Set to empty string if no resume is uploaded
      // No error message initially, will prompt in chat
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

    if (parsedResumeText === null) { // Still loading resume
        const loadingResumeMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: "Checking for your resume...",
            timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, loadingResumeMsg]);
        setIsLoading(false);
        return;
    }

    if (!parsedResumeText) {
        const noResumeMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: "I couldn't find your resume details. Please upload your resume first for personalized job recommendations. You can do that [here](/upload-resume).",
            timestamp: new Date(),
        };
        setMessages((prevMessages) => [...prevMessages, noResumeMsg]);
        setIsLoading(false);
        return;
    }


    try {
      const aiResponse = await jobRecommendation({
        resumeText: parsedResumeText, 
        userPreferences: userMessage.text,
      });
      
      let responseText = aiResponse.recommendedJobs.length > 0 
        ? "Here are some job recommendations based on your query and resume:" 
        : (aiResponse.noResultsFeedback || "I couldn't find specific jobs for that query right now. Try rephrasing or broadening your search.");

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        relatedJobs: aiResponse.recommendedJobs,
        searchQueryUsed: aiResponse.searchQueryUsed,
        noResultsFeedback: aiResponse.noResultsFeedback,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred.";
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Sorry, I encountered an error: ${errorMessageText}. Please try again.`,
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
          {resumeError && (
             <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{resumeError} <Link href="/upload-resume" className="font-bold hover:underline">Upload again?</Link></AlertDescription>
            </Alert>
          )}
          {parsedResumeText === "" && !resumeError && messages.length === 0 && ( // Only show if no other messages and not yet loading
            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Welcome! <Link href="/upload-resume" className="font-bold hover:underline">Upload your resume</Link> to get started with personalized job recommendations.
                Or, ask a general question about job searching.
              </AlertDescription>
            </Alert>
          )}
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
                {/* Display noResultsFeedback if it exists and there are no jobs */}
                {message.noResultsFeedback && (!message.relatedJobs || message.relatedJobs.length === 0) && (
                  <p className="text-xs text-muted-foreground mt-1">{message.noResultsFeedback}</p>
                )}
                {message.relatedJobs && message.relatedJobs.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.relatedJobs.map((job, index) => {
                       const companyInitials = job.company?.substring(0, 2).toUpperCase() || '??';
                       const placeholderImageUrl = `https://placehold.co/40x40.png?text=${encodeURIComponent(companyInitials)}`;
                       const dataAiHintForPlaceholder = job.company?.split(' ')[0]?.toLowerCase() || "company";
                       
                       return (
                       <Card key={job.id || index} className="bg-background/70 p-3">
                        <div className="flex items-start gap-2">
                          <Image 
                            src={placeholderImageUrl} 
                            alt={job.company || 'company'} 
                            width={40} height={40} 
                            className="rounded-md border object-contain bg-muted"
                            data-ai-hint={dataAiHintForPlaceholder}
                          />
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{job.title}</h4>
                            <p className="text-xs text-muted-foreground">{job.company} - {job.location}</p>
                          </div>
                        </div>
                        <p className="text-xs mt-1 line-clamp-2">{job.summary}</p>
                        <div className="flex justify-between items-center mt-1">
                          <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-xs">Relevance: {job.relevanceScore}%</Badge>
                           {job.postedDate && <Badge variant="outline" className="text-xs">{job.postedDate}</Badge>}
                        </div>
                        {job.url ? (
                           <a href={job.url} target="_blank" rel="noopener noreferrer" className="block mt-1">
                             <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs">View Original Post</Button>
                           </a>
                        ) : (
                           <Link href={`/jobs?title=${encodeURIComponent(job.title)}&company=${encodeURIComponent(job.company)}&location=${encodeURIComponent(job.location || '')}`} passHref className="block mt-1">
                             <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs">Search on Jobs Page</Button>
                           </Link>
                        )}
                      </Card>
                       );
                    })}
                  </div>
                )}
                <p className="mt-1 text-xs opacity-70">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <Button variant="ghost" size="icon" type="button" className="shrink-0" title="Attach file (feature coming soon)" disabled>
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            placeholder={parsedResumeText === "" && !resumeError ? "Upload resume for job search or ask a general question..." : "e.g., 'Find remote React jobs' or 'Entry level marketing roles'"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1"
            disabled={isLoading || parsedResumeText === null}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim() || parsedResumeText === null} className="shrink-0">
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

