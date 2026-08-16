import { z } from "zod";

export const PizzaEventTypeSchema = z.enum([
  "OrderPlaced",
  "OrderConfirmed",
  "OrderCancelled",
  "KitchenOrderCreated",
  "KitchenStarted",
  "KitchenReady",
  "DeliveryCreated",
  "DeliveryAssigned",
  "DeliveryPickedUp",
  "DeliveryInTransit",
  "DeliveryCompleted",
  "OfferApplied",
  "OfferExpired",
  "PaymentSucceeded",
  "PaymentFailed",
  "RefundIssued",
  "PartnerOrderSynced",
  "PartnerStatusReceived",
]);

export type PizzaEventType = z.infer<typeof PizzaEventTypeSchema>;

export const PizzaEventSourceSchema = z.enum([
  "pizza.order",
  "pizza.kitchen",
  "pizza.delivery",
  "pizza.offer",
  "pizza.payment",
  "pizza.partner",
]);

export type PizzaEventSource = z.infer<typeof PizzaEventSourceSchema>;

export const PizzaEventSchema = <T extends z.ZodTypeAny>(payloadSchema: T) =>
  z.object({
    eventId: z.string().min(1),
    eventType: PizzaEventTypeSchema,
    source: PizzaEventSourceSchema,
    occurredAt: z.string().datetime(),
    correlationId: z.string().min(1),
    version: z.literal("1.0"),
    payload: payloadSchema,
  });

export type PizzaEvent<T = unknown> = {
  eventId: string;
  eventType: PizzaEventType;
  source: PizzaEventSource;
  occurredAt: string;
  correlationId: string;
  version: "1.0";
  payload: T;
};

export const OrderPlacedPayloadSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
});

export type OrderPlacedPayload = z.infer<typeof OrderPlacedPayloadSchema>;

export const OrderPlacedEventSchema = PizzaEventSchema(OrderPlacedPayloadSchema);
export type OrderPlacedEvent = PizzaEvent<OrderPlacedPayload>;
