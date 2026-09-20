import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AnimatedBackground } from "@/components/backgrounds";
import { Menu } from "lucide-react";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative overflow-hidden">
        {/* Background Effects */}
        <AnimatedBackground />

        {/* Sidebar */}
        <AppSidebar />

        {/* Main Content */}
        <main className="flex-1 relative z-10 min-w-0 overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-20 border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="flex h-16 items-center gap-4 px-6">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors">
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary" />
              </div>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6 lg:p-8 overflow-x-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
