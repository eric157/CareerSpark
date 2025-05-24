
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, SendHorizonal, User, Cpu, Search, AlertTriangle, ArrowDown, Eye } from 'lucide-react';
import type { ChatMessage, RecommendedJob } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { jobRecommendation } from '@/ai/flows/job-recommendation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import JobDetailModal from './JobDetailModal'; 
import { useToast } from '@/hooks/use-toast';


const RESUME_READY_TEXT = "Great! I see your resume. How can I help you with your job search today?";
const INITIAL_PROMPT_TEXT = "Hello! Upload your resume using the form so I can assist you with personalized job recommendations.";
const NO_RESUME_WARNING_TEXT = "To get personalized job recommendations, please upload your resume using the form on this page.";


export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null); // null means not yet checked, "" means checked and no valid resume
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [selectedJobDetail, setSelectedJobDetail] = useState<RecommendedJob | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  const handleViewJobDetails = (job: RecommendedJob) => {
    setSelectedJobDetail(job);
    setIsDetailModalOpen(true);
  };

  const loadResumeData = (isInitialPageLoad: boolean = false) => {
    const storedResumeData = localStorage.getItem('parsedResumeData');
    let resumeIsAvailable = false;
    let newParsedResumeTextContent = "";

    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        if (data && (data.skills?.length || data.experience?.length || data.education?.length)) {
          newParsedResumeTextContent = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
          resumeIsAvailable = true;
          setResumeError(null);
        } else {
          console.warn("Stored resume data is invalid or empty. Clearing.");
          localStorage.removeItem('parsedResumeData');
          setResumeError("Your stored resume data was invalid. Please re-upload.");
          resumeIsAvailable = false;
        }
      } catch (e) {
        console.error("Failed to parse/validate resume from localStorage:", e);
        localStorage.removeItem('parsedResumeData');
        setResumeError("Could not load your resume data. Please re-upload.");
        resumeIsAvailable = false;
      }
    } else { 
      setResumeError(null); 
      resumeIsAvailable = false;
    }
    
    setParsedResumeText(newParsedResumeTextContent); // Always set, empty if no resume

    setMessages(prevMessages => {
      // On initial load, if no messages yet, add the initial prompt.
      if (isInitialPageLoad && prevMessages.length === 0) {
        const uniqueId = `ai-msg-initial-${Date.now()}`;
        return [{ id: uniqueId, sender: 'ai', text: INITIAL_PROMPT_TEXT, timestamp: new Date() }];
      }
      // If triggered by resumeUpdated event (not initial load) AND resume is now available
      else if (!isInitialPageLoad && resumeIsAvailable) {
        const lastMessageText = prevMessages[prevMessages.length - 1]?.text;
        // Add RESUME_READY_TEXT only if it's not already the last message.
        if (lastMessageText !== RESUME_READY_TEXT) {
          const uniqueId = `ai-msg-resume-ready-${Date.now()}`;
          return [...prevMessages, { id: uniqueId, sender: 'ai', text: RESUME_READY_TEXT, timestamp: new Date() }];
        }
      }
      return prevMessages; // No change
    });
  };


  useEffect(() => {
    loadResumeData(true); // Initial load

    const handleResumeUpdateEvent = () => {
      toast({
        title: "Resume Updated!",
        description: "Your resume information has been loaded into the chat.",
        variant: "default",
      });
      loadResumeData(false); // Triggered by event
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
    if (messages.length > 0 && !isDetailModalOpen) { 
      scrollToBottom('auto');
    }
  }, [messages, isDetailModalOpen]);

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

    if (parsedResumeText === null || !parsedResumeText.trim()) { 
        setMessages(prev => {
            const lastMessage = prev[prev.length -1];
            if (lastMessage && lastMessage.text === NO_RESUME_WARNING_TEXT && lastMessage.sender === 'ai') return prev; 
            return [...prev, {
                id: `ai-err-no-resume-${Date.now()}`,
                sender: 'ai',
                text: NO_RESUME_WARNING_TEXT,
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

      // Override responseText if noResultsFeedback is explicitly provided and no jobs are found
      if (aiResponse.noResultsFeedback && aiResponse.recommendedJobs.length === 0) {
        responseText = aiResponse.noResultsFeedback;
      }

      const aiMessage: ChatMessage = {
        id: `ai-resp-${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date(),
        relatedJobs: aiResponse.recommendedJobs,
        searchQueryUsed: aiResponse.searchQueryUsed,
        noResultsFeedback: aiResponse.noResultsFeedback && aiResponse.recommendedJobs.length === 0 ? aiResponse.noResultsFeedback : undefined,
      };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);

    } catch (error) {
      console.error("Error processing message with AI flow:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred with the AI assistant.";
      const aiErrorMessage: ChatMessage = {
        id: `ai-err-flow-${Date.now()}`,
        sender: 'ai',
        text: `Sorry, I encountered an error: ${errorMessageText}. Please check the console for details or try again.`,
        timestamp: new Date(),
      };
      setMessages((prevMessages) => [...prevMessages, aiErrorMessage]);
      toast({
        title: "AI Error",
        description: errorMessageText,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false);
    }
  };

  const isChatDisabled = isLoading || parsedResumeText === null || parsedResumeText.trim() === "";

  return (
    <>
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
                        const companyNameFirstWord = job.company?.split(' ')[0]?.toLowerCase().replace(/[^a-z0-9]/gi, '') || "company";
                        const dataAiHintForPlaceholder = companyNameFirstWord.length > 15 ? companyNameFirstWord.substring(0,15) : companyNameFirstWord;

                        return (
                        <Card 
                            key={job.id || `job-${index}-${message.id}`} // More robust key
                            className="bg-background/80 dark:bg-muted/30 p-3 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group"
                            onClick={() => handleViewJobDetails(job)}
                        >
                          <div className="flex items-start gap-3">
                            <Image
                              src={placeholderImageUrl}
                              alt={`${job.company} logo placeholder`}
                              width={48} height={48}
                              className="rounded-lg border object-contain bg-muted flex-shrink-0 mt-1"
                              data-ai-hint={dataAiHintForPlaceholder}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors" title={job.title}>{job.title}</h4>
                              <p className="text-xs text-muted-foreground truncate" title={`${job.company} - ${job.location}`}>{job.company} - {job.location || 'Not specified'}</p>
                            </div>
                          </div>
                          <p className="text-xs mt-2 line-clamp-3">{job.summary}</p>
                          <div className="flex flex-wrap gap-2 items-center mt-2.5">
                            <Badge variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"} className="text-xs py-0.5 px-2 shadow-sm">Relevance: {job.relevanceScore}%</Badge>
                            {job.postedDate && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm">{job.postedDate}</Badge>}
                            {job.employmentType && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm">{job.employmentType}</Badge>}
                          </div>
                          <div className="flex items-center justify-between mt-2.5">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="p-0 h-auto text-primary text-xs font-medium hover:text-primary/80 group-hover:underline"
                                onClick={(e) => { e.stopPropagation(); handleViewJobDetails(job); }} 
                            >
                                <Eye size={14} className="mr-1.5" /> View Details
                            </Button>
                            {job.url ? (
                              <a href={job.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <Button variant="link" size="sm" className="p-0 h-auto text-primary text-xs font-medium hover:text-primary/80">
                                    Original Post &rarr;
                                </Button>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">No direct link</span>
                            )}
                          </div>
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
              placeholder={parsedResumeText === null || !parsedResumeText.trim() ? "Upload your resume first..." : "e.g., 'Find remote React jobs' or 'Entry level marketing roles'"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 text-sm py-2.5 shadow-inner focus:shadow-md focus:ring-2 focus:ring-primary/50"
              disabled={isChatDisabled}
            />
            <Button type="submit" size="icon" disabled={isChatDisabled || !inputValue.trim()} className="shrink-0 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150">
              <SendHorizonal className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </CardFooter>
      </Card>
      <JobDetailModal 
        job={selectedJobDetail} 
        isOpen={isDetailModalOpen} 
        onClose={() => setIsDetailModalOpen(false)} 
      />
    </>
  );
}
