
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatTabsProps {
  activeTab: "ava" | "colleagues";
  onTabChange: (tab: "ava" | "colleagues") => void;
}

export function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "ava" | "colleagues")} className="w-full">
      <TabsList className="w-full grid grid-cols-2 bg-blue-100/50">
        <TabsTrigger 
          value="ava" 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === "ava" ? "bg-white text-blue-800" : "text-blue-900/70 hover:text-blue-900"}`}
        >
          AVA – Hilfe & Wissen
        </TabsTrigger>
        <TabsTrigger 
          value="colleagues" 
          className={`flex-1 py-2 text-sm font-medium ${activeTab === "colleagues" ? "bg-white text-blue-800" : "text-blue-900/70 hover:text-blue-900"}`}
        >
          Chat mit Kolleg:innen
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
