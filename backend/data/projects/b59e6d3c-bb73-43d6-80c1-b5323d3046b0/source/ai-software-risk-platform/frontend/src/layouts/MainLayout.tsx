import type { PropsWithChildren } from "react";

import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function MainLayout({ children }: PropsWithChildren) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
