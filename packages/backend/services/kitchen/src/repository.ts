import {
  DynamoDBClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand as GetDocCommand,
  PutCommand as PutDocCommand,
  UpdateCommand as UpdateDocCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { HttpError } from "@pizza/backend-shared";
import { z } from "zod";
import type { Order } from "@pizza/shared";

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const KITCHEN_ORDERS_TABLE = process.env.KITCHEN_ORDERS_TABLE ?? "pizza-dev-kitchen-orders";
const IDEMPOTENCY_TABLE = process.env.IDEMPOTENCY_TABLE ?? "pizza-dev-idempotency";
const IDEMPOTENCY_TTL_SECONDS = Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? "86400");

export interface KitchenOrder {
  kitchenOrderId: string;
  orderId: string;
  stationId: string;
  status: "QUEUED" | "IN_PROGRESS" | "READY";
  estimatedCompletionTime?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateKitchenOrderInput {
  orderId: string;
  stationId: string;
}

export interface StartPreparationInput {
  kitchenOrderId: string;
}

export interface MarkReadyInput {
  kitchenOrderId: string;
}

export class KitchenRepository {
  async createKitchenOrder(input: CreateKitchenOrderInput): Promise<KitchenOrder> {
    const nowIso = new Date().toISOString();
    const kitchenOrder: KitchenOrder = {
      kitchenOrderId: `ko_${randomUUID()}`,
      orderId: input.orderId,
      stationId: input.stationId,
      status: "QUEUED",
      estimatedCompletionTime: undefined,
      startedAt: undefined,
      completedAt: undefined,
    };

    await doc.send(
      new PutCommand({
        TableName: KITCHEN_ORDERS_TABLE,
        Item: kitchenOrder,
      })
    );

    return kitchenOrder;
  }

  async getKitchenOrder(kitchenOrderId: string): Promise<KitchenOrder> {
    const result = await doc.send(
      new GetDocCommand({ TableName: KITCHEN_ORDERS_TABLE, Key: { kitchenOrderId } })
    );
    if (!result.Item) {
      throw new HttpError(404, "Kitchen order not found", "KITCHEN_ORDER_NOT_FOUND");
    }
    return result.Item as KitchenOrder;
  }

  async startPreparation(input: StartPreparationInput): Promise<KitchenOrder> {
    const nowIso = new Date().toISOString();
    await doc.send(
      new UpdateDocCommand({
        TableName: KITCHEN_ORDERS_TABLE,
        Key: { kitchenOrderId: input.kitchenOrderId },
        UpdateExpression: "SET #status = :status, startedAt = :startedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "IN_PROGRESS",
          ":startedAt": nowIso,
        },
      })
    );

    return this.getKitchenOrder(input.kitchenOrderId);
  }

  async markReady(input: MarkReadyInput): Promise<KitchenOrder> {
    const nowIso = new Date().toISOString();
    await doc.send(
      new UpdateDocCommand({
        TableName: KITCHEN_ORDERS_TABLE,
        Key: { kitchenOrderId: input.kitchenOrderId },
        UpdateExpression: "SET #status = :status, completedAt = :completedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "READY",
          ":completedAt": nowIso,
        },
      })
    );

    // Emit KitchenReady event via EventBridge
    const payload = {
      kitchenOrderId: input.kitchenOrderId,
      orderId: (await this.getKitchenOrder(input.kitchenOrderId)).orderId,
      stationId: "",
      status: "KitchenReady" as const,
    };

    // We'll emit after the repo method - caller should import emitKitchenReady
    // from events.ts. For now, we just return the order.
    return this.getKitchenOrder(input.kitchenOrderId);
  }
}