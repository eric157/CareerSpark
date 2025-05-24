'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sparkles, MessageSquare, UploadCloud, UserCircle2, Briefcase, LogOut, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { href: '/', label: 'Dashboard', icon: MessageSquare },
  { href: '/upload-resume', label: 'Upload Resume', icon: UploadCloud },
  { href: '/profile', label: 'My Profile', icon: UserCircle2 },
  { href: '/jobs', label: 'Job Listings', icon: Briefcase },
];

export default function AppSidebar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  return (
    <Sidebar collapsible="icon" variant="sidebar" side="left">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="md:hidden" asChild>
             <SidebarTrigger />
          </Button>
          <Sparkles className="h-8 w-8 text-primary" />
          <div className="group-data-[collapsible=icon]:hidden">
            <h1 className="text-xl font-semibold">Career Spark</h1>
          </div>
        </div>
      </SidebarHeader>
      <Separator className="group-data-[collapsible=icon]:hidden" />
      <SidebarContent className="p-2 flex-1">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: 'right', align: 'center' }}
                  className="justify-start"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="group-data-[collapsible=icon]:hidden" />
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://placehold.co/100x100.png" alt="User Avatar" data-ai-hint="person avatar" />
            <AvatarFallback>CS</AvatarFallback>
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">User Name</p>
            <p className="text-xs text-muted-foreground">user@example.com</p>
          </div>
        </div>
        <div className="mt-2 flex flex-col space-y-1 group-data-[collapsible=icon]:hidden">
           <Button variant="ghost" size="sm" className="justify-start gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
         <div className="mt-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:space-y-1 hidden">
          <SidebarMenuButton tooltip={{ children: "Settings", side: 'right', align: 'center' }} size="icon" variant="ghost">
            <Settings className="h-5 w-5" />
          </SidebarMenuButton>
          <SidebarMenuButton tooltip={{ children: "Log Out", side: 'right', align: 'center' }} size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-5 w-5" />
          </SidebarMenuButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
