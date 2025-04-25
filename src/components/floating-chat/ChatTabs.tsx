
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChatTabsProps {
  activeTab: "ava" | "colleagues";
  onTabChange: (tab: "ava" | "colleagues") => void;
}

export function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "ava" | "colleagues")} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="ava" className="flex-1">
          AVA – Hilfe & Wissen
        </TabsTrigger>
        <TabsTrigger value="colleagues" className="flex-1">
          Chat mit Kolleg:innen
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
