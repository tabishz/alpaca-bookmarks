// A simple in-memory cache for the session
export const failedIconCache = new Set<number>();
export const iconCache = new Map<number, string>();
export const inFlightRequests = new Set<number>();
