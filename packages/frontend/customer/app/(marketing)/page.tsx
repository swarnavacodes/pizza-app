"use client";

import Link from "next/link";

export default function MarketingPage() {
  return (
    <section className="min-h-screen relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-4rem)]">
          {/* Left: Massive Typography */}
          <div className="pt-12 lg:pt-0">
            <div className="inline-flex items-center gap-2 badge-diet mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-accent rounded-full animate-glow-pulse" />
              Fresh & Organic
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[0.95] tracking-tight mb-6 animate-slide-up">
              Pizza That
              <br />
              Loves You
              <span className="block text-gradient">Back.</span>
            </h1>

            <p className="text-xl text-zinc-400 max-w-lg mb-8 text-balance animate-slide-up" style={{ animationDelay: "100ms" }}>
              Premium diet-friendly pizza made with fresh, organic ingredients.
              <span className="text-accent font-semibold"> Guilt-free.</span>{" "}
              Delicious. Delivered.
            </p>

            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: "200ms" }}>
              <Link href="/menu" className="btn-primary text-base">
                Explore Menu
              </Link>
              <Link href="/order" className="btn-outline text-base">
                Start Order
              </Link>
            </div>

            {/* Micro-nutrition badges */}
            <div className="flex flex-wrap gap-3 mt-10 animate-slide-up" style={{ animationDelay: "300ms" }}>
              {["Keto-Friendly", "Gluten-Free Options", "Low-Calorie", "Fresh Daily"].map(
                (badge) => (
                  <span key={badge} className="badge-diet text-[11px]">
                    {badge}
                  </span>
                ),
              )}
            </div>

            {/* Scroll Indicator */}
            <div className="mt-12 scroll-indicator">
              <svg className="w-6 h-6 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>

          {/* Right: Hero Visual */}
          <div className="relative hidden lg:flex flex-col items-center justify-center mb-12">
            {/* Steam lines */}
            <div className="steam-line absolute -top-6 left-1/2 -translate-x-4" style={{ animationDelay: "0s" }} />
            <div className="steam-line absolute -top-6 left-1/2" style={{ animationDelay: "0.5s" }} />
            <div className="steam-line absolute -top-6 left-1/2 translate-x-4" style={{ animationDelay: "1s" }} />

            {/* Pizza */}
            <div className="relative mb-4">
              <div className="pizza-crust">
                <div className="pizza-cheese">
                  {/* Pepperoni */}
                  <div className="pizza-topping bg-red-700" style={{ top: "20%", left: "25%" }} />
                  <div className="pizza-topping bg-red-700" style={{ top: "50%", left: "60%" }} />
                  <div className="pizza-topping bg-red-700" style={{ top: "65%", left: "20%" }} />
                  <div className="pizza-topping bg-red-700" style={{ top: "30%", left: "70%" }} />
                  {/* Basil */}
                  <div className="pizza-basil" style={{ top: "40%", left: "40%" }} />
                  <div className="pizza-basil" style={{ top: "60%", left: "55%" }} />
                  <div className="pizza-basil" style={{ top: "25%", left: "50%" }} />
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="glass-card p-6 w-full max-w-sm">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-white font-bold text-lg">4.9<span className="text-accent">★</span></p>
                  <p className="text-zinc-500 text-xs">rating</p>
                </div>
                <div className="border-x border-zinc-800/60 px-4">
                  <p className="text-emerald-400 font-bold text-lg">100%</p>
                  <p className="text-zinc-500 text-xs">organic</p>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">30<span className="text-zinc-400 text-sm font-normal">min</span></p>
                  <p className="text-zinc-500 text-xs">delivery</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
