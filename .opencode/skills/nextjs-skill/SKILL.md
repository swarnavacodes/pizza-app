---
name: nextjs-skill
description: Use when building or refactoring Next.js 14+ (App Router) apps for customer, kitchen, delivery, or admin portals. Triggers on "next.js", "app router", "server action", "ssr", "shadcn", "tanstack".
---

# Next.js (App Router) Skill

## When to use
- Any work under `packages/frontend/<app>/`
- API route handlers / server actions
- Realtime (WebSocket) client wiring
- shadcn/ui component addition
- Auth flow via Cognito (cognito-at-edge or client-side amplify)

## App layout
```
packages/frontend/customer/
├── app/
│   ├── (marketing)/page.tsx       # landing
│   ├── menu/page.tsx               # menu list (server component fetch)
│   ├── order/page.tsx              # cart + checkout
│   ├── orders/[id]/page.tsx        # order tracking (WS subscription)
│   ├── api/                        # route handlers (BFF)
│   └── layout.tsx                  # providers (query, ws, auth)
├── components/
├── lib/
│   ├── api-client.ts              # typed fetch → API Gateway
│   └── ws-client.ts               # WebSocket reconnect logic
└── middleware.ts                  # auth gate
```

## Server vs Client component rules
1. **Default to Server Components** — fetch API Gateway (with cached revalidate) for menu/order lists.
2. **"use client"** only where interactivity (forms, maps, websocket) is unavoidable.
3. **Server Actions** for mutations (create order, apply offer) → forwards to backend Lambda via internal HTTPS.
4. **Streaming**: wrap above-the-fold data in `<Suspense>`; show skeleton for secondary panels.
5. **Cache**: `fetch(url, { next: { revalidate: 60 } })` for menu; `cache: 'no-store'` for live order.

## WebSocket client pattern (kitchen + customer)
```ts
const ws = new WebSocket(`${WS_URL}?orderId=${id}`);
ws.onmessage = (ev) => {
  const update = OrderUpdateSchema.parse(JSON.parse(ev.data));
  queryClient.setQueryData(['order', id], update);
};
```

## Tech choices
- shadcn/ui + Tailwind (already configured)
- TanStack Query for client mutations/cache
- Zustand for local UI state (cart, KDS drag-and-drop)
- Recharts in admin portal
- react-map-gl for delivery live map

## Auth (Cognito)
- Customer: Cognito User Pool (email/password) → JWT in httpOnly cookie via route handler
- Admin: Cognito + `admin` group; middleware checks claim
- React Native (Phase 6): Amplify SDK + secure storage

## Anti-patterns to flag
- `'use client'` at top of layout (kills server benefits)
- Direct DynamoDB calls from frontend (always via API Gateway + Lambda)
- `useEffect` for fetching when Server Component suffices
- Unvalidated WS messages → schema-parse every inbound
- Missing Suspense boundaries on streaming data
