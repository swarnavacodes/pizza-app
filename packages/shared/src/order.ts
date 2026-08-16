import { z } from "zod";

export const OrderStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
]);

export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  zip: z.string().min(3),
  lat: z.number().optional(),
  lng: z.number().optional(),
});

export type Address = z.infer<typeof AddressSchema>;

export const CustomizationSchema = z.object({
  size: z.string().optional(),
  crust: z.string().optional(),
  toppings: z.array(z.string()).optional(),
});

export type Customization = z.infer<typeof CustomizationSchema>;

export const OrderItemSchema = z.object({
  itemId: z.string().min(1),
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  customizations: CustomizationSchema.optional(),
  unitPrice: z.number().nonnegative(),
});

export type OrderItem = z.infer<typeof OrderItemSchema>;

export const CreateOrderRequestSchema = z.object({
  customerId: z.string().min(1),
  items: z.array(OrderItemSchema).min(1),
  deliveryAddress: AddressSchema,
  offerCode: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;

export const OrderSchema = z.object({
  orderId: z.string().min(1),
  customerId: z.string().min(1),
  status: OrderStatusSchema,
  items: z.array(OrderItemSchema),
  totalAmount: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().default(0),
  deliveryAddress: AddressSchema,
  offerCode: z.string().optional(),
  paymentStatus: z.enum(["PENDING", "PAID", "REFUNDED"]).default("PENDING"),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expirableAt: z.string().datetime().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const OrderUpdateSchema = OrderSchema.pick({
  orderId: true,
  status: true,
  updatedAt: true,
});

export type OrderUpdate = z.infer<typeof OrderUpdateSchema>;
