"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("selectedPizza");
    setCartCount(saved ? 1 : 0);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-organic-bg/90 backdrop-blur-xl border-b border-zinc-800/60 shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
              <span className="text-white font-bold text-sm">DP</span>
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">
              Diet<span className="text-accent">Pizza</span>
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link
              href="/menu"
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Menu
            </Link>
            <Link
              href="/order"
              className="text-zinc-400 hover:text-white text-sm font-medium transition-colors"
            >
              Order
            </Link>

            <Link
              href="/menu"
              className="relative flex items-center gap-2 btn-primary text-sm py-2 px-4"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-glow-sm">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
