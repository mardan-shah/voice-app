"use client";

import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

export function ChatTabs() {
  const { tabs, activeTabId, setActiveTab, createTab, deleteTab } = useChatStore();

  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200/80 px-4 py-3 dark:border-white/8 scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "group relative flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
            )}
          >
            <span className="truncate max-w-[120px]">{tab.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Add simple confirmation before deleting
                if (window.confirm("Delete this chat?")) {
                  deleteTab(tab.id);
                }
              }}
              className={cn(
                "ml-1 flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100",
                isActive 
                  ? "hover:bg-blue-700" 
                  : "hover:bg-slate-200 dark:hover:bg-white/10"
              )}
              title="Delete chat"
            >
              ✕
            </button>
          </div>
        );
      })}
      
      <button
        onClick={() => createTab()}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
        title="New Chat"
      >
        +
      </button>
    </div>
  );
}
