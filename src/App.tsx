import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { AuthProvider } from "./contexts/AuthContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Toaster } from "@/components/ui/toaster";
import { SupervisorChatProvider } from '@/contexts/SupervisorChatContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <SupervisorChatProvider>
            <RouterProvider router={router} />
            <Toaster />
          </SupervisorChatProvider>
        </ThemeProvider>
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
