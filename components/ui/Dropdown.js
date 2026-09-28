"use client";
import { useEffect, useLayoutEffect, useRef, useState, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const GAP = 4; // px between the button and the menu
const EDGE = 8; // px kept clear of the viewport edges

/**
 * Menu button. Esc closes, click-outside closes, arrow keys move between items.
 * The menu is rendered on top of the page (not inside its container), so it is never clipped by a scrolling table or
 * card, and it opens upwards when there is no room below.
 */
export function Dropdown({ trigger, items, align = "right", label = "Menu", block = false }) {
  const [open, setOpen] = useState(false);
  const button = useRef(null);
  const menu = useRef(null);
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = button.current.getBoundingClientRect();
      const m = menu.current.getBoundingClientRect();
      const below = b.bottom + GAP;
      const fitsBelow = below + m.height <= window.innerHeight - EDGE;
      const top = fitsBelow || b.top - GAP - m.height < EDGE ? Math.min(below, Math.max(EDGE, window.innerHeight - EDGE - m.height)) : b.top - GAP - m.height;
      const left = align === "right" ? b.right - m.width : b.left;
      // Written straight to the element: it is measured and placed before the browser paints, so it never flashes elsewhere.
      Object.assign(menu.current.style, { top: `${top}px`, left: `${Math.min(Math.max(EDGE, left), Math.max(EDGE, window.innerWidth - EDGE - m.width))}px`, visibility: "visible" });
    };
    place();
    const close = () => setOpen(false);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", close, true); // the button moved: a floating menu would be left behind
    return () => { window.removeEventListener("resize", place); window.removeEventListener("scroll", close, true); };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !button.current?.contains(e.target) && !menu.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    menu.current?.querySelector("[role=menuitem]")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const onMenuKey = (e) => {
    const nodes = [...menu.current.querySelectorAll("[role=menuitem]")];
    const i = nodes.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); nodes[(i + 1) % nodes.length]?.focus(); }
    if (e.key === "ArrowUp") { e.preventDefault(); nodes[(i - 1 + nodes.length) % nodes.length]?.focus(); }
    if (e.key === "Tab") setOpen(false);
  };

  return (
    <div className={cn("relative text-left", block ? "block" : "inline-block")}>
      <button ref={button} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined} onClick={() => setOpen((o) => !o)}
        className={cn("min-h-11 min-w-11 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 active:bg-slate-200 sm:min-h-0 sm:min-w-0", block ? "flex w-full" : "inline-flex")}>{trigger}</button>
      {open && createPortal(
        <div ref={menu} id={menuId} role="menu" onKeyDown={onMenuKey} style={{ top: 0, left: 0, visibility: "hidden" }}
          className="animate-pop fixed z-50 max-h-[calc(100dvh-1rem)] min-w-52 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-xl border border-line bg-white p-1 text-left shadow-lg">
          {items.filter(Boolean).map((it) => (
            <button key={it.label} role="menuitem" type="button" onClick={() => { setOpen(false); it.onClick(); }}
              className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 focus:bg-slate-100 focus:outline-none active:bg-slate-200 sm:min-h-0 sm:gap-2", it.danger && "text-red-600")}>
              {it.icon && <it.icon className="size-4" aria-hidden />}{it.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
