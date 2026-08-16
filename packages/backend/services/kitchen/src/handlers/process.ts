import { randomUUID } from "node:crypto";
import { Logger } from "@aws-sdk/logger";
import { KitchenRepository } from "./repository.js";
import { emitKitchenOrderCreated, emitKitchenStarted, emitKitchenReady } from "./events.js";
import { z } from "zod";
import { Logger as PowertoolsLogger } from "@aws-sdk/logger";
import { HttpError } from "@pizza/backend-shared";

const logger = new PowertoolsLogger({ serviceName: "kitchen" });
const repo = new KitchenRepository();

const CREATE_KITCHEN_ORDER_SCHEMA = z.object({
  orderId: z.string().min(1),
  stationId: z.string().min(1),
});

const START_PREPARATION_SCHEMA = z.object({
  kitchenOrderId: z.string().min(1),
});

const MARK_READY_SCHEMA = z.object({
  kitchenOrderId: z.string().min(1),
});

export const handler = async (event) => {
  const correlationId = event.requestContext?.http?.requestId ?? randomUUID();
  logger.addContext({ correlationId });
  logger.info("kitchen request received", { path: event.rawPath, method: event.httpMethod, correlationId });

  try {
    let result;

    switch (event.httpMethod) {
      case "POST": {
        const body = JSON.parse(event.body ?? "{}");
        const input = CREATE_KITCHEN_ORDER_SCHEMA.parse(body);
        result = await repo.createKitchenOrder(input);
        logger.info("kitchen order created", { kitchenOrderId: result.kitchenOrderId, correlationId });
        break;
      }

      case "PUT": {
        const body = JSON.parse(event.body ?? "{}");
        const route = event.rawPath?.replace("/kitchen/orders/", "").replace(/\/.*$/, "");

        if (event.rawPath?.includes("/start")) {
          const input = START_PREPARATION_SCHEMA.parse(body);
          result = await repo.startPreparation(input);
          await emitKitchenStarted({ kitchenOrderId: input.kitchenOrderId, orderId: result.orderId });
          logger.info("kitchen started", { kitchenOrderId: input.kitchenOrderId, correlationId });
        } else if (event.rawPath?.includes("/ready")) {
          const input = MARK_READY_SCHEMA.parse(body);
          result = await repo.markReady(input);
          await emitKitchenReady({ kitchenOrderId: input.kitchenOrderId, orderId: result.orderId });
          logger.info("kitchen ready", { kitchenOrderId: input.kitchenOrderId, correlationId });
        } else {
          throw new HttpError(400, "Unknown PUT route", "UNKNOWN_ROUTE");
        }
        break;
      }

      default:
        throw new HttpError(405, `Method ${event.httpMethod} not allowed`, "METHOD_NOT_ALLOWED");
    }

    return {
      statusCode: 200,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
        "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type,authorization,x-idempotency-key",
        "access-control-max-age": "86400",
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    logger.error("kitchen request failed", { error: err, correlationId });
    if (err instanceof HttpError) {
      return {
        statusCode: err.statusCode,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
        },
        body: JSON.stringify({ error: { code: err.code, message: err.message } }),
      };
    }
    return {
      statusCode: 500,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": process.env.ALLOWED_ORIGIN ?? "*",
      },
      body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Internal error" } }),
    };
  }
};