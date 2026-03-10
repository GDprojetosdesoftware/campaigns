"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        // Por padrão o sistema foi feito em dark mode, então forçamos dark no início
        const hasDarkClass = document.documentElement.classList.contains("dark");
        if (!hasDarkClass) {
            document.documentElement.classList.add("dark");
        }
    }, []);

    const toggle = () => {
        if (isDark) {
            document.documentElement.classList.remove("dark");
            setIsDark(false);
        } else {
            document.documentElement.classList.add("dark");
            setIsDark(true);
        }
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
