// This file is just to maintain the route structure
// The actual Home functionality is in src/pages/Home.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HomeRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate("/home", { replace: true });
  }, [navigate]);
  
  return null;
}