
import { Navigate } from "react-router-dom";

// This component redirects the user from the old URL to the new URL
const LiveAgentOverviewRedirect = () => {
  return <Navigate to="/supervisor/live-agents" replace />;
};

export default LiveAgentOverviewRedirect;
