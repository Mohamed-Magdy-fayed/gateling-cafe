type CacheTag = "users" | "products" | "reservations" | "orders";

export function getGlobalTag(tag: CacheTag) {
  return `global:${tag}` as const
}

export function getUserTag(tag: CacheTag, userId: string) {
  return `user:${userId}:${tag}` as const
}

export function getProductTag(tag: CacheTag, productId: string) {
  return `product:${productId}:${tag}` as const
}

export function getReservationTag(tag: CacheTag, reservationId: string) {
  return `reservation:${reservationId}:${tag}` as const
}

export function getOrderTag(tag: CacheTag, orderId: string) {
  return `order:${orderId}:${tag}` as const
}

export function getIdTag(tag: CacheTag, id: string) {
  return `id:${id}:${tag}` as const
}
