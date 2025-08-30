import { useParams, Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// Legacy ID to handle mapping based on existing mock data
const legacyIdToHandle = (id: string): string | null => {
  const mapping: Record<string, string> = {
    '1': 'sarahwellness',
    '2': 'dr-roberts', 
    '3': 'maxina',
    '4': 'emmawilson',
    '5': 'jamesdavis',
  };
  return mapping[id] || null;
};

export default function LegacyProfileRedirect() {
  const { id } = useParams();
  
  if (!id) {
    return <NotFound />;
  }
  
  const handle = legacyIdToHandle(id);
  
  if (handle) {
    return <Navigate to={`/u/${handle}`} replace />;
  }
  
  return <NotFound />;
}