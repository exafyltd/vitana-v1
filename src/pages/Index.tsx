import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEO from "@/components/SEO";

const Index = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redirect to dashboard for authenticated users, or to login for new users
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  return (
    <SEO title="VITANA – Digital Solutions" description="Welcome to VITANA. Experience innovation and excellence with our cutting-edge platform." canonical={window.location.href} />
  );
};

export default Index;
