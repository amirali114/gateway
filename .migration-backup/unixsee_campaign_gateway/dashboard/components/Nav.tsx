import { Sidebar } from "./Sidebar";
export function Nav({ permissions }: { permissions: readonly string[] }) { return <Sidebar permissions={permissions} />; }
