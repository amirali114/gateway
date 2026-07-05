import { Sidebar } from "./Sidebar";
import { useAuth } from "@/contexts/AuthContext";

export function Nav() { 
  const { auth, logout } = useAuth();
  return <Sidebar permissions={auth?.permissions || []} username={auth?.username} role={auth?.role} onLogout={logout} />; 
}
