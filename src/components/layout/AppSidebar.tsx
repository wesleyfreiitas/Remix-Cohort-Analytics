import { LayoutDashboard, Table, LineChart, Settings, LogOut, Sparkles, ShieldAlert } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAIPreload } from "@/contexts/AIPreloadContext";

const navigationItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Análise de Cohort", url: "/cohort", icon: Table },
  { title: "Insights IA", url: "/insights", icon: Sparkles },
  { title: "Configurações", url: "/configuracoes", icon: Settings },
  { title: "Administração", url: "/admin", icon: ShieldAlert },
];

export function AppSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAnalyzing, isGeneratingPlan } = useAIPreload();

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Você foi desconectado com sucesso.",
    });
    navigate("/login");
  };

  return (
    <Sidebar
      className={cn(
        "border-r border-sidebar-border bg-sidebar transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      collapsible="icon"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary">
            <LineChart className="h-5 w-5 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-gradient">Cohort</span>
              <span className="text-xs text-muted-foreground">Analytics</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                const isInsightsItem = item.url === "/insights";
                const showAIIndicator = isInsightsItem && (isAnalyzing || isGeneratingPlan);
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "nav-item",
                          isActive && "active"
                        )}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 transition-colors",
                          isActive ? "text-primary" : "text-sidebar-foreground"
                        )} />
                        {!isCollapsed && (
                          <span className={cn(
                            "transition-colors flex-1",
                            isActive ? "text-primary font-medium" : ""
                          )}>
                            {item.title}
                          </span>
                        )}
                        {!isCollapsed && showAIIndicator && (
                          <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary animate-pulse">
                            {isAnalyzing ? "Analisando..." : "Gerando..."}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button 
                onClick={handleLogout}
                className="nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                {!isCollapsed && <span>Sair</span>}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
