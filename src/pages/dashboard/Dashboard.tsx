// This file is just to maintain the route structure
// The actual Dashboard functionality is in src/pages/Dashboard.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function DashboardRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);
  
  return null;
}