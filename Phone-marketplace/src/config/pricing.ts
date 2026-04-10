// ============================================================
// Price Suggestion Configuration
// ============================================================

export const PRICING_CONFIG = {
  // Condition Factors
  CONDITION_FACTORS: {
    LIKE_NEW: 0.85,
    EXCELLENT: 0.75,
    GOOD: 0.65,
    FAIR: 0.50,
    POOR: 0.35,
  },

  // Age Depreciation (per month)
  AGE_DEPRECIATION_RATE: 0.015,
  MIN_AGE_FACTOR: 0.20,

  // Battery Health
  MIN_BATTERY_FACTOR: 0.70,

  // Storage Premium (relative to 128GB)
  BASE_STORAGE_GB: 128,
  STORAGE_PREMIUM_RATE: 0.26,

  // Round to nearest
  PRICE_ROUNDING: 50000, // Round to nearest 50,000 VND
} as const

// ============================================================
// Trust Score Configuration
// ============================================================

export const TRUST_SCORE_CONFIG = {
  // Weights
  WEIGHTS: {
    AVG_RATING: 0.40,
    SUCCESS_RATE: 0.25,
    TRANSACTION_VOLUME: 0.15,
    RESPONSE_TIME: 0.10,
    IDENTITY_VERIFICATION: 0.10,
  },

  // Rank Thresholds
  RANKS: {
    NEW: {
      minTransactions: 0,
      minScore: 0,
    },
    TRUSTED: {
      minTransactions: 5,
      minScore: 4.0, // 4.0 out of 5.0 = 80%
    },
    TOP_SELLER: {
      minTransactions: 50,
      minScore: 4.5,
    },
  },

  // Response time baseline (24 hours in minutes)
  RESPONSE_TIME_BASELINE: 1440,
} as const

// ============================================================
// Product Configuration
// ============================================================

export const PRODUCT_CONFIG = {
  // Image upload
  MIN_IMAGES: 4,
  MAX_IMAGES: 10,
  MAX_IMAGE_SIZE_MB: 5,

  // Battery health range
  MIN_BATTERY_HEALTH: 0,
  MAX_BATTERY_HEALTH: 100,

  // Offer expiration (hours)
  OFFER_EXPIRATION_HOURS: 48,
} as const

// ============================================================
// Order Configuration
// ============================================================

export const ORDER_CONFIG = {
  // Status transitions
  STATUS_FLOW: [
    "PENDING_PAYMENT",
    "PAID",
    "CONFIRMED",
    "SHIPPING",
    "DELIVERED",
    "COMPLETED",
  ] as const,

  // Cancellation allowed before these statuses
  CANCELLABLE_BEFORE: ["CONFIRMED", "SHIPPING"] as const,

  // Refund allowed for these statuses
  REFUNDABLE_STATUSES: ["PAID", "CONFIRMED"] as const,
} as const
