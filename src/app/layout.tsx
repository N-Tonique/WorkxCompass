import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SD Worx Knowledge Compass",
};

export default function RootLayout({ children }: Readonly<LayoutProps<"/">>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
