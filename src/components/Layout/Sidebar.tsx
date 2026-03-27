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
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileVideo, Scissors, Minimize, Combine, Music, Type, FolderOpen } from "lucide-react";
import { MuvloMark } from "@/components/brand/MuvloMark";
import { Button } from "@/components/ui/button";
import { JobQueue } from "@/components/JobQueue";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useSourceFileActions } from "@/hooks/useSourceFileActions";
import { useWorkspaceStore } from "@/stores/workspaceStore";
import { toast } from "sonner";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/convert", label: "Convert", icon: FileVideo },
  { path: "/trim", label: "Trim", icon: Scissors },
  { path: "/compress", label: "Compress", icon: Minimize },
  { path: "/merge", label: "Merge", icon: Combine },
  { path: "/extract-audio", label: "Extract Audio", icon: Music },
  { path: "/subtitles", label: "Subtitles", icon: Type },
];

export function Sidebar() {
  const location = useLocation();
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const { openSourceFile } = useSourceFileActions();

  return (
    <ShadcnSidebar variant="inset">
      <SidebarHeader className="px-5 pt-6 pb-2">
        <Link to="/" className="flex items-center w-fit opacity-80 hover:opacity-100 transition-opacity">
          <MuvloMark key="hmr-flush" className="size-7" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workflows</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.label}
                      render={<Link to={item.path} />}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border px-2.5 py-3 space-y-2.5">
        {activeFile && (
          <div className="min-w-0 rounded-lg bg-sidebar-accent/40 px-2.5 py-2">
            <p className="truncate text-xs font-medium text-sidebar-foreground">{activeFile.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50">Active source</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1 justify-start gap-2 text-sm"
            onClick={() => {
              void openSourceFile().catch((error) => {
                toast.error(error instanceof Error ? error.message : "Failed to open the file picker.");
              });
            }}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            Open Source
          </Button>
          <JobQueue />
          <SettingsPanel />
        </div>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
