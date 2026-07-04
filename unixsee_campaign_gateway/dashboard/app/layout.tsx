import "./globals.css";

export const metadata = {
  title: "Unixsee Gateway Control",
  description: "Mother-backed controlled beta dashboard for Unixsee Campaign Gateway."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" dir="ltr"><body>{children}</body></html>;
}
