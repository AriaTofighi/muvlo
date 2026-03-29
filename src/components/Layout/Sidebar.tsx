import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarSeparator,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, FileVideo, Scissors, Minimize, Combine, Music, Type 
} from "lucide-react";
import { MuvloMark } from "@/components/brand/MuvloMark";
import { JobQueue } from "@/components/JobQueue";
import { SettingsPanel } from "@/components/SettingsPanel";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/convert", label: "Convert", icon: FileVideo },
  { path: "/compress", label: "Compress", icon: Minimize },
  { path: "/trim", label: "Trim", icon: Scissors },
  { path: "/merge", label: "Merge", icon: Combine },
  { path: "/extract-audio", label: "Extract Audio", icon: Music },
  { path: "/subtitles", label: "Subtitles", icon: Type },
];

export function Sidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <ShadcnSidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="px-2 pt-4 pb-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-3 group-data-[collapsible=icon]:pb-2">
        <div className={collapsed ? "flex flex-col items-center gap-2" : "flex items-center justify-between"}>
          <Link
            to="/"
            className={collapsed ? "flex items-center justify-center opacity-90 transition-opacity hover:opacity-100" : "flex items-center opacity-80 transition-opacity hover:opacity-100"}
          >
            <MuvloMark key="hmr-flush" className={collapsed ? "size-6" : "size-6.5"} />
          </Link>
          <SidebarTrigger className="h-8 w-8 opacity-60 transition-opacity hover:opacity-100 group-data-[collapsible=icon]:h-7 group-data-[collapsible=icon]:w-7" />
        </div>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:pt-2">
        <SidebarGroup className="group-data-[collapsible=icon]:px-2">
          <SidebarGroupLabel>Workflows</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link to={item.path} />}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto">
        <SidebarSeparator className="mx-0 w-full" />
        <SidebarFooter className="px-2 py-3 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2">
          <div className="flex w-full flex-col gap-1 group-data-[collapsible=icon]:items-center">
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <JobQueue />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SettingsPanel />
              </SidebarMenuItem>
            </SidebarMenu>
          </div>
        </SidebarFooter>
      </div>
      <SidebarRail />
    </ShadcnSidebar>
  );
}
