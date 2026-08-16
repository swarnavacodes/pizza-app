"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchOrder } from "@/lib/api-client";

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <section className="min-h-screen py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="glass-card p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <p className="text-zinc-400">Loading...</p>
            </div>
          </div>
        </section>
      }
    >
      <OrdersPageInner />
    </Suspense>
  );
}

function OrdersPageInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    async function load() {
      try {
        const fetched = await fetchOrder(orderId!);
        if (!cancelled) setOrder(fetched);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }
    load();
    const interval = setInterval(load, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId]);

  if (!orderId) {
    return (
      <section className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-4xl font-black text-white mb-2">
            My <span className="text-gradient">Orders</span>
          </h1>
          <div className="glass-card p-8 text-center mt-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
              <span className="text-3xl">📋</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">No Active Orders</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Place an order first to track it here.
            </p>
            <a href="/menu" className="btn-primary">
              Browse Menu
            </a>
          </div>
        </div>
      </section>
    );
  }

  if (error)
    return (
      <section className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="glass-card p-8 text-center">
            <p className="text-red-400 text-lg">Failed to load order: {error}</p>
          </div>
        </div>
      </section>
    );

  if (!order)
    return (
      <section className="min-h-screen py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="glass-card p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-zinc-400">Loading order...</p>
          </div>
        </div>
      </section>
    );

  const statusLabels: Record<string, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    PREPARING: "Preparing",
    READY: "Ready",
    COMPLETED: "Completed",
  };

  const statusSteps = ["PENDING", "CONFIRMED", "PREPARING", "READY", "COMPLETED"];
  const currentStep = statusSteps.indexOf(order.status);

  return (
    <section className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-black text-white mb-2">
          Order <span className="text-gradient">#{order.orderId}</span>
        </h1>

        {/* Progress bar */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i <= currentStep
                      ? "bg-accent text-white shadow-glow-sm"
                      : "bg-zinc-800/60 text-zinc-500"
                  }`}
                >
                  {i < currentStep ? "✓" : i + 1}
                </div>
                {i < statusSteps.length - 1 && (
                  <div
                    className={`w-12 sm:w-20 h-0.5 mx-1 ${
                      i < currentStep ? "bg-accent" : "bg-zinc-800/60"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 px-1">
            {statusSteps.map((step) => (
              <span key={step}>{statusLabels[step]}</span>
            ))}
          </div>
        </div>

        {/* Order details */}
        <div className="glass-card p-6 mb-8 max-w-lg">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Status</span>
              <span className="badge-diet">
                {statusLabels[order.status] ?? order.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Total</span>
              <span className="text-white font-bold">
                ${order.totalAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-400">Ordered at</span>
              <span className="text-zinc-300 text-sm">
                {new Date(order.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <a href="/menu" className="btn-primary">
          Order Another Pizza
        </a>
      </div>
    </section>
  );
}
