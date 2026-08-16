"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MenuItem {
  productId: string;
  name: string;
  description: string;
  basePrice: number;
  availableSizes: string[];
  availableCrusts: string[];
  badges: string[];
  image: string;
}

const SEED_MENU: MenuItem[] = [
  {
    productId: "prod_margherita",
    name: "Margherita",
    description: "San Marzano tomatoes, fresh mozzarella, basil on thin whole-wheat crust",
    basePrice: 9.99,
    availableSizes: ["small", "medium", "large"],
    availableCrusts: ["thin", "whole-wheat"],
    badges: ["Vegetarian", "Low-Cal"],
    image: "🍅",
  },
  {
    productId: "prod_pepperoni",
    name: "Turkey Pepperoni",
    description: "Lean turkey pepperoni, mozzarella, oregano — 30% less fat",
    basePrice: 12.49,
    availableSizes: ["small", "medium", "large"],
    availableCrusts: ["thin", "whole-wheat"],
    badges: ["High-Protein", "Keto"],
    image: "🍕",
  },
  {
    productId: "prod_coke",
    name: "Coke Zero",
    description: "Ice-cold Coke Zero, zero sugar, refreshing",
    basePrice: 2.5,
    availableSizes: ["can", "bottle"],
    availableCrusts: [],
    badges: ["Zero-Sugar", "Low-Cal"],
    image: "🥤",
  },
];

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    setMenu(SEED_MENU);
    setLoading(false);
  }, []);

  const allBadges = [
    "All",
    ...Array.from(new Set(menu.flatMap((item) => item.badges))),
  ];

  const filteredMenu =
    activeFilter === "All"
      ? menu
      : menu.filter((item) => item.badges.includes(activeFilter));

  if (loading) {
    return (
      <section className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="space-y-6">
            <div className="h-8 w-48 bg-zinc-800/60 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-6 space-y-4">
                  <div className="h-12 w-12 bg-zinc-800/60 rounded-xl animate-pulse" />
                  <div className="h-4 bg-zinc-800/60 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-zinc-800/60 rounded w-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            Our <span className="text-gradient">Menu</span>
          </h1>
          <p className="text-zinc-400 text-lg">
            Fresh, organic ingredients. Guilt-free indulgence.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-2 mb-8">
          {allBadges.map((badge) => (
            <button
              key={badge}
              onClick={() => setActiveFilter(badge)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                activeFilter === badge
                  ? "bg-accent text-white shadow-glow-sm"
                  : "bg-zinc-900/40 border border-zinc-800/60 text-zinc-400 hover:border-accent/30 hover:text-accent"
              }`}
            >
              {badge}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMenu.map((item) => (
            <div key={item.productId} className="glass-card-hover p-6 group">
              {/* Image area */}
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 group-hover:shadow-glow-sm transition-shadow">
                <span className="text-3xl">{item.image}</span>
              </div>

              {/* Title + Price */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xl font-bold text-white">{item.name}</h3>
                <span className="text-accent font-bold text-lg">
                  ${item.basePrice.toFixed(2)}
                </span>
              </div>

              {/* Description */}
              <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                {item.description}
              </p>

              {/* Diet badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {item.badges.map((badge) => (
                  <span key={badge} className="badge-diet text-[10px]">
                    {badge}
                  </span>
                ))}
              </div>

              {/* Sizes/Crusts */}
              {item.availableSizes.length > 0 && (
                <p className="text-zinc-500 text-xs mb-4">
                  Sizes: {item.availableSizes.join(" · ")}
                  {item.availableCrusts.length > 0 && (
                    <> | Crusts: {item.availableCrusts.join(" · ")}</>
                  )}
                </p>
              )}

              {/* Add to order */}
              <button
                onClick={() => navigateToOrder(item)}
                className="w-full btn-primary text-sm py-2.5 mt-auto"
              >
                Add to Order
              </button>
            </div>
          ))}
        </div>

        {/* Empty state */}
        {filteredMenu.length === 0 && (
          <div className="glass-card p-12 text-center">
            <p className="text-zinc-400 text-lg">
              No items match &quot;{activeFilter}&quot;
            </p>
            <button
              onClick={() => setActiveFilter("All")}
              className="btn-outline text-sm mt-4"
            >
              Show All
            </button>
          </div>
        )}

        {/* Footer note */}
        <div className="mt-12 pt-8 border-t border-zinc-800/60 text-center">
          <p className="text-zinc-500 text-sm">
            All ingredients sourced fresh daily. Customizable sizes and crusts available.
          </p>
        </div>
      </div>
    </section>
  );
}

function navigateToOrder(item: MenuItem) {
  localStorage.setItem(
    "selectedPizza",
    JSON.stringify({
      productId: item.productId,
      name: item.name,
      description: item.description,
      basePrice: item.basePrice,
      availableSizes: item.availableSizes,
      availableCrusts: item.availableCrusts,
    }),
  );
  window.location.href = "/order";
}
