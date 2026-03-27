import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "./Sidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function LayoutContent() {
  // Activate global keyboard shortcuts (requires SidebarProvider context)
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto px-4 pb-8 pt-14 md:px-8 md:pb-12 md:pt-16 lg:px-12 lg:pb-16 lg:pt-20">
        <div className="md:hidden absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <div className="mx-auto w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function Layout() {
  return (
    <SidebarProvider>
      <LayoutContent />
      <Toaster />
    </SidebarProvider>
  );
}
