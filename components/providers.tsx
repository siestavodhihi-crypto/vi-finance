"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          style: { fontFamily: "Be Vietnam Pro, system-ui, sans-serif" },
        }}
      />
    </ThemeProvider>
  );
}
