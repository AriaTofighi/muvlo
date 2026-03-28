import { Outlet } from "react-router-dom";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "./Sidebar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function LayoutContent() {
  // Activate global keyboard shortcuts (requires SidebarProvider context)
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <Sidebar />
      <SidebarInset className="flex flex-col">
        <div className="md:hidden absolute top-4 left-4 z-50">
          <SidebarTrigger />
        </div>
        <div className="flex-1 flex flex-col justify-center mx-auto w-full px-4 pb-12 pt-8 md:px-6 md:pt-10 lg:px-8 lg:pt-12">
          <div className="w-full">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
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
