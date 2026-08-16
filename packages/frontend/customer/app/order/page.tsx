"use client";

import { Suspense, useState, useEffect, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchOrder, createOrder } from "@/lib/api-client";

interface Pizza {
  productId: string;
  name: string;
  description: string;
  basePrice: number;
  availableSizes: string[];
  availableCrusts: string[];
}

export default function OrderPage() {
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
      <OrderPageInner />
    </Suspense>
  );
}

function OrderPageInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  if (orderId) {
    return <OrderTrackingPage orderId={orderId} />;
  }

  return <OrderFormPage />;
}

function OrderFormPage() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pizza, setPizza] = useState<Pizza | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("selectedPizza");
    if (stored) {
      try {
        setPizza(JSON.parse(stored));
      } catch {
        setPizza(null);
      }
    }
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pizza) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder(
        customerId || "cus_diet01",
        [{ productId: pizza.productId, quantity: 1 }],
        { street, city, zip },
      );
      router.push(`/orders?orderId=${order.orderId}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-black text-white mb-2">
          Build Your <span className="text-gradient">Diet Pizza</span>
        </h1>
        <p className="text-zinc-400 mb-8">
          Customize your order with fresh, organic ingredients.
        </p>

        {!pizza ? (
          <div className="glass-card p-8 max-w-lg text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-zinc-800/60 flex items-center justify-center">
              <span className="text-3xl">🍕</span>
            </div>
            <h3 className="text-white font-bold text-lg mb-2">No Pizza Selected</h3>
            <p className="text-zinc-400 text-sm mb-6">
              Choose a pizza from our menu to get started.
            </p>
            <Link href="/menu" className="btn-primary">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Selected Pizza Card */}
            <div className="glass-card p-6 self-start">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-3xl">🍕</span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-1">{pizza.name}</h3>
                  <p className="text-zinc-400 text-sm mb-3">{pizza.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-accent text-2xl font-bold">
                      ${pizza.basePrice.toFixed(2)}
                    </span>
                    <span className="badge-diet text-[10px]">diet-friendly</span>
                  </div>
                  {pizza.availableSizes.length > 0 && (
                    <p className="text-zinc-500 text-xs mt-3">
                      Sizes: {pizza.availableSizes.join(" · ")}
                    </p>
                  )}
                  {pizza.availableCrusts.length > 0 && (
                    <p className="text-zinc-500 text-xs">
                      Crusts: {pizza.availableCrusts.join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Order Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
              <div>
                <label className="label-dark">Customer ID</label>
                <input
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="cus_diet01"
                  className="input-dark"
                />
              </div>

              <div>
                <label className="label-dark">Delivery Address</label>
                <div className="space-y-3">
                  <input
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street address"
                    required
                    className="input-dark"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="City"
                      required
                      className="input-dark"
                    />
                    <input
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="ZIP code"
                      required
                      className="input-dark"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-primary text-base py-3.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Placing order...
                  </span>
                ) : (
                  `Place Order — $${pizza.basePrice.toFixed(2)}`
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderTrackingPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const fetched = await fetchOrder(orderId);
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

  return (
    <section className="min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-black text-white mb-2">
          Order <span className="text-gradient">#{order.orderId}</span>
        </h1>

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

        <Link href="/menu" className="btn-primary">
          Order Another Pizza
        </Link>
      </div>
    </section>
  );
}
