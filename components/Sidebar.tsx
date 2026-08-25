"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useRef, useEffect } from "react";
import { Home, Library, Settings, LogOut, User } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isCollapsed = !isHovered && !menuOpen;

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Library", href: "/library", icon: Library },
  ];

  return (
    <aside 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`hidden md:flex flex-col fixed inset-y-0 left-0 bg-[#262421] text-[#c3c2c1] z-50 border-r border-[#363431] shadow-[0_0_15px_rgba(0,0,0,0.1)] transition-[width] duration-300 ease-in-out ${isCollapsed ? "w-16" : "w-40"}`}
    >
      
      {/* Brand Logo */}
      <div className={`flex items-center h-20 shrink-0 mb-4 mt-2 transition-all ${isCollapsed ? "justify-center px-0" : "px-5"}`}>
        <Link href="/" className="group flex items-center focus:outline-none" title="Toby">
          {isCollapsed ? (
            <span className="text-3xl font-black tracking-tighter text-[#81b64c] transition-colors group-hover:text-[#a3d16b]">
              T
            </span>
          ) : (
            <span className="text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-[#81b64c] to-[#a3d16b] transition-all group-hover:brightness-110">
              Toby
            </span>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-2 flex flex-col w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center gap-3 py-3 text-sm font-bold transition-all focus:outline-none overflow-hidden ${
                isCollapsed ? "justify-center px-0" : "px-4"
              } ${
                isActive 
                  ? `bg-[#1f1d1b] border-l-4 border-[#81b64c] text-white ${isCollapsed ? "" : "pl-[12px]"}` 
                  : `border-l-4 border-transparent hover:bg-[#363431] hover:text-white`
              }`}
            >
              <item.icon className="size-[22px] shrink-0" strokeWidth={2.5} />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Auth Section at Bottom */}
      <div className={`p-3 shrink-0 flex flex-col gap-2 mb-2 transition-all ${isCollapsed ? "items-center px-2" : ""}`}>
        {loading ? (
          <div className={`h-10 animate-pulse rounded bg-[#363431] ${isCollapsed ? "w-full" : "w-full"}`} />
        ) : !user ? (
          <Link
            href="/login"
            title={isCollapsed ? "Sign in" : undefined}
            className={`flex items-center justify-center rounded bg-[#81b64c] py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#8bc34f] focus:outline-none ${isCollapsed ? "px-0 w-10 h-10" : "w-full px-4"}`}
          >
            {isCollapsed ? <User size={20} /> : "Sign in"}
          </Link>
        ) : (
          <div className="relative w-full" ref={menuRef}>
            {menuOpen && (
              <div className={`absolute bottom-full mb-2 w-48 rounded bg-[#363431] py-1 border border-[#454341] shadow-xl overflow-hidden z-50 ${isCollapsed ? "left-12" : "left-0"}`}>
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm font-bold text-[#c3c2c1] hover:bg-[#454341] hover:text-white transition-colors focus:outline-none"
                >
                  <Settings className="h-4 w-4" strokeWidth={2.5} />
                  Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-left text-sm font-bold text-[#c3c2c1] hover:bg-[#454341] hover:text-white transition-colors focus:outline-none"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.5} />
                  Sign Out
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              title={isCollapsed ? (user.displayName || user.email) : undefined}
              className={`flex items-center w-full rounded p-2 transition-colors focus:outline-none ${
                menuOpen 
                  ? "bg-[#363431]" 
                  : "hover:bg-[#363431]"
              } ${isCollapsed ? "justify-center gap-0" : "gap-2.5"}`}
            >
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-sm object-cover shrink-0" />
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#454341] text-xs font-bold text-white">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                </span>
              )}
              {!isCollapsed && (
                <div className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-xs font-bold text-[#c3c2c1] group-hover:text-white leading-tight">
                    {user.displayName || user.email.split("@")[0]}
                  </span>
                </div>
              )}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
