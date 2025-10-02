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

// Check if string is a valid UUID
const isUuid = (id: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

// Clean and validate handle format
const toCleanHandle = (id: string): string | null => {
  const cleaned = id.startsWith('@') ? id.slice(1) : id;
  return /^[a-z0-9_-]{2,25}$/i.test(cleaned) ? cleaned : null;
};

export default function LegacyProfileRedirect() {
  const { id } = useParams();
  
  if (!id) {
    return <NotFound />;
  }
  
  // Try legacy mapping first
  const handle = legacyIdToHandle(id);
  if (handle) {
    return <Navigate to={`/u/${handle}`} replace />;
  }
  
  // Handle UUIDs (modern user IDs)
  if (isUuid(id)) {
    return <Navigate to={`/u/${id}`} replace />;
  }
  
  // Handle clean handles
  const cleanHandle = toCleanHandle(id);
  if (cleanHandle) {
    return <Navigate to={`/u/${cleanHandle}`} replace />;
  }
  
  return <NotFound />;
}