"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services";
import { Download, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, ScanFace, WifiOff } from "lucide-react";
import { useAuthStore, hasPermission } from "@/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { useLogout } from "@/features/auth/useAuth";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { IosInstallHelp, useInstall } from "@/features/pwa/InstallApp";
import { CompanyLogo } from "@/components/brand/CompanyLogo";
import { ConfirmDialog, Drawer, IconButton } from "@/components/ui";
import { useOnline } from "@/hooks/useOnline";
import { cn } from "@/lib/utils";

const isActive = (pathname, item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));

// The sidebar changes width; text next to icons fades rather than popping in and out.
const SLIDE = "transition-[width,padding] duration-300 ease-in-out motion-reduce:transition-none";
const FADE = "transition-opacity duration-200 ease-in-out motion-reduce:transition-none";

const compact = (n) => (n > 999 ? `${Math.floor(n / 100) / 10}k` : String(n));

function NavList({ items, pathname, collapsed, onNavigate, counts }) {
  return (
    <nav aria-label="Main" className="space-y-1 p-3">
      {items.map((item) => {
        const active = isActive(pathname, item);
        const n = item.count ? counts?.[item.count] : undefined;
        const has = typeof n === "number";
        const meaning = has ? `${n} ${item.countLabel}` : undefined;
        return (
          <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} title={collapsed ? [item.label, meaning].filter(Boolean).join(" · ") : meaning}
            className={cn("flex min-h-12 items-center overflow-hidden whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors lg:min-h-0 lg:rounded-lg", active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-slate-100 hover:text-ink active:bg-slate-200")}>
            <span className="relative shrink-0">
              <item.icon className="size-5" aria-hidden />
              {has && n > 0 && <span aria-hidden className={cn(FADE, "absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white", !collapsed && "opacity-0")}>{compact(n)}</span>}
            </span>
            <span className={cn(FADE, "min-w-0 flex-1 truncate pl-3", collapsed && "opacity-0")}>{item.label}</span>
            {has && <span aria-hidden className={cn(FADE, "ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-600", collapsed && "opacity-0")}>{compact(n)}</span>}
            {has && <span className="sr-only">, {meaning}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Company users see their own logo and name; the platform admin sees the AMS mark.
 * Collapsed, the logo itself is the expand button: hovering (or focusing) it turns it into the expand icon.
 */
function Brand({ collapsed, onToggle }) {
  const company = useAuthStore((s) => s.user?.company);
  const mark = company
    ? <CompanyLogo company={company} size="size-9" />
    : <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white"><ScanFace className="size-5" aria-hidden /></span>;
  const name = company?.name ?? "AMS";
  return (
    <div className="flex h-16 shrink-0 items-center overflow-hidden whitespace-nowrap border-b border-line pl-[18px] pr-2">
      {collapsed ? (
        <button type="button" onClick={onToggle} aria-label="Expand sidebar" title="Expand sidebar" className="group relative grid size-9 shrink-0 place-items-center rounded-xl">
          <span className={cn(FADE, "group-hover:opacity-0 group-focus-visible:opacity-0")}>{mark}</span>
          <span aria-hidden className={cn(FADE, "absolute inset-0 grid place-items-center rounded-xl bg-slate-100 text-ink opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100")}><PanelLeftOpen className="size-5" /></span>
        </button>
      ) : (
        <Link href="/" aria-label={name} className="shrink-0">{mark}</Link>
      )}
      <Link href="/" tabIndex={collapsed ? -1 : undefined} aria-hidden={collapsed || undefined} className={cn(FADE, "min-w-0 flex-1 truncate pl-2.5 font-semibold", collapsed && "pointer-events-none opacity-0")}>{name}</Link>
      {!collapsed && onToggle && <IconButton label="Collapse sidebar" icon={PanelLeftClose} onClick={onToggle} className="shrink-0" />}
    </div>
  );
}

/**
 * What used to sit in a top header, now one compact row at the foot of the sidebar (and of the phone menu):
 * who is signed in, notifications and sign out — all in reach without opening a menu.
 */
function SidebarFooter({ collapsed = false }) {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { canInstall, install, help, closeHelp } = useInstall();
  const [confirming, setConfirming] = useState(false);
  const role = user?.role?.replaceAll("_", " ").toLowerCase();
  return (
    <div className={cn("flex items-center gap-1 border-t border-line p-2", collapsed && "flex-col")}>
      <span title={collapsed ? `${user?.name} · ${role}` : undefined} className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{user?.name?.[0]?.toUpperCase()}</span>
      {!collapsed && <span className="min-w-0 flex-1 pl-1 text-sm leading-tight"><span className="block truncate font-medium">{user?.name}</span><span className="block truncate text-xs capitalize text-muted">{role}</span></span>}
      {canInstall && <IconButton label="Install app" icon={Download} onClick={install} />}
      <NotificationBell />
      <IconButton label="Sign out" icon={LogOut} onClick={() => setConfirming(true)} className="hover:bg-red-50 hover:text-red-600" />
      <ConfirmDialog open={confirming} onClose={() => setConfirming(false)} loading={logout.isPending} onConfirm={() => logout.mutate()} confirmLabel="Sign out"
        title="Sign out?" message={`You are signed in as ${user?.name ?? "this account"}. You will need your password to sign in again.`} />
      <IosInstallHelp open={help} onClose={closeHelp} />
    </div>
  );
}

/**
 * `tabs`: hrefs (max 4) shown in a phone bottom bar next to a "More" button that opens the full menu.
 * Above `lg` the sidebar is used instead.
 */
export function AppShell({ nav, children, tabs = [] }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const { sidebarCollapsed, toggleSidebar, mobileNavOpen, setMobileNav } = useUiStore();
  const online = useOnline();
  const counts = useQuery({ queryKey: ["menu-counts"], queryFn: dashboardService.menuCounts, refetchInterval: 60_000, refetchOnWindowFocus: true }).data?.data;
  const items = nav.filter((i) => !i.permission || hasPermission(user, i.permission));
  const tabItems = tabs.map((href) => items.find((i) => i.href === href)).filter(Boolean);
  const hasTabs = tabItems.length > 0;

  return (
    <div className="min-h-dvh">
      <aside className={cn("fixed inset-y-0 left-0 z-20 hidden flex-col border-r border-line bg-surface lg:flex", SLIDE, sidebarCollapsed ? "w-[72px]" : "w-64")}>
        <Brand collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="flex-1 overflow-y-auto overflow-x-hidden"><NavList items={items} pathname={pathname} collapsed={sidebarCollapsed} counts={counts} /></div>
        <SidebarFooter collapsed={sidebarCollapsed} />
      </aside>

      <Drawer open={mobileNavOpen} onClose={() => setMobileNav(false)} title="Menu">
        {/* Phones have no sidebar: this menu is the sidebar, so it carries the same footer. */}
        <div className="-m-5 flex min-h-[calc(100dvh-4.5rem)] flex-col">
          <div className="flex items-center gap-2.5 border-b border-line px-5 py-3">
            <CompanyLogo company={user?.company ?? { name: "AMS" }} size="size-9" />
            <span className="truncate font-semibold">{user?.company?.name ?? "Platform admin"}</span>
          </div>
          <div className="flex-1"><NavList items={items} pathname={pathname} counts={counts} onNavigate={() => setMobileNav(false)} /></div>
          <SidebarFooter />
        </div>
      </Drawer>

      <div className={cn("flex min-h-dvh flex-col", SLIDE, sidebarCollapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        {!online && <div role="alert" className="safe-top sticky top-0 z-10 flex items-center justify-center gap-2 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900"><WifiOff className="size-3.5" aria-hidden />You&apos;re offline — changes can&apos;t be saved until you reconnect.</div>}
        <main id="main" className={cn("mx-auto w-full max-w-7xl flex-1 pb-4 pt-[max(1rem,env(safe-area-inset-top))] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] sm:p-6", hasTabs && "pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-6")}>{children}</main>
      </div>

      {hasTabs && (
        <nav aria-label="Quick navigation" style={{ gridTemplateColumns: `repeat(${Math.min(tabItems.length, 4) + 1}, minmax(0, 1fr))` }} className="safe-x fixed inset-x-0 bottom-0 z-20 grid border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">
          {tabItems.slice(0, 4).map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors active:bg-slate-100", active ? "text-brand-700" : "text-muted")}>
                <span className={cn("relative grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-50")}>
                  <item.icon className="size-5" aria-hidden />
                  {item.count && counts?.[item.count] > 0 && <span className="absolute -top-1 right-0 grid h-4 min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-none text-white">{compact(counts[item.count])}<span className="sr-only"> {item.countLabel}</span></span>}
                </span>
                {item.label.split(" ")[0]}
              </Link>
            );
          })}
          <button type="button" onClick={() => setMobileNav(true)} aria-haspopup="dialog"
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted transition-colors active:bg-slate-100">
            <span className="grid h-7 w-12 place-items-center rounded-full"><MoreHorizontal className="size-5" aria-hidden /></span>More
          </button>
        </nav>
      )}
    </div>
  );
}
