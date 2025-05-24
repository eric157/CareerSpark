
'use client';

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SendHorizonal, User, Cpu, Search, AlertTriangle, ArrowDown, Eye, Info } from 'lucide-react';
import type { ChatMessage, RecommendedJob } from '@/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { jobRecommendation } from '@/ai/flows/job-recommendation';
import { contextualJobHelper } from '@/ai/flows/contextual-job-helper-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import JobDetailModal from './JobDetailModal';
import { useToast } from '@/hooks/use-toast';


const RESUME_READY_TEXT = "Great! I see your resume. How can I help you with your job search or answer your career questions today?";
const INITIAL_PROMPT_TEXT = "Hello! Upload your resume so I can assist you with personalized job recommendations and answer your career questions.";
const NO_RESUME_WARNING_TEXT = "To get personalized job recommendations, please upload your resume using the form on this page. You can still ask general career questions.";


export const isGeneralQuestion = (query: string): boolean => {
  const q = query.toLowerCase().trim();

  // 1. Highly specific informational queries (prioritized)
  const verySpecificInfoPatterns = [
    /^give me a (roadmap|guide|plan|list|summary|explanation|overview|breakdown|report) for .*/i,
    /^tell me about .*/i,
    /^explain .*/i,
    /^what is .*/i,
    /^what are .*/i,
    /^how do i .*/i,
    /^how to .*/i,
    /^how does .* work/i,
    /^(steps to|guide to|roadmap for) .*/i, // Covers "roadmap for AI engineer"
  ];
  if (verySpecificInfoPatterns.some(pattern => pattern.test(q))) {
    // Check for explicit job search overrides WITHIN these specific patterns (less likely but defensive)
    const explicitJobSearchInInfo = [
        /(find|search|list|get|show me) .* (jobs|roles|positions|openings)/i
    ];
    if (explicitJobSearchInInfo.some(cmd => cmd.test(q))) {
        // e.g., "give me a plan for finding jobs as an AI engineer" could be job search
        // This is a nuanced area. For now, if it matches a very specific info pattern,
        // and the job command isn't overwhelmingly strong, lean towards info.
        // If the job command is primary, it should be caught by next block.
        if (q.includes("jobs for") || q.includes("roles for")) return false; // "roadmap for jobs for ai engineer"
    }
    return true;
  }

  // 2. Explicit job search commands
  const explicitJobSearchCommands = [
    /(find|search for|look for|show me|get me|list) .* (jobs|roles|positions|openings|vacancies)/i,
    /looking for .* (jobs|roles|positions|openings|vacancies)/i,
    /recommend .* (jobs|roles|positions|openings|vacancies)/i,
    /suggest .* (jobs|roles|positions|openings|vacancies)/i,
    // Matches queries like "software engineer jobs", "data scientist remote"
    // This requires careful tuning to avoid catching general role mentions.
    // For now, keeping it tied to explicit action words.
  ];
  if (explicitJobSearchCommands.some(pattern => pattern.test(q))) {
    return false;
  }

  // 3. Other informational patterns (less specific than group 1 but still strong)
  const otherInformationalPatterns = [
    /learn about/i,
    /information on/i, /details about/i,
    /pros and cons of/i,
    /what are the (skills|requirements|responsibilities|duties)( for| related to)?/i,
    /tips for/i, /advice on/i, /best practices for/i,
    /^define /i, /^compare /i,
  ];
  if (otherInformationalPatterns.some(pattern => pattern.test(q))) {
     // Check for explicit job search overrides again
    if (explicitJobSearchCommands.some(command => command.test(q))) {
        return false;
    }
    return true;
  }

  // 4. Queries ending with a question mark (that aren't explicit job searches)
  if (q.endsWith("?")) {
    // Avoid misclassifying direct job search commands ending with '?' as general questions
    const jobKeywords = ["job", "jobs", "role", "roles", "position", "positions", "opening", "openings", "vacancy", "vacancies"];
    const startsWithSearchAction = ["find", "search for", "list", "show me", "get me"].some(verb => q.startsWith(verb + " "));

    if (startsWithSearchAction && jobKeywords.some(keyword => q.includes(" " + keyword))) {
      return false; // e.g., "find software engineer jobs in CA?"
    }
    return true; // General question ending with '?'
  }

  // 5. Default to job search if none of the above specific conditions are met.
  // This is because the primary function of this bot is job searching.
  // Simple noun phrases like "AI engineer" or "marketing manager remote" will fall here.
  return false;
};


export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  const [selectedJobDetail, setSelectedJobDetail] = useState<RecommendedJob | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { toast } = useToast();

  const handleViewJobDetails = (job: RecommendedJob) => {
    setSelectedJobDetail(job);
    setIsDetailModalOpen(true);
  };

  const loadResumeData = (isInitialPageLoad: boolean = false, fromEvent: boolean = false) => {
    const storedResumeData = localStorage.getItem('parsedResumeData');
    let resumeIsAvailable = false;
    let newParsedResumeTextContent = "";

    if (storedResumeData) {
      try {
        const data = JSON.parse(storedResumeData);
        if (data && (
            (Array.isArray(data.skills) && data.skills.length > 0) ||
            (Array.isArray(data.experience) && data.experience.length > 0) ||
            (Array.isArray(data.education) && data.education.length > 0)
           )) {
          newParsedResumeTextContent = `Skills: ${data.skills?.join(', ') || 'Not specified'}. Experience: ${data.experience?.join('; ') || 'Not specified'}. Education: ${data.education?.join('; ') || 'Not specified'}.`;
          resumeIsAvailable = true;
          setResumeError(null);
        } else {
          console.warn("Stored resume data is invalid or empty. Clearing.");
          localStorage.removeItem('parsedResumeData');
          setResumeError("Your stored resume data was invalid or incomplete. Please re-upload.");
          newParsedResumeTextContent = "";
        }
      } catch (e) {
        console.error("Failed to parse/validate resume from localStorage:", e);
        localStorage.removeItem('parsedResumeData');
        setResumeError("Could not load your resume data. Please re-upload.");
        newParsedResumeTextContent = "";
      }
    } else {
      setResumeError(null);
      newParsedResumeTextContent = "";
    }

    setParsedResumeText(newParsedResumeTextContent);

    setMessages(prevMessages => {
      const uniqueInitialId = `ai-msg-initial-${Date.now()}`;
      const uniqueResumeReadyId = `ai-msg-resume-ready-${Date.now()}`;

      if (isInitialPageLoad && prevMessages.length === 0) {
        return [{ id: uniqueInitialId, sender: 'ai', text: INITIAL_PROMPT_TEXT, timestamp: new Date() }];
      } else if (fromEvent && resumeIsAvailable) {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const isAlreadyPresent = lastMessage?.sender === 'ai' &&
                                 (lastMessage.text === RESUME_READY_TEXT ||
                                  lastMessage.text === INITIAL_PROMPT_TEXT ||
                                  lastMessage.text === NO_RESUME_WARNING_TEXT);
        if (!isAlreadyPresent) {
           return [...prevMessages, { id: uniqueResumeReadyId, sender: 'ai', text: RESUME_READY_TEXT, timestamp: new Date() }];
        }
      }
      return prevMessages;
    });
  };


  useEffect(() => {
    loadResumeData(true, false);

    const handleResumeUpdateEvent = () => {
      toast({
        title: "Resume Updated!",
        description: "Your resume information has been loaded into the chat.",
        variant: "default",
      });
      loadResumeData(false, true);
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
    const currentQuery = inputValue;
    setInputValue('');
    setIsLoading(true);

    const generalQuery = isGeneralQuestion(currentQuery);

    if ((!parsedResumeText || parsedResumeText.trim() === "") && !generalQuery) {
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
      if (generalQuery) {
        const aiRAGResponse = await contextualJobHelper({ userQuery: currentQuery });
        const aiMessage: ChatMessage = {
          id: `ai-rag-resp-${Date.now()}`,
          sender: 'ai',
          text: aiRAGResponse.answer,
          timestamp: new Date(),
          retrievedContextItems: aiRAGResponse.retrievedContextItems,
          isRAGResponse: true,
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);

      } else {
        const aiJobResponse = await jobRecommendation({
          resumeText: parsedResumeText || "No resume provided.",
          userPreferences: currentQuery,
        });

        let responseText = aiJobResponse.recommendedJobs && aiJobResponse.recommendedJobs.length > 0
          ? "Here are some job recommendations based on your query and resume:"
          : (aiJobResponse.noResultsFeedback || "I couldn't find specific jobs for that query right now. Try rephrasing or broadening your search.");

        if (aiJobResponse.noResultsFeedback && (!aiJobResponse.recommendedJobs || aiJobResponse.recommendedJobs.length === 0)) {
          responseText = aiJobResponse.noResultsFeedback;
        }

        const aiMessage: ChatMessage = {
          id: `ai-job-resp-${Date.now()}`,
          sender: 'ai',
          text: responseText,
          timestamp: new Date(),
          relatedJobs: aiJobResponse.recommendedJobs,
          searchQueryUsed: aiJobResponse.searchQueryUsed,
          noResultsFeedback: aiJobResponse.noResultsFeedback && (!aiJobResponse.recommendedJobs || aiJobResponse.recommendedJobs.length === 0) ? aiJobResponse.noResultsFeedback : undefined,
          isRAGResponse: false,
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      }

    } catch (error) {
      console.error("Error processing message with AI flow:", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred with the AI assistant.";
      const aiErrorMessage: ChatMessage = {
        id: `ai-err-flow-${Date.now()}`,
        sender: 'ai',
        text: `Sorry, I encountered an error: ${errorMessageText}. Please try again.`,
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
  
  const isChatInputDisabled = isLoading || (parsedResumeText === null) || (parsedResumeText.trim() === "" && messages.length > 0 && messages[messages.length-1]?.text === NO_RESUME_WARNING_TEXT);


  return (
    <>
      <Card className="w-full shadow-xl flex flex-col h-[calc(100vh-22rem)] sm:h-[calc(100vh-18rem)] max-h-[700px] border-primary/30 relative overflow-hidden bg-card">
        <CardHeader className="bg-primary/10 dark:bg-primary/20 border-b border-primary/20">
          <CardTitle className="text-xl font-semibold flex items-center gap-2 text-primary">
            <Cpu className="h-6 w-6" /> AI Career Assistant
          </CardTitle>
        </CardHeader>
        <ScrollArea className="flex-1 p-4 bg-background" ref={scrollAreaRef} onScroll={handleScroll}>
          <div className="space-y-6 pb-4">
            {resumeError && (
              <Alert variant="destructive" className="mb-4 shadow-md bg-destructive/10 border-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <AlertTitle className="text-destructive font-semibold">Resume Error</AlertTitle>
                <AlertDescription className="font-medium text-destructive/90">{resumeError}</AlertDescription>
              </Alert>
            )}
            {messages.map((message, msgIdx) => (
              <div
                key={`${message.id}-${msgIdx}-chatmsg`}
                className={`flex items-end gap-2.5 animate-fadeInUp`}
                style={{ animationDelay: `${Math.min(msgIdx * 0.05, 0.5)}s`}}
              >
                {message.sender === 'ai' && (
                  <Avatar className="h-9 w-9 shadow-sm shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">AI</AvatarFallback>
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
                  
                  {message.isRAGResponse && message.retrievedContextItems && message.retrievedContextItems.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground italic flex items-center gap-1">
                        <Info size={13} /> Based on {message.retrievedContextItems.length} retrieved snippets
                      </summary>
                      <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                        {message.retrievedContextItems.map((item, idx) => (
                          <li key={`context-${idx}`} className="break-words">{item}</li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {message.searchQueryUsed && (
                    <p className="text-xs opacity-80 mt-1.5 italic flex items-center gap-1">
                      <Search size={14}/> Searched for: "{message.searchQueryUsed}"
                    </p>
                  )}

                  {message.relatedJobs && message.relatedJobs.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {message.relatedJobs.map((job, index) => {
                         const companyNameWords = job.company?.split(' ') || [];
                         let companyInitials = companyNameWords.length > 0 ? companyNameWords[0].substring(0,1) : "";
                         if (companyNameWords.length > 1 && companyNameWords[1]) companyInitials += companyNameWords[1].substring(0,1);
                         if (!companyInitials) companyInitials = job.company?.substring(0,2) || '??';
                         const placeholderImageUrl = `https://placehold.co/60x60.png?text=${encodeURIComponent(companyInitials.toUpperCase())}`;
                        
                        let dataAiHintForPlaceholder = "company logo";
                        if (job.company) {
                            const words = job.company.toLowerCase().split(' ').filter(w => w.length > 0 && /^[a-z0-9]+$/.test(w)); // only alphanumeric
                            if (words.length > 0) {
                                dataAiHintForPlaceholder = words[0].substring(0,15);
                                if (words.length > 1 && words[1]) {
                                    const combined = `${words[0]} ${words[1]}`;
                                    if (combined.length <= 20) dataAiHintForPlaceholder = combined;
                                }
                            }
                        }


                        return (
                        <Card
                            key={job.id || `job-${index}-${message.id}-item`}
                            className="bg-background/80 dark:bg-muted/30 p-3 shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer group border-primary/10 hover:border-primary/30"
                            onClick={() => handleViewJobDetails(job)}
                        >
                          <div className="flex items-start gap-3">
                            <Image
                              src={placeholderImageUrl}
                              alt={`${job.company || 'Company'} logo placeholder`}
                              width={48} height={48}
                              className="rounded-lg border object-contain bg-muted flex-shrink-0 mt-1 shadow-sm"
                              data-ai-hint={dataAiHintForPlaceholder}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate group-hover:text-primary transition-colors text-foreground" title={job.title || 'Job Title'}>{job.title || 'N/A'}</h4>
                              <p className="text-xs text-muted-foreground truncate" title={`${job.company || 'Company'} - ${job.location || 'Location'}`}>{job.company || 'N/A'} - {job.location || 'Not specified'}</p>
                            </div>
                          </div>
                          <p className="text-xs mt-2 line-clamp-3 text-muted-foreground">{job.summary || 'No summary available.'}</p>
                          <div className="flex flex-wrap gap-2 items-center mt-2.5">
                            <Badge
                                variant={job.relevanceScore > 70 ? "default" : job.relevanceScore > 40 ? "secondary" : "destructive"}
                                className="text-xs py-0.5 px-2 shadow-sm"
                            >Relevance: {job.relevanceScore}%
                            </Badge>
                            {job.postedDate && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm border-primary/30 text-primary/90 bg-primary/5">{job.postedDate}</Badge>}
                            {job.employmentType && <Badge variant="outline" className="text-xs py-0.5 px-2 shadow-sm border-primary/30 text-primary/90 bg-primary/5">{job.employmentType}</Badge>}
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
                  <Avatar className="h-9 w-9 shadow-sm shrink-0">
                    <AvatarFallback className="bg-secondary text-secondary-foreground"><User size={18}/></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-end gap-2.5 justify-start animate-fadeInUp">
                  <Avatar className="h-9 w-9 shadow-sm shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">AI</AvatarFallback>
                  </Avatar>
                  <div className="max-w-[70%] rounded-xl px-4 py-3 shadow-lg bg-card text-card-foreground border border-border rounded-bl-none">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-[60px] rounded bg-primary/20" />
                      <Skeleton className="h-3 w-[180px] rounded bg-primary/20" />
                      <Skeleton className="h-3 w-[120px] rounded bg-primary/20" />
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
            className="absolute bottom-20 right-4 z-10 rounded-full shadow-lg bg-card hover:bg-muted border-primary/30 text-primary hover:text-primary/80"
            onClick={() => scrollToBottom('smooth')}
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-5 w-5" />
          </Button>
        )}
        <CardFooter className="p-4 border-t bg-primary/10 dark:bg-primary/20 border-primary/20">
          <form onSubmit={handleSubmit} className="flex w-full items-center gap-3">
            <Input
              type="text"
              placeholder={isChatInputDisabled ? "Upload your resume first to find jobs..." : "Ask a career question or describe jobs..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 text-sm py-2.5 shadow-inner focus:shadow-md focus:ring-2 focus:ring-primary/50 bg-background placeholder:text-muted-foreground/80"
              disabled={isChatInputDisabled}
            />
            <Button type="submit" size="icon" disabled={isChatInputDisabled || !inputValue.trim()} className="shrink-0 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-150">
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
