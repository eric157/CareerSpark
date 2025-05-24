
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
import { classifyUserIntent } from '@/ai/flows/intent-classifier-flow';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import JobDetailModal from './JobDetailModal';
import { useToast } from '@/hooks/use-toast';


const RESUME_READY_TEXT = "Great! I see your resume. How can I help you with your job search or answer your career questions today?";
const INITIAL_PROMPT_TEXT = "Hello! Upload your resume so I can assist you with personalized job recommendations and answer your career questions.";
const NO_RESUME_WARNING_TEXT_JOB_SEARCH = "To get personalized job recommendations, please upload your resume using the form on this page. You can still ask general career questions.";
const NO_RESUME_WARNING_TEXT_GENERAL_QUESTION = "For the best advice, please upload your resume. However, I can still answer general career questions.";


// Utility function to render text with **bold** formatting
function renderFormattedText(text: string): React.ReactNode[] {
  if (!text) return [];
  // Split by **bolded text** or *italic text*, keeping the delimiters
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${index}-${part.substring(0, 5)}`}>{part.substring(2, part.length - 2)}</strong>;
    }
    // Basic check for *italic* - can be expanded if more markdown is needed
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={`${index}-${part.substring(0, 5)}`}>{part.substring(1, part.length - 1)}</em>;
    }
    return part; // Render as plain text
  });
}


export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [parsedResumeText, setParsedResumeText] = useState<string | null>(null); // null means not checked, "" means checked and no valid resume
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
          console.warn("Stored resume data is invalid or empty. Clearing from localStorage.");
          localStorage.removeItem('parsedResumeData');
          const errorMsg = "Your stored resume data was invalid or empty. Please re-upload.";
          if (!fromEvent) setResumeError(errorMsg);
          window.dispatchEvent(new CustomEvent('resumeUploadError', { detail: errorMsg }));
          newParsedResumeTextContent = "";
          resumeIsAvailable = false;
        }
      } catch (e) {
        console.error("Failed to parse/validate resume from localStorage:", e);
        localStorage.removeItem('parsedResumeData');
        const errorMsg = "Could not load your resume data from a previous session. Please re-upload.";
        if (!fromEvent) setResumeError(errorMsg);
        window.dispatchEvent(new CustomEvent('resumeUploadError', { detail: errorMsg }));
        newParsedResumeTextContent = ""; 
        resumeIsAvailable = false;
      }
    } else {
       if (!fromEvent) setResumeError(null); 
       newParsedResumeTextContent = "";
       resumeIsAvailable = false;
    }
    setParsedResumeText(newParsedResumeTextContent);

    setMessages(prevMessages => {
        const uniqueInitialId = `ai-msg-initial-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const uniqueResumeReadyId = `ai-msg-resume-ready-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        if (isInitialPageLoad && prevMessages.length === 0) { // Only add initial prompt if chat is empty
            return [{ id: uniqueInitialId, sender: 'ai', text: INITIAL_PROMPT_TEXT, timestamp: new Date() }];
        }
        else if (fromEvent && resumeIsAvailable) { // Triggered by resumeUpdated event
            const lastMessage = prevMessages[prevMessages.length - 1];
             // Add resume ready text only if it's not already the last message and AI is not currently loading
            if (!isLoading && (!lastMessage || lastMessage.text !== RESUME_READY_TEXT)) {
                 return [...prevMessages, { id: uniqueResumeReadyId, sender: 'ai', text: RESUME_READY_TEXT, timestamp: new Date() }];
            }
        }
        return prevMessages; // No change to messages
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
      setResumeError(null); 
      loadResumeData(false, true); 
    };

    const handleResumeUploadErrorEvent = (event: Event) => {
        const customEvent = event as CustomEvent<string>;
        setResumeError(customEvent.detail); 
        setParsedResumeText(""); 
        // localStorage.removeItem('parsedResumeData'); // Already handled in loadResumeData
         toast({
            title: "Resume Error",
            description: customEvent.detail,
            variant: "destructive",
        });
    };


    window.addEventListener('resumeUpdated', handleResumeUpdateEvent);
    window.addEventListener('resumeUploadError', handleResumeUploadErrorEvent);

    return () => {
      window.removeEventListener('resumeUpdated', handleResumeUpdateEvent);
      window.removeEventListener('resumeUploadError', handleResumeUploadErrorEvent);
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
      id: `user-msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      sender: 'user',
      text: inputValue,
      timestamp: new Date(),
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentQuery = inputValue;
    setInputValue('');
    setIsLoading(true);
    setTimeout(() => scrollToBottom('smooth'), 50); 


    try {
      const intentResponse = await classifyUserIntent({ userQuery: currentQuery });
      const intent = intentResponse.intent;
      const resumeIsEffectivelyEmpty = !parsedResumeText || parsedResumeText.trim() === "";

      if (intent === 'general_question') {
        // For general questions, if no resume is present and it's an early, short message,
        // gently remind about uploading resume for best advice.
        if(resumeIsEffectivelyEmpty && messages.length <= 3 && currentQuery.length < 25 && !currentQuery.toLowerCase().includes("resume")) {
            const lastAiMessage = messages.filter(m => m.sender === 'ai').pop();
            if(!lastAiMessage || lastAiMessage.text !== NO_RESUME_WARNING_TEXT_GENERAL_QUESTION) {
                 setMessages((prev) => [
                    ...prev,
                    {
                        id: `ai-warn-resume-general-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        sender: 'ai',
                        text: NO_RESUME_WARNING_TEXT_GENERAL_QUESTION,
                        timestamp: new Date(),
                    },
                ]);
            }
        }

        const aiRAGResponse = await contextualJobHelper({ 
          userQuery: currentQuery,
          resumeText: parsedResumeText || undefined, // Pass resume text if available
        });
        const aiMessage: ChatMessage = {
          id: `ai-rag-resp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sender: 'ai',
          text: aiRAGResponse.answer,
          timestamp: new Date(),
          retrievedContextItems: aiRAGResponse.retrievedContextItems,
          isRAGResponse: true,
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      } 
      else if (intent === 'job_search') {
        if (resumeIsEffectivelyEmpty) {
            // Check if the warning was already the last AI message.
            setMessages(prev => {
                const lastMessage = prev.filter(m => m.sender === 'ai').pop();
                if (lastMessage && lastMessage.text === NO_RESUME_WARNING_TEXT_JOB_SEARCH) return prev; // Avoid duplicate warning
                return [...prev, {
                    id: `ai-err-no-resume-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                    sender: 'ai',
                    text: NO_RESUME_WARNING_TEXT_JOB_SEARCH,
                    timestamp: new Date(),
                }];
            });
            setIsLoading(false);
            return;
        }

        const aiJobResponse = await jobRecommendation({
          resumeText: parsedResumeText || "No resume provided.", // Should not happen due to check above
          userPreferences: currentQuery,
        });

        let responseText = aiJobResponse.recommendedJobs && aiJobResponse.recommendedJobs.length > 0
          ? "Here are some job recommendations based on your query and resume:"
          : (aiJobResponse.noResultsFeedback || "I couldn't find specific jobs for that query right now. Try rephrasing or broadening your search.");
        
        // Explicitly use noResultsFeedback if it's provided and there are no jobs
        if (aiJobResponse.noResultsFeedback && (!aiJobResponse.recommendedJobs || aiJobResponse.recommendedJobs.length === 0)) {
          responseText = aiJobResponse.noResultsFeedback;
        }


        const aiMessage: ChatMessage = {
          id: `ai-job-resp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sender: 'ai',
          text: responseText,
          timestamp: new Date(),
          relatedJobs: aiJobResponse.recommendedJobs,
          searchQueryUsed: aiJobResponse.searchQueryUsed,
          // Only set noResultsFeedback if jobs array is empty AND feedback exists
          noResultsFeedback: aiJobResponse.noResultsFeedback && (!aiJobResponse.recommendedJobs || aiJobResponse.recommendedJobs.length === 0) ? aiJobResponse.noResultsFeedback : undefined,
          isRAGResponse: false,
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      } else {
        // Fallback to general question if intent is somehow unclear (should be rare with a schema)
        console.warn(`Unexpected intent: ${intent}. Defaulting to general question (RAG).`);
        const aiRAGResponse = await contextualJobHelper({ 
          userQuery: currentQuery,
          resumeText: parsedResumeText || undefined,
        });
        const aiMessage: ChatMessage = {
          id: `ai-rag-resp-default-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          sender: 'ai',
          text: aiRAGResponse.answer,
          timestamp: new Date(),
          retrievedContextItems: aiRAGResponse.retrievedContextItems,
          isRAGResponse: true,
        };
        setMessages((prevMessages) => [...prevMessages, aiMessage]);
      }

    } catch (error) {
      console.error("Error processing message with AI flow(s):", error);
      const errorMessageText = error instanceof Error ? error.message : "An unknown error occurred with the AI assistant.";
      const aiErrorMessage: ChatMessage = {
        id: `ai-err-flow-${Date.now()}-${Math.random().toString(36).substring(7)}`,
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

  // Chat input is disabled if:
  // 1. AI is currently loading a response.
  // 2. Resume text has not yet been checked/loaded from localStorage (parsedResumeText is null).
  // 3. Resume text has been checked and found to be empty, AND the last AI message was the specific "no resume" warning for job searches.
  //    This allows users to still ask general questions even with an empty resume, unless they just tried a job search.
  const isChatInputDisabled = 
    isLoading || 
    parsedResumeText === null || 
    (parsedResumeText.trim() === "" && 
     messages.length > 0 && 
     messages.filter(m=>m.sender==='ai').pop()?.text === NO_RESUME_WARNING_TEXT_JOB_SEARCH);


  return (
    <>
      <Card className="w-full shadow-xl flex flex-col border-primary/30 relative overflow-hidden bg-card min-h-[550px] md:min-h-[650px] lg:h-[75vh] max-h-[850px]">
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
                key={`${message.id}-${msgIdx}-${message.sender}-${message.text.substring(0,10)}`}
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
                  <div className="text-sm whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none">
                    {message.sender === 'ai' ? renderFormattedText(message.text) : message.text}
                  </div>

                  {message.isRAGResponse && message.retrievedContextItems && message.retrievedContextItems.length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground italic flex items-center gap-1">
                        <Info size={13} /> Based on {message.retrievedContextItems.length} retrieved snippets
                      </summary>
                      <ul className="list-disc pl-4 mt-1 space-y-1 opacity-80">
                        {message.retrievedContextItems.map((item, idx) => (
                          <li key={`context-${message.id}-${idx}`} className="break-words">{item}</li>
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
                            const words = job.company.toLowerCase().split(' ').filter(w => w.length > 0 && /^[a-z0-9]+$/.test(w)); 
                            if (words.length > 0) {
                                dataAiHintForPlaceholder = words[0].substring(0,15); 
                                if (words.length > 1 && words[1]) {
                                    const combined = `${words[0].substring(0,10)} ${words[1].substring(0,9)}`.trim(); 
                                    if (combined.length <= 20 && combined.length > 0) dataAiHintForPlaceholder = combined;
                                }
                            }
                            if(dataAiHintForPlaceholder.length === 0 || dataAiHintForPlaceholder === "logo") dataAiHintForPlaceholder = "company";
                        }


                        return (
                        <Card
                            key={job.id || `job-${index}-${message.id}-item-${Math.random().toString(36).substring(7)}`}
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
              placeholder={isChatInputDisabled ? "Upload your resume first..." : "Ask a career question or describe jobs..."}
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
