
import { createBrowserRouter } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import ProcessingTime from "./pages/supervisor/ProcessingTime";
import ProcessingTimeRedirect from "./pages/admin/ProcessingTime";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

// Import all the pages your application uses
// This is just a basic router setup - add more routes as needed

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Landing />,
  },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "/supervisor/processing-time",
        element: (
          <ProtectedRoute allowedRoles={["admin", "agent"]}>
            <ProcessingTime />
          </ProtectedRoute>
        ),
      },
      {
        path: "/admin/processing-time",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <ProcessingTimeRedirect />
          </ProtectedRoute>
        ),
      },
      // Add more routes here as needed for your application
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
]);
