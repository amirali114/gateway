import { RawJsonDrawer } from "./RawJsonDrawer";
export function JsonPreview({ data, title }: { data: unknown; title?: string }) { return <RawJsonDrawer data={data} title={title} />; }
