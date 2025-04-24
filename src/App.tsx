
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { Toaster } from "@/components/ui/toaster";
import { SupervisorChatProvider } from '@/contexts/SupervisorChatContext';

// Remove the ReactQueryDevtools import since it's causing issues
// and create the ThemeProvider if it doesn't exist

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SupervisorChatProvider>
          <RouterProvider router={router} />
          <Toaster />
        </SupervisorChatProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
