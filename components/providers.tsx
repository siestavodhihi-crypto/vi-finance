"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/auth/auth-provider";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyThemeClass(mode: ThemeMode) {
  const root = document.documentElement;
  const isDark =
    mode === "dark" ||
    (mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = localStorage.getItem("vi-theme");
    return saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
  });

  useEffect(() => {
    applyThemeClass(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") applyThemeClass("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("vi-theme", next);
      applyThemeClass(next);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <AuthProvider>{children}</AuthProvider>
      <Toaster
        richColors
        position="top-right"
        toastOptions={{
          style: { fontFamily: "Be Vietnam Pro, system-ui, sans-serif" },
        }}
      />
    </ThemeContext.Provider>
  );
}
