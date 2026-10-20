import type { Metadata, Viewport } from "next";
import Nav from "@/components/Nav";
import VisitPrompt from "@/components/VisitPrompt";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friendly Restaurant",
  description: "Restaurant reviews only from people you actually know. No fake reviews.",
  appleWebApp: { capable: true, title: "Friendly", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#f2622e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body>
        <Nav signedIn={!!user} />
        <main className="mx-auto max-w-3xl px-4 pt-4 pb-24 sm:pb-10">{children}</main>
        {user && <VisitPrompt />}
      </body>
    </html>
  );
}
