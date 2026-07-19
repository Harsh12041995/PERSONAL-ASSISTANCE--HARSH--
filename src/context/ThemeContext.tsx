"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";

type Theme = "light" | "dark";
// Skin is independent of light/dark: "classic" is the normal UI,
// "book" re-dresses the whole portal as an illustrated journal.
type Skin = "classic" | "book";

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  skin: Skin;
  toggleSkin: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setTheme] = useState<Theme>("light");
  const [skin, setSkin] = useState<Skin>("classic");
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // This code will only run on the client side
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const systemPrefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (systemPrefersDark ? "dark" : "light");
    const savedSkin = localStorage.getItem("skin") as Skin | null;

    setTheme(initialTheme);
    setSkin(savedSkin === "book" ? "book" : "classic");
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme, isInitialized]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("skin", skin);
      document.documentElement.classList.toggle("book", skin === "book");
    }
  }, [skin, isInitialized]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  const toggleSkin = () => {
    setSkin((prev) => (prev === "book" ? "classic" : "book"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, skin, toggleSkin }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
