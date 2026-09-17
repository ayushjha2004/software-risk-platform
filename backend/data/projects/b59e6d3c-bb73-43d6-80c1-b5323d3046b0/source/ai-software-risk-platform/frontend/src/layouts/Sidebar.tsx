import { NavLink } from "react-router-dom";

import type { NavItem } from "../types/navigation";

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Repository Analysis", path: "/repository-analysis" },
  { label: "Risk Analysis", path: "/risk-analysis" },
  { label: "Settings", path: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-surface-border bg-surface-raised md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-surface-border px-5">
        <div className="h-6 w-6 rounded bg-brand" />
        <span className="text-sm font-semibold tracking-tight text-slate-100">Risk Platform</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              [
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand/15 text-brand"
                  : "text-slate-400 hover:bg-surface-border/60 hover:text-slate-100",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-surface-border px-5 py-4 text-xs text-slate-500">
        Phase 1 &middot; Foundation
      </div>
    </aside>
  );
}
