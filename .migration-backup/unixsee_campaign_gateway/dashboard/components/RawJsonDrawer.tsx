export function RawJsonDrawer({ data, title = "Raw response" }: { data: unknown; title?: string }) {
  return (
    <details className="raw-json">
      <summary>{title}</summary>
      <pre className="json-pre">{JSON.stringify(data ?? null, null, 2)}</pre>
    </details>
  );
}
