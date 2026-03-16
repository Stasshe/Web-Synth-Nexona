import { useEffect } from "react";

/**
 * Global scroll lock + selection-friendly handlers.
 * Keeps the original behavior of preventing page-level scrolling while allowing
 * scrolling/selecting inside editable/selectable areas (inputs, contentEditable,
 * elements with user-select enabled, or native scrollable containers).
 */
export function useGlobalScrollLock() {
  // Force-disable page-level scroll via inline styles on html/body
  useEffect(() => {
    if (typeof window === "undefined") return;
    const html = document.documentElement as HTMLElement;
    const body = document.body as HTMLElement;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.height = "100vh";
    body.style.height = "100vh";
    html.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow || "";
      body.style.overflow = prev.bodyOverflow || "";
      html.style.height = prev.htmlHeight || "";
      body.style.height = prev.bodyHeight || "";
      html.style.overscrollBehavior = prev.htmlOverscroll || "";
    };
  }, []);

  // Prevent wheel/touch/key page-level scrolling but allow scrolling/selecting
  // inside editable/selectable areas.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isScrollable = (el: Element | null) => {
      let elCur: Element | null = el;
      while (elCur && elCur !== document.documentElement) {
        try {
          const style = window.getComputedStyle(elCur as Element);
          const overflowY = style.overflowY;
          const isScroll =
            overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";
          if (
            isScroll &&
            (elCur as HTMLElement).scrollHeight > (elCur as HTMLElement).clientHeight
          ) {
            return true;
          }
        } catch (_e) {
          // ignore
        }
        elCur = elCur.parentElement;
      }
      return false;
    };

    const isSelectable = (el: Element | null) => {
      let elCur: Element | null = el;
      while (elCur && elCur !== document.documentElement) {
        try {
          const asEl = elCur as HTMLElement;
          const tag = (asEl.tagName || "").toLowerCase();
          if (tag === "input" || tag === "textarea" || tag === "select") return true;
          if (asEl.isContentEditable) return true;
          const style = window.getComputedStyle(asEl);
          const userSelect = style.userSelect || (style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect;
          if (userSelect && userSelect !== "none") return true;
        } catch (_e) {
          // ignore
        }
        elCur = elCur.parentElement;
      }
      return false;
    };

    const wheelHandler = (e: WheelEvent) => {
      // If another handler already called preventDefault, don't interfere.
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;

      if (!isScrollable(target) && !isSelectable(target)) {
        e.preventDefault();
      }
    };

    const touchMove = (e: TouchEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as Element | null;

      if (!isScrollable(target) && !isSelectable(target)) {
        e.preventDefault();
      }
    };

    const keyHandler = (e: KeyboardEvent) => {
      const keysToBlock = ["PageDown", "PageUp", "ArrowDown", "ArrowUp", " ", "Home", "End"];
      if (!keysToBlock.includes(e.key)) return;
      const active = document.activeElement as Element | null;
      // Allow normal behavior inside editable fields or scrollable elements
      
      // previously we filtered out editor internals; that logic has been removed

      if (active) {
        const tag = (active.tagName || "").toLowerCase();
        const isEditable =
          tag === "input" || tag === "textarea" || (active as HTMLElement).isContentEditable;
        if (isEditable) return;
        if (isScrollable(active)) return;
      }
      e.preventDefault();
    };

    // Use bubble phase so inner components (like Monaco) get first chance to handle events.
    window.addEventListener("wheel", wheelHandler as EventListener, { passive: false, capture: false });
    window.addEventListener("touchmove", touchMove as EventListener, { passive: false, capture: false });
    window.addEventListener("keydown", keyHandler as EventListener, { passive: false, capture: false });

    return () => {
      window.removeEventListener("wheel", wheelHandler as EventListener);
      window.removeEventListener("touchmove", touchMove as EventListener);
      window.removeEventListener("keydown", keyHandler as EventListener);
    };
  }, []);
}

export default useGlobalScrollLock;
