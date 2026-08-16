import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { created, errorResponse, logger, metrics, ok, tracingEnabled, tracer } from "@pizza/backend-shared";
import { CreateOrderRequestSchema } from "@pizza/shared";
import { emitOrderPlaced } from "../events.js";
import { OrderRepository } from "../repository.js";

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (tracingEnabled) {
    tracer.annotateColdStart();
  }
  try {
    const input = CreateOrderRequestSchema.parse(JSON.parse(event.body ?? "{}"));

    const repo = new OrderRepository();
    const result = await repo.createOrder(input);

    if (result.replayed) {
      logger.info("idempotent replay", { orderId: result.order.orderId });
      return ok({ replayed: true, orderId: result.order.orderId });
    }

    await emitOrderPlaced(result.order);
    metrics.addMetric("OrderCreated", "Count", 1);
    metrics.publishStoredMetrics();
    logger.info("order created", {
      orderId: result.order.orderId,
      customerId: result.order.customerId,
      totalAmount: result.order.totalAmount,
    });

    return created({
      orderId: result.order.orderId,
      status: result.order.status,
      totalAmount: result.order.totalAmount,
    });
  } catch (err) {
    return errorResponse(err);
  }
};
