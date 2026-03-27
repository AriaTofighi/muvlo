import { SidebarTrigger } from "@/components/ui/sidebar";
import { JobQueue } from "@/components/JobQueue";
import { SettingsPanel } from "@/components/SettingsPanel";
import { useWorkspaceStore } from "@/stores/workspaceStore";

export function Header() {
  const activeFile = useWorkspaceStore((state) => state.activeFile);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-6 lg:h-[60px]">
      <SidebarTrigger className="sm:hidden" />
      <div className="flex-1">
        <h1 className="font-semibold text-lg flex items-center">Workspace</h1>
        <p className="truncate text-sm text-muted-foreground">
          {activeFile ? activeFile.name : "Import a source file to start a workflow."}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <JobQueue />
        <SettingsPanel />
      </div>
    </header>
  );
}
