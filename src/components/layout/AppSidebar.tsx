
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
import { Sparkles, MessageSquare } from 'lucide-react'; 
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';

const navItems = [
  { href: '/', label: 'AI Chat & Jobs', icon: MessageSquare },
  // { href: '/upload-resume', label: 'Upload Resume', icon: UploadCloud }, // Removed
  // { href: '/jobs', label: 'Browse Jobs', icon: Briefcase }, // Removed
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
            <AvatarFallback>CS</AvatarFallback> 
          </Avatar>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-sm font-medium">Guest User</p>
            <p className="text-xs text-muted-foreground">Explore jobs</p>
          </div>
        </div>
         <div className="mt-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:space-y-1 hidden">
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
