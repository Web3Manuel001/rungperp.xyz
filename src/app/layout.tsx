import "./globals.css";
import { AppWalletProvider } from "@/components/WalletProvider";

export const metadata = {
  title: "Rung | Scale Perpetuals Terminal",
  description: "High-speed scale execution & yield-backed perpetuals on Solana",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-neutral-100 min-h-screen">
        <AppWalletProvider>
          {children}
        </AppWalletProvider>
      </body>
    </html>
  );
}
