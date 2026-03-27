import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export function Layout() {
  // Activate global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <Sidebar />
        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </SidebarProvider>
  );
}
