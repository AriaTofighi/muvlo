import { Link, useLocation } from "react-router-dom";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileVideo, Scissors, Minimize, Combine, Music, Type } from "lucide-react";
import { MuvloMark } from "@/components/brand/MuvloMark";

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

  return (
    <ShadcnSidebar variant="inset">
      <SidebarHeader className="border-b border-sidebar-border/70 p-3">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-2 py-1">
          <MuvloMark className="size-10 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">Muvlo</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Media workflows</p>
          </div>
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
    </ShadcnSidebar>
  );
}
