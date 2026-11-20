import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { LiquidNavbar, type LiquidNavItem, type NimbusFx } from "@/components/ui/liquid-glass-navbar";

function PortfolioPath({ items, initial }: { items: LiquidNavItem[]; initial: number }) {
  const [active, setActive] = useState(initial);

  useEffect(() => {
    if (items[0].href !== "#top") return;
    const sections = items.map(item => document.getElementById(item.href!.slice(1))!);
    let frame = 0;
    let followingAnchor = false;
    let settleTimer = 0;

    function syncScroll() {
      frame = 0;
      if (followingAnchor) return;
      const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 4;
      let index = 0;
      sections.forEach((section, i) => {
        if (section.getBoundingClientRect().top <= offset) index = i;
      });
      setActive(index);
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(syncScroll);
      if (followingAnchor) {
        clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => { followingAnchor = false; syncScroll(); }, 150);
      }
    }
    function syncHash() {
      const index = items.findIndex(item => item.href === location.hash);
      followingAnchor = index >= 0;
      if (followingAnchor) { setActive(index); onScroll(); }
      else syncScroll();
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    window.addEventListener("pageshow", syncHash);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("hashchange", syncHash);
      window.removeEventListener("pageshow", syncHash);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(settleTimer);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return <LiquidNavbar items={items} active={active} onChange={setActive} compact={false} />;
}

const root = document.getElementById("portfolio-path");
if (root) {
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>("a"));
  const items = links.map(link => ({
    label: link.textContent!.trim(),
    href: link.getAttribute("href")!,
    fx: link.dataset.fx as NimbusFx,
    icon: <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><use href={link.querySelector("use")!.getAttribute("href")!} /></svg>,
  }));
  createRoot(root).render(<PortfolioPath items={items} initial={links.findIndex(link => link.hasAttribute("aria-current"))} />);
}
