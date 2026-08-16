import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { HttpError } from "@pizza/backend-shared";
import type { CreateOrderRequest, Order } from "@pizza/shared";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const ORDERS_TABLE = process.env.ORDERS_TABLE ?? "pizza-dev-orders";
const IDEMPOTENCY_TABLE = process.env.IDEMPOTENCY_TABLE ?? "pizza-dev-idempotency";
const IDEMPOTENCY_TTL_SECONDS = Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? "86400");

export interface CreateOrderResult {
  order: Order;
  replayed: boolean;
}

export class OrderRepository {
  async createOrder(input: CreateOrderRequest): Promise<CreateOrderResult> {
    const nowIso = new Date().toISOString();
    const order: Order = {
      orderId: `ord_${randomUUID()}`,
      customerId: input.customerId,
      status: "PENDING",
      items: input.items,
      totalAmount: input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      discountAmount: 0,
      deliveryAddress: input.deliveryAddress,
      offerCode: input.offerCode,
      paymentStatus: "PENDING",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await doc.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: IDEMPOTENCY_TABLE,
                Item: {
                  idempotencyKey: input.idempotencyKey,
                  orderId: order.orderId,
                  expirableAt: Math.floor(Date.now() / 1000) + IDEMPOTENCY_TTL_SECONDS,
                },
                ConditionExpression: "attribute_not_exists(idempotencyKey)",
              },
            },
            { Put: { TableName: ORDERS_TABLE, Item: order } },
          ],
        }),
      );
      return { order, replayed: false };
    } catch (err) {
      if (err instanceof TransactionCanceledException) {
        const reason = err.CancellationReasons?.[0];
        if (reason?.Code === "ConditionalCheckFailed") {
          const existing = await this.findByKey(input.idempotencyKey);
          if (existing) {
            // Verify the idempotency entry is still within its TTL window.
            // DynamoDB TTL is "best effort" — items may persist up to 48h past expiry.
            if (existing.expirableAt && new Date(existing.expirableAt).getTime() > Date.now()) {
              return { order: existing, replayed: true };
            }
            // Entry expired — treat as a new request (below), allowing re-creation.
          }
        }
      }
      throw err;
    }
  }

  async getOrder(orderId: string): Promise<Order> {
    const result = await doc.send(
      new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }),
    );
    if (!result.Item) {
      throw new HttpError(404, "Order not found", "ORDER_NOT_FOUND");
    }
    return result.Item as Order;
  }

  private async findByKey(keyValue: string): Promise<Order | null> {
    const idempotency = await doc.send(
      new GetCommand({ TableName: IDEMPOTENCY_TABLE, Key: { idempotencyKey: keyValue } }),
    );
    const orderId = idempotency.Item?.orderId as string | undefined;
    if (!orderId) {
      return null;
    }
    const result = await doc.send(
      new GetCommand({ TableName: ORDERS_TABLE, Key: { orderId } }),
    );
    return (result.Item as Order) ?? null;
  }
}
