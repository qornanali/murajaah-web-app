"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, BarChart2, User } from "lucide-react";

const navItems = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/library", icon: BookOpen, label: "Library" },
  { href: "/history", icon: BarChart2, label: "History" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-emerald-900/10 bg-white/85 backdrop-blur-md dark:border-emerald-100/10 dark:bg-emerald-950/85">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-5 py-2 transition-all duration-200 ${
                isActive
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-neutral-400 hover:text-neutral-500 dark:text-neutral-500 dark:hover:text-neutral-400"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-700/12 dark:bg-emerald-400/18"
                    : ""
                }`}
              >
                <Icon
                  className={`transition-all duration-200 ${
                    isActive ? "h-[22px] w-[22px]" : "h-5 w-5"
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
              </span>
              <span
                className={`text-[10px] leading-none transition-all duration-200 ${
                  isActive ? "font-semibold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
