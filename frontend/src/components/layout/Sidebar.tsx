"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/inicio", label: "Inicio" },
  { href: "/tableros", label: "Mis tableros" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside className="w-[220px] h-screen fixed left-0 top-0 bg-white flex flex-col justify-between py-8 px-6 z-50 shadow-[2px_0_8px_rgba(0,0,0,0.04)]">
      <div>
        <Link href={ROUTES.inicio}>
          <h1 className="font-playfair text-[22px] font-bold text-text-primary">
            OutfitBase
          </h1>
        </Link>

        <nav className="mt-8 flex flex-col gap-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/inicio"
                ? pathname === "/inicio"
                : pathname.startsWith(link.href) ||
                  pathname.startsWith("/prendas");

            return (
              <Link
                key={link.href}
                href={link.href === "/tableros" ? ROUTES.inicio : link.href}
                className={cn(
                  "text-[14px] rounded-lg px-3 py-2.5 transition-colors",
                  isActive
                    ? "bg-accent-red-light text-accent-red"
                    : "text-text-secondary hover:bg-bg-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Link
        href={ROUTES.perfil}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-red text-white text-sm"
      >
        {user?.avatarInitial || "?"}
      </Link>
    </aside>
  );
}
