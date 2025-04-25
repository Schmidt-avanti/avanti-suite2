
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatTabsProps {
  activeTab: "ava" | "colleagues";
  onTabChange: (tab: "ava" | "colleagues") => void;
}

export function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <Tabs 
      value={activeTab} 
      onValueChange={(value) => onTabChange(value as "ava" | "colleagues")} 
      className="w-full"
    >
      <TabsList className="w-full grid grid-cols-2 bg-blue-100/50 p-0 h-auto">
        <TabsTrigger 
          value="ava" 
          className={`py-2.5 rounded-none text-sm font-medium transition-colors ${
            activeTab === "ava" 
              ? "bg-white text-blue-800 shadow-sm" 
              : "text-blue-900/70 hover:text-blue-900 hover:bg-blue-100"
          }`}
        >
          AVA – Hilfe & Wissen
        </TabsTrigger>
        <TabsTrigger 
          value="colleagues" 
          className={`py-2.5 rounded-none text-sm font-medium transition-colors ${
            activeTab === "colleagues" 
              ? "bg-white text-blue-800 shadow-sm" 
              : "text-blue-900/70 hover:text-blue-900 hover:bg-blue-100"
          }`}
        >
          Chat mit Kolleg:innen
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
