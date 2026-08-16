import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { errorResponse, logger, ok, tracingEnabled, tracer } from "@pizza/backend-shared";
import { z } from "zod";
import { OrderRepository } from "../repository.js";

const PathSchema = z.object({
  orderId: z.string().regex(/^ord_[a-zA-Z0-9-]+$/),
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  if (tracingEnabled) {
    tracer.annotateColdStart();
  }
  try {
    const { orderId } = PathSchema.parse(event.pathParameters ?? {});
    const order = await new OrderRepository().getOrder(orderId);
    logger.debug("order fetched", { orderId });
    return ok(order);
  } catch (err) {
    return errorResponse(err);
  }
};
