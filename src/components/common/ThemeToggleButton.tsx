import React from "react";
import { useTheme } from "../../context/ThemeContext";

/** One-click switch between the classic UI and the illustrated Book skin. */
export const BookToggleButton: React.FC = () => {
    const { skin, toggleSkin } = useTheme();
    const active = skin === "book";

    return (
        <button
            onClick={toggleSkin}
            aria-pressed={active}
            aria-label={active ? "Switch to classic look" : "Switch to book look"}
            title={active ? "Classic look" : "Book look"}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-all ${active
                ? "text-amber-700 bg-amber-50 border-amber-300 shadow-inner dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700"
                : "text-gray-500 bg-white border-gray-200 hover:text-violet-600 hover:border-violet-100 hover:bg-violet-50 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-violet-400 dark:hover:bg-gray-800"
                }`}
        >
            {/* Open book icon */}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.25 C 10.5 4.75, 8 4 5.5 4 C 4.5 4, 3.5 4.15, 2.75 4.4 V 18.4 C 3.5 18.15, 4.5 18 5.5 18 C 8 18, 10.5 18.75, 12 20.25 C 13.5 18.75, 16 18 18.5 18 C 19.5 18, 20.5 18.15, 21.25 18.4 V 4.4 C 20.5 4.15, 19.5 4 18.5 4 C 16 4, 13.5 4.75, 12 6.25 Z M 12 6.25 V 20.25" />
            </svg>
        </button>
    );
};

export const ThemeToggleButton: React.FC = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
            className="flex items-center justify-center w-10 h-10 text-gray-500 bg-white border border-gray-200 rounded-lg hover:text-violet-600 hover:border-violet-100 hover:bg-violet-50 transition-all dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400 dark:hover:text-violet-400 dark:hover:bg-gray-800"
        >
            {isDark ? (
                // Sun icon (click → light)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m15.364 6.364l-1.06-1.06M6.697 6.697l-1.061-1.06m12.728 0l-1.061 1.06M6.697 17.303l-1.061 1.061M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
            ) : (
                // Moon icon (click → dark)
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            )}
        </button>
    );
};
