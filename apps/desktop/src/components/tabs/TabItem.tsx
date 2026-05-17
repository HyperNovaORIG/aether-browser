import { motion } from "framer-motion";
import { Globe, X, Volume2, VolumeX } from "lucide-react";
import type { Tab } from "@aether/shared";
import { useTabsStore } from "@/stores/tabs-store";
import { cn } from "@/lib/cn";

interface TabItemProps {
  tab: Tab;
  active: boolean;
}

export function TabItem({ tab, active }: TabItemProps): JSX.Element {
  const activate = useTabsStore((s) => s.activate);
  const close = useTabsStore((s) => s.close);

  return (
    <motion.button
      onClick={() => void activate(tab.id)}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors",
        active ? "bg-white/10 text-white shadow-hairline" : "text-fog-300 hover:bg-white/5 hover:text-white",
      )}
    >
      <div className="relative h-4 w-4 flex-shrink-0 overflow-hidden rounded-sm">
        {tab.faviconUrl ? (
          <img src={tab.faviconUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Globe className="h-4 w-4 text-fog-500" />
        )}
        {tab.loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="h-2 w-2 animate-breathe rounded-full bg-iris" />
          </span>
        )}
      </div>

      <span className="flex-1 truncate text-[13px]">
        {tab.title || tab.url || "New Tab"}
      </span>

      {tab.muted ? (
        <VolumeX className="h-3 w-3 text-fog-500" />
      ) : null}

      <button
        onClick={(e) => {
          e.stopPropagation();
          void close(tab.id);
        }}
        aria-label="Close tab"
        className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-md text-fog-500 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
      >
        <X className="h-3 w-3" />
      </button>
      {!tab.muted && tab.url.startsWith("https://") && active && (
        <span className="pointer-events-none absolute -bottom-px left-2 right-2 h-px bg-gradient-to-r from-transparent via-iris to-transparent" />
      )}
      {!active && <Volume2 className="hidden" />}
    </motion.button>
  );
}
