/**
 * `/commerce/connections/:id` predates the one-screen portal (VTID-03882).
 * Links to it exist in PR comments, emails and bookmarks, so it keeps working —
 * it just lands on the portal with that connection's drawer already open.
 */
import { Navigate, useParams } from 'react-router-dom';

export default function CommerceConnectionRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/commerce?connection=${encodeURIComponent(id)}` : '/commerce'} replace />;
}
