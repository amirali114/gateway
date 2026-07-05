import { RawJsonDrawer } from "./RawJsonDrawer";
export function JsonPanel({ data }: { data: unknown }) { return <RawJsonDrawer data={data} />; }
