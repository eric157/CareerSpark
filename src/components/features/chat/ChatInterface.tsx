
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, SendHorizonal, User, Cpu, Search, AlertTriangle, ArrowDown } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { jobRecommendation } from '@/ai/flows/job-recommendation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

const RESUME_READY_TEXT = "Great! I see your resume. How can I help you with your job search today?";
const INITIAL_PROMPT_TEXT = "Hello! Upload your resume using the form so I can assist you with personalized job recommendations.";

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const loadResumeData = (isInitialPageLoad: boolean = false) => {
    const storedResumeData = localStorage.getItem('parsedResumeData');
    let resumeIsAvailable = false;

    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        if (data && (data.skills?.length || data.experience?.length || data.education?.length)) {
          const newParsedResumeText = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
          setParsedResumeText(newParsedResumeText);
          setResumeError(null);
          resumeIsAvailable = true;
        } else {
          throw new Error("Stored resume data is empty or invalid.");
        }
      } catch (e) {
        console.error("Failed to parse/validate resume from localStorage", e);
        setParsedResumeText(""); // Explicitly set to empty string to indicate no valid resume
        setResumeError("Could not load your resume data. Please re-upload if you previously had one.");
        localStorage.removeItem('parsedResumeData');
        resumeIsAvailable = false;
      }
    } else { // No stored resume data
      setParsedResumeText(""); // Explicitly set to empty string
      setResumeError(null); // Clear any previous error
      resumeIsAvailable = false;
    }

    setMessages(prevMessages => {
      // If it's an initial load and no messages yet, add the initial prompt.
      if (isInitialPageLoad && prevMessages.length === 0) {
        return [{
          id: `ai-msg-initial-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sender: 'ai', text: INITIAL_PROMPT_TEXT, timestamp: new Date()
        }];
      }
      // If it's NOT an initial load (i.e., resumeUpdated event) AND a resume is now available
      else if (!isInitialPageLoad && resumeIsAvailable) {
        const lastMessage = prevMessages[prevMessages.length - 1];
        // Add resume ready message only if it's not already the last message
        if (!lastMessage || lastMessage.text !== RESUME_READY_TEXT) {
          return [...prevMessages, {
            id: `ai-msg-resume-ready-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            sender: 'ai', text: RESUME_READY_TEXT, timestamp: new Date()
          }];
        }
      }
      return prevMessages; // No change to messages
    });
  };


  useEffect(() => {
    loadResumeData(true); // Call on initial mount

    const handleResumeUpdateEvent = () => {
      loadResumeData(false); // Call when resume is updated
    };

    window.addEventListener('resumeUpdated', handleResumeUpdateEvent);
    return () => {
      window.removeEventListener('resumeUpdated', handleResumeUpdateEvent);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      viewport.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom('auto');
    }
  }, [messages]);

  const handleScroll = () => {
    const viewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (viewport) {
      const isScrolledToBottom = viewport.scrollHeight - viewport.scrollTop <= viewport.clientHeight + 50;
      setShowScrollToBottom(!isScrolledToBottom && viewport.scrollHeight > viewport.clientHeight);
    }
  };


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputValue('');
    setIsLoading(true);

    if (parsedResumeText === null || !parsedResumeText) { // Check for null or empty string
        const noResumeMsgText = "I couldn't find your resume details. Please upload your resume using the form for personalized job recommendations.";
        setMessages(prev => {
            const lastMessage = prev[prev.length -1];
            if (lastMessage && lastMessage.text === noResumeMsgText && lastMessage.sender === 'ai') return prev; // Avoid duplicate error
            return [...prev, {
                id: `ai-err-no-resume-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                sender: 'ai',
                text: noResumeMsgText,
                timestamp: new Date(),
            }];
        });
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

      if (aiResponse.noResultsFeedback && aiResponse.recommendedJobs.length === 0) {
        responseText = aiResponse.noResultsFeedback;
      }


      const aiMessage: ChatMessage = {
        id: `ai-resp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        relatedJobs: aiResponse.recommendedJobs,
        searchQueryUsed: aiResponse.searchQueryUsed,
        noResultsFeedback: aiResponse.noResultsFeedback && aiResponse.recommendedJobs.length === 0 ? aiResponse.noResultsFeedback : undefined,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred.";
      const errorMessage: ChatMessage = {
        id: `ai-err-${Date.now() + 1}-${Math.random().toString(36).substring(7)}`,
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
    <Card className="w-full shadow-xl flex flex-col h-[calc(100vh-14rem)] sm:h-[calc(100vh-10rem)] max-h-[700px] border-2 border-primary/20 relative overflow-hidden">
      <CardHeader className="bg-primary/5 dark:bg-primary/10">
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Cpu className="text-primary h-6 w-6" /> AI Career Assistant
        </CardTitle>
      </CardHeader>
      <ScrollArea className="flex-1 p-4 bg-background" ref={scrollAreaRef} onScroll={handleScroll}>
        <div className="space-y-6 pb-4">
          {resumeError && (
             <Alert variant="destructive" className="mb-4 shadow-md">
              <AlertTriangle className="h-5 w-5" />
              <AlertDescription className="font-medium">{resumeError}</AlertDescription>
            </Alert>
          )}
          {messages.map((message, msgIdx) => (
            <div
              key={message.id}
              className={`flex items-end gap-2.5 animate-fadeInUp`}
              style={{ animationDelay: `${msgIdx * 0.05}s`}}
            >
              {message.sender === 'ai' && (
                <Avatar className="h-9 w-9 shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-xl px-4 py-3 shadow-lg ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none ml-auto'
                    : 'bg-card text-card-foreground border border-border rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                {message.searchQueryUsed && (
                  <p className="text-xs opacity-80 mt-1.5 italic flex items-center gap-1">
                    <Search size={14}/> Searched for: "{message.searchQueryUsed}"
                  </p>
                )}

                {message.relatedJobs && message.relatedJobs.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.relatedJobs.map((job, index) => {
                       const companyInitials = job.company?.substring(0, 2).toUpperCase() || '??';
                       const placeholderImageUrl = `https://placehold.co/60x60.png?text=${encodeURIComponent(companyInitials)}`;
                       const companyNameFirstWord = job.company?.split(' ')[0]?.toLowerCase() || "company";
                       const dataAiHintForPlaceholder = companyNameFirstWord.length > 15 ? companyNameFirstWord.substring(0,15) : companyNameFirstWord;

                       return (
                       <Card key={job.id || index} className="bg-background/80 dark:bg-muted/30 p-3 shadow-md hover:shadow-lg transition-shadow duration-200">
                        <div className="flex items-start gap-3">
                           <Image
                            src={placeholderImageUrl}
                            alt={`${job.company} logo`}
                            width={48} height={48}
                            className="rounded-lg border object-contain bg-muted flex-shrink-0 mt-1"
                            data-ai-hint={dataAiHintForPlaceholder}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate" title={job.title}>{job.title}</h4>
                            <p className="text-xs text-muted-foreground truncate" title={`${job.company} - ${job.location}`}>{job.company} - {job.location}</p>
                          </div>
                        </div>
                        <p className="text-xs mt-2 line-clamp-3">{job.summary}</p>
                        <div className="flex flex-wrap gap-2 items-center mt-2.5">
                          <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-xs py-0.5 px-2 shadow-sm">Relevance: {job.relevanceScore}%</Badge>
                           {job.postedDate && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm">{job.postedDate}</Badge>}
                           {job.employmentType && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm">{job.employmentType}</Badge>}
                        </div>
                        {job.url ? (
                           <a href={job.url} target="_blank" rel="noopener noreferrer" className="block mt-2.5">
                             <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs font-medium hover:text-primary/80">View Original Post &rarr;</Button>
                           </a>
                        ) : (
                           <p className="text-xs text-muted-foreground mt-2.5">No direct link available.</p>
                        )}
                      </Card>
                       );
                    })}
                  </div>
                )}
                <p className="mt-1.5 text-xs opacity-70 text-right">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {message.sender === 'user' && (
                 <Avatar className="h-9 w-9 shadow-sm">
                  <AvatarFallback className="bg-secondary text-secondary-foreground"><User size={18}/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && (
             <div className="flex items-end gap-2.5 justify-start animate-fadeInUp">
                <Avatar className="h-9 w-9 shadow-sm">
                  <AvatarFallback className="bg-primary text-primary-foreground">AI</AvatarFallback>
                </Avatar>
                <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-lg bg-card text-card-foreground border border-border rounded-bl-none">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-[60px] rounded" />
                    <Skeleton className="h-3 w-[180px] rounded" />
                    <Skeleton className="h-3 w-[120px] rounded" />
                  </div>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>
       {showScrollToBottom && (
        <Button
          variant="outline"
          size="icon"
          className="absolute bottom-20 right-4 z-10 rounded-full shadow-lg bg-card hover:bg-muted"
          onClick={() => scrollToBottom('smooth')}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-5 w-5" />
        </Button>
      )}
      <CardFooter className="p-4 border-t bg-primary/5 dark:bg-primary/10">
        <form onSubmit={handleSubmit} className="flex w-full items-center gap-3">
          <Button variant="ghost" size="icon" type="button" className="shrink-0 text-muted-foreground hover:text-primary" title="Attach file (feature coming soon)" disabled>
            <Paperclip className="h-5 w-5" />
            <span className="sr-only">Attach file</span>
          </Button>
          <Input
            type="text"
            placeholder={parsedResumeText === "" && !resumeError ? "Upload resume or ask a general question..." : "e.g., 'Find remote React jobs' or 'Entry level marketing roles'"}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 text-sm py-2.5 shadow-inner focus:shadow-md focus:ring-2 focus:ring-primary/50"
            disabled={isLoading || parsedResumeText === null}
          />
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim() || parsedResumeText === null} className="shrink-0 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150">
            <SendHorizonal className="h-5 w-5" />
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}

