const API_BASE = process.env.API_GATEWAY_URL as string;

export interface Order {
  orderId: string;
  customerId: string;
  status: "PENDING" | "CONFIRMED" | "PREPARING" | "READY" | "COMPLETED";
  totalAmount: number;
  items: Array<{ productId: string; name: string; quantity: number; price: number }>;
  createdAt: string;
}

export interface MenuItem {
  productId: string;
  name: string;
  description: string;
  basePrice: number;
  availableSizes: string[];
  availableCrusts: string[];
}

export async function fetchOrders(): Promise<Order[]> {
  const res = await fetch(`${API_BASE}/orders`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function fetchOrder(id: string): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
}

export async function createOrder(
  customerId: string,
  items: Array<{ productId: string; quantity: number }>,
  deliveryAddress: { street: string; city: string; zip: string }
): Promise<Order> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId, items, deliveryAddress }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message ?? "Failed to create order");
  }
  return res.json();
}

export async function cancelOrder(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/orders/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to cancel order");
}