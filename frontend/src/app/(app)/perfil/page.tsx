"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Shield, LifeBuoy, FileText, ChevronRight, LogOut, Pencil } from "lucide-react";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/lib/auth-context";
import { boards as boardsApi } from "@/lib/api";
import type { Board } from "@/lib/types";

const menuItems = [
  { icon: Bell, label: "Notificaciones" },
  { icon: Shield, label: "Privacidad" },
  { icon: LifeBuoy, label: "Ayuda" },
  { icon: FileText, label: "Términos y condiciones" },
];

export default function PerfilPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [boardsList, setBoardsList] = useState<Board[]>([]);

  useEffect(() => {
    boardsApi.list().then(setBoardsList).catch(() => {});
  }, []);

  const boardsCount = boardsList.length;
  const outfitsCount = boardsList.reduce(
    (acc, b) => acc + (b.outfits?.length || 0),
    0
  );

  const handleLogout = () => {
    logout();
    router.push(ROUTES.home);
  };

  return (
    <div className="h-full flex items-center justify-center px-[120px] py-8">
      <div className="w-[720px] bg-white rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] p-12 flex flex-col items-center gap-8">
        {/* Avatar */}
        <div className="w-24 h-24 rounded-full bg-accent-red text-white font-bold text-[32px] flex items-center justify-center">
          {user?.avatarInitial || "?"}
        </div>

        {/* Info */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-playfair text-[28px] font-bold text-text-primary">
            {user?.name}
          </h1>
          <p className="text-[15px] text-text-secondary">{user?.email}</p>
          <button className="flex items-center gap-1.5 px-5 py-2 rounded-lg border border-accent-red text-accent-red text-[13px] mt-1 hover:bg-accent-red-light transition-colors">
            <Pencil className="w-3.5 h-3.5" />
            Editar perfil
          </button>
        </div>

        {/* Stats Row */}
        <div className="w-full grid grid-cols-3 gap-4">
          {[
            { value: boardsCount, label: "Tableros" },
            { value: outfitsCount, label: "Outfits" },
            { value: 0, label: "Prendas" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-1 bg-[#F8F8F8] rounded-xl p-5"
            >
              <span className="text-[24px] font-bold text-text-primary">
                {stat.value}
              </span>
              <span className="text-[13px] text-text-secondary">
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        {/* Options */}
        <div className="w-full bg-[#F8F8F8] rounded-xl overflow-hidden">
          {menuItems.map((item, i) => (
            <div key={item.label}>
              {i > 0 && <div className="h-px bg-[#EAEAEA]" />}
              <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <item.icon className="w-[18px] h-[18px] text-text-secondary" />
                  <span className="text-[14px] text-text-primary">
                    {item.label}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-text-tertiary" />
              </button>
            </div>
          ))}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-accent-red text-[14px] font-medium px-6 py-3 rounded-lg hover:bg-accent-red-light transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
