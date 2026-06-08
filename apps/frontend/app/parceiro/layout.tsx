// @ts-nocheck
"use client";

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PartnerProvider } from "@/contexts/partner-context";
import {
  LayoutDashboard,
  FolderOpen,
  DollarSign,
  Wallet,
  Building2,
  LogOut,
  ChevronRight,
  Share2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/partner/agencias", label: "Agências", icon: Building2 },
  { href: "/partner/projetos", label: "Projetos", icon: FolderOpen },
  { href: "/partner/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/partner/saques", label: "Saques", icon: Wallet },
];

function PartnerSidebar() {
  const { pathname } = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col z-30 shadow-xl">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg p-1.5">
            <Share2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">Portal</p>
            <p className="text-[10px] text-white/50 mt-0.5">Parceiro</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              to={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all group ${
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:bg-white/8 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active ? "text-blue-400" : "text-white/40 group-hover:text-white/70"}`}
              />
              {label}
              {active && (
                <ChevronRight className="h-3 w-3 ml-auto text-white/40" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 pb-4">
        <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all">
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}

export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PartnerProvider>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <PartnerSidebar />
        <main className="ml-56 min-h-screen">{children}</main>
      </div>
    </PartnerProvider>
  );
}
