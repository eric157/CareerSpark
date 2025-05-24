'use client'; // Needs to be client component to access localStorage

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import type { ParsedResumeData } from '@/types';
import { UserCircle2, ListChecks, Briefcase, GraduationCap, Edit3, UploadCloud } from 'lucide-react';
import Image from 'next/image';

export default function ProfilePage() {
  const [resumeData, setResumeData] = useState<ParsedResumeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedData = localStorage.getItem('parsedResumeData');
    if (storedData) {
      setResumeData(JSON.parse(storedData));
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <UserCircle2 className="h-8 w-8 text-primary" />
            My Profile
          </h1>
          <p className="text-lg text-muted-foreground">
            Your professional summary, skills, experience, and education.
          </p>
        </div>
        <Link href="/upload-resume" passHref>
          <Button variant="outline" className="flex items-center gap-2">
            <Edit3 className="h-4 w-4" />
            Update Resume
          </Button>
        </Link>
      </header>

      {!resumeData ? (
        <Card className="text-center py-12 shadow-lg">
          <CardHeader>
            <UploadCloud className="h-16 w-16 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">No Resume Data Found</CardTitle>
            <CardDescription className="text-md">
              It looks like you haven't uploaded or analyzed your resume yet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/upload-resume" passHref>
              <Button size="lg" className="text-base">
                <UploadCloud className="mr-2 h-5 w-5" />
                Upload Your Resume
              </Button>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground">
              Upload your resume to unlock personalized job recommendations and insights.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
              <Image 
                src="https://placehold.co/128x128.png" 
                alt="User Avatar" 
                width={128} 
                height={128} 
                className="rounded-full mb-4 border-4 border-primary"
                data-ai-hint="professional portrait"
              />
              <CardTitle className="text-2xl">Your Name</CardTitle> {/* Placeholder */}
              <CardDescription>Software Engineer</CardDescription> {/* Placeholder */}
            </CardHeader>
            <CardContent className="text-sm space-y-2">
               <p><strong>Email:</strong> user@example.com</p> {/* Placeholder */}
               <p><strong>Phone:</strong> (555) 123-4567</p> {/* Placeholder */}
               <p><strong>Location:</strong> San Francisco, CA</p> {/* Placeholder */}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><ListChecks className="text-primary"/>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              {resumeData.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {resumeData.skills.map((skill, index) => (
                    <span key={index} className="bg-primary/10 text-primary font-medium px-3 py-1 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              ) : <p className="text-muted-foreground">No skills information available. Update your resume.</p>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><Briefcase className="text-primary"/>Work Experience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.experience.length > 0 ? (
                resumeData.experience.map((exp, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                    <p className="font-semibold text-md">{exp.split(" at ")[0]}</p> {/* Simple parsing, might need refinement */}
                    <p className="text-sm text-muted-foreground">{exp.split(" at ")[1] || 'Details unavailable'}</p>
                  </div>
                ))
              ) : <p className="text-muted-foreground">No work experience found. Update your resume.</p>}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl flex items-center gap-2"><GraduationCap className="text-primary"/>Education</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {resumeData.education.length > 0 ? (
                resumeData.education.map((edu, index) => (
                  <div key={index} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                    <p className="font-semibold text-md">{edu.split(" from ")[0]}</p> {/* Simple parsing */}
                    <p className="text-sm text-muted-foreground">{edu.split(" from ")[1] || 'Details unavailable'}</p>
                  </div>
                ))
              ) : <p className="text-muted-foreground">No education details found. Update your resume.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Simple loader component
function Loader2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
