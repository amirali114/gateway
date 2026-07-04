export function ErrorState({ title = "Unable to load data", error }: { title?: string; error?: string }) {
  return <div className="error-state"><strong>{title}</strong><p>{error || "The service is unavailable or returned an invalid response."}</p></div>;
}
