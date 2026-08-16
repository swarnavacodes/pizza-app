import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Tracer } from "@aws-lambda-powertools/tracer";

const namespace = process.env.POWERTOOLS_SERVICE_NAME ?? "pizza-service";

export const logger = new Logger({
  serviceName: namespace,
  logLevel: (process.env.LOG_LEVEL as "DEBUG" | "INFO" | "WARN" | "ERROR") ?? "INFO",
});

export const metrics = new Metrics({
  namespace: "PizzaApp",
  serviceName: namespace,
});

export const tracingEnabled = process.env.XRAY_ENABLED === "true";

export const tracer = new Tracer({
  serviceName: namespace,
  enabled: tracingEnabled,
});
