import "example-ui/layout.css";
import type { Metadata } from "next";
import "universa-ui/styles.css";

export const metadata: Metadata = {
  title: "Demo — Next.js",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
