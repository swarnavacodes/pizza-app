import { z } from "zod";
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { randomUUID } from "node:crypto";

const eb = new EventBridgeClient({});

export const KitchenEventTypeSchema = z.enum([
  "KitchenOrderCreated",
  "KitchenStarted",
  "KitchenReady",
]);

export type KitchenEventType = z.infer<typeof KitchenEventTypeSchema>;

export const KitchenEventSourceSchema = z.literal("pizza.kitchen");

export type KitchenEventSource = z.infer<typeof KitchenEventSourceSchema>;

export const KitchenEventPayloadSchema = z.object({
  kitchenOrderId: z.string().min(1),
  orderId: z.string().min(1),
  stationId: z.string().min(1),
  status: KitchenEventTypeSchema,
  estimatedCompletionTime: z.string().optional(),
});

export type KitchenEventPayload = z.infer<typeof KitchenEventPayloadSchema>;

export const KitchenEventSchema = <T extends z.ZodTypeAny>(
  payloadSchema: T
) =>
  z.object({
    eventId: z.string().uuid(),
    eventType: z.union([KitchenEventTypeSchema, z.literal("")]),
    source: KitchenEventSourceSchema,
    occurredAt: z.string().datetime(),
    correlationId: z.string().uuid(),
    version: z.literal("1.0"),
    payload: payloadSchema,
  });

export type KitchenEvent = z.infer<ReturnType<typeof KitchenEventSchema>>;

export async function emitKitchenOrderCreated(
  payload: KitchenEventPayload
): Promise<void> {
  const event: KitchenEvent = {
    eventId: randomUUID(),
    eventType: "KitchenOrderCreated",
    source: "pizza.kitchen",
    occurredAt: new Date().toISOString(),
    correlationId: payload.kitchenOrderId,
    version: "1.0",
    payload,
  };

  const schema = KitchenEventSchema(KitchenEventPayloadSchema);
  schema.parse(event);

  await eb.send(
    new PutEventsCommand({
      EventBusName: process.env.EVENT_BUS_NAME ?? "pizza-dev-event-bus",
      Source: event.source,
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
    })
  );
}

export async function emitKitchenStarted(
  payload: Pick<KitchenEventPayload, "kitchenOrderId"> & { orderId: string }
): Promise<void> {
  const event: KitchenEvent = {
    eventId: randomUUID(),
    eventType: "KitchenStarted",
    source: "pizza.kitchen",
    occurredAt: new Date().toISOString(),
    correlationId: payload.kitchenOrderId,
    version: "1.0",
    payload: {
      kitchenOrderId: payload.kitchenOrderId,
      orderId: payload.orderId,
      stationId: "",
      status: "KitchenStarted",
    },
  };

  const schema = KitchenEventSchema(KitchenEventPayloadSchema);
  schema.parse(event);

  await eb.send(
    new PutEventsCommand({
      EventBusName: process.env.EVENT_BUS_NAME ?? "pizza-dev-event-bus",
      Source: event.source,
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
    })
  );
}

export async function emitKitchenReady(
  payload: Pick<KitchenEventPayload, "kitchenOrderId"> & { orderId: string }
): Promise<void> {
  const event: KitchenEvent = {
    eventId: randomUUID(),
    eventType: "KitchenReady",
    source: "pizza.kitchen",
    occurredAt: new Date().toISOString(),
    correlationId: payload.kitchenOrderId,
    version: "1.0",
    payload: {
      kitchenOrderId: payload.kitchenOrderId,
      orderId: payload.orderId,
      stationId: "",
      status: "KitchenReady",
    },
  };

  const schema = KitchenEventSchema(KitchenEventPayloadSchema);
  schema.parse(event);

  await eb.send(
    new PutEventsCommand({
      EventBusName: process.env.EVENT_BUS_NAME ?? "pizza-dev-event-bus",
      Source: event.source,
      DetailType: event.eventType,
      Detail: JSON.stringify(event),
    })
  );
}