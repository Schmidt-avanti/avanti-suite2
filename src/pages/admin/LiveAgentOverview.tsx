
import { Navigate } from "react-router-dom";

const LiveAgentOverviewRedirect = () => {
  return <Navigate to="/supervisor/live-agents" replace />;
};

export default LiveAgentOverviewRedirect;
