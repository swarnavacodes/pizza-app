import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { randomUUID } from "node:crypto";
import type { Order } from "@pizza/shared";
import { OrderPlacedEventSchema, type OrderPlacedEvent } from "@pizza/shared";
import { AppError } from "@pizza/backend-shared";

const eb = new EventBridgeClient({});

export async function emitOrderPlaced(order: Order): Promise<void> {
  const event: OrderPlacedEvent = {
    eventId: randomUUID(),
    eventType: "OrderPlaced",
    source: "pizza.order",
    occurredAt: new Date().toISOString(),
    correlationId: order.orderId,
    version: "1.0",
    payload: {
      orderId: order.orderId,
      customerId: order.customerId,
      totalAmount: order.totalAmount,
    },
  };
  OrderPlacedEventSchema.parse(event);
  const result = await eb.send(
    new PutEventsCommand({
      Entries: [
        {
          EventBusName: process.env.EVENT_BUS_NAME ?? "pizza-dev-event-bus",
          Source: event.source,
          DetailType: event.eventType,
          Detail: JSON.stringify(event),
        },
      ],
    }),
  );
  if (result.FailedEntryCount && result.FailedEntryCount > 0) {
    throw new AppError(
      `EventBridge rejected ${result.FailedEntryCount} entries: ${JSON.stringify(result.Entries)}`,
      true,
      "EVENT_PUBLISH_FAILED",
    );
  }
}
