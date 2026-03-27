import { useEffect } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { useNavigate } from "react-router-dom";

export function useKeyboardShortcuts() {
  const { toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
        return;
      }

      // Ctrl/Cmd + B: Toggle Sidebar
      if (e.key === "b" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        toggleSidebar();
      }

      // Alt + Number: Quick Navigation
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const routes = ["/", "/convert", "/trim", "/compress", "/merge", "/extract-audio", "/subtitles"];
        const index = parseInt(e.key) - 1;
        if (routes[index]) navigate(routes[index]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar, navigate]);
}
