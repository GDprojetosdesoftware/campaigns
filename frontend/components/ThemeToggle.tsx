"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;

    const isDark = theme === "dark";

    const toggle = () => {
        setTheme(isDark ? "light" : "dark");
    };

    return (
        <button
            onClick={toggle}
            className="fixed bottom-4 right-4 p-3 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-100 shadow-xl transition-all hover:scale-105 z-50 flex items-center justify-center"
            title="Alternar Tema (Light/Dark)"
        >
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-blue-400" />}
        </button>
    );
}

