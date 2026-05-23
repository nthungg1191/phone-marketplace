import type {
  User,
  Product,
  Order,
  Offer,
  Brand,
  PhoneModel,
  Category,
  Review,
  Notification,
  Message,
  Conversation,
  Address,
  Cart,
  CartItem,
  PaymentTransaction,
  SellerStats,
  TrustScoreHistory,
  HealthCheck,
  ProductImage,
  ConversationParticipant,
} from "@prisma/client"

// Re-export Prisma types
export type {
  User,
  Product,
  Order,
  Offer,
  Brand,
  PhoneModel,
  Category,
  Review,
  Notification,
  Message,
  Conversation,
  Address,
  Cart,
  CartItem,
  PaymentTransaction,
  SellerStats,
  TrustScoreHistory,
  HealthCheck,
  ProductImage,
  ConversationParticipant,
}

// ============================================================
// Extended Types (with relations)
// ============================================================

export type UserWithRelations = User & {
  sellerStats?: SellerStats | null
  addresses?: Address[]
  products?: Product[]
}

export type ProductWithRelations = Product & {
  seller: User
  brand: Brand
  model: PhoneModel
  category: Category
  images: ProductImage[]
  healthCheck?: HealthCheck | null
  reviews?: Review[]
  _count?: {
    reviews: number
  }
}

export type OrderWithRelations = Order & {
  buyer: User
  seller: User
  items: OrderItemWithProduct[]
}

export type OrderItemWithProduct = {
  id: string
  orderId: string
  productId: string
  title: string
  price: number
  image: string
  quantity: number
  offerId: string | null
  product?: ProductWithRelations
}

export type ConversationWithRelations = Conversation & {
  participants: ConversationParticipantWithUser[]
  messages?: Message[]
  lastMessage?: Message | null
}

export type ConversationParticipantWithUser = ConversationParticipant & {
  user: User
}

// ============================================================
// API Request/Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Auth
export interface RegisterInput {
  email: string
  password: string
  name: string
  phone?: string
}

export interface LoginInput {
  email: string
  password: string
}

// Product
export interface CreateProductInput {
  brandId: string
  modelId: string
  categoryId: string
  title: string
  description?: string
  condition: "LIKE_NEW" | "PERFECT_99" | "EXCELLENT_98" | "EXCELLENT_97" | "GOOD"
  ramGb: number
  storageGb: number
  color: string
  imei?: string
  batteryHealth: number
  price: number
  negotiable?: boolean
  images: string[]
  healthCheck?: HealthCheckInput
}

export interface HealthCheckInput {
  serialNumber?: string
  wifiMacAddress?: string
  bluetoothMacAddress?: string
  iosVersion?: string
  androidVersion?: string
  activationStatus?: string
  jailbreakStatus?: string
  securityLockStatus?: string
  batteryCycleCount?: number
  batteryHealth: number
  screen?: "PASS" | "FAIL" | "NOT_TESTED"
  cameraFront?: "PASS" | "FAIL" | "NOT_TESTED"
  cameraBack?: "PASS" | "FAIL" | "NOT_TESTED"
  speaker?: "PASS" | "FAIL" | "NOT_TESTED"
  microphone?: "PASS" | "FAIL" | "NOT_TESTED"
  wifi?: "PASS" | "FAIL" | "NOT_TESTED"
  bluetooth?: "PASS" | "FAIL" | "NOT_TESTED"
  fingerprint?: "PASS" | "FAIL" | "NOT_TESTED"
  faceId?: "PASS" | "FAIL" | "NOT_TESTED"
  chargingPort?: "PASS" | "FAIL" | "NOT_TESTED"
  overallStatus?: string
  notes?: string
}

export interface ProductFilterInput {
  brandId?: string
  modelId?: string
  categoryId?: string
  condition?: string[]
  minPrice?: number
  maxPrice?: number
  minBatteryHealth?: number
  maxBatteryHealth?: number
  ramGb?: number[]
  storageGb?: number[]
  color?: string[]
  search?: string
}

// Offer
export interface CreateOfferInput {
  productId: string
  offeredPrice: number
  message?: string
}

export interface RespondToOfferInput {
  action: "ACCEPT" | "REJECT" | "COUNTER"
  responseMessage?: string
  counterPrice?: number
}

// Order
export interface CreateOrderInput {
  items: {
    productId: string
    quantity: number
    offerId?: string
  }[]
  addressId?: string  // Su dung dia chi da luu (uu tien)
  shippingAddress?: { // Hoac nhap dia chi truc tiep
    fullName: string
    phone: string
    street: string
    provinceCode?: string
    provinceName?: string
    wardCode?: string
    wardName?: string
    ward?: string
    district?: string
    city?: string
  }
  paymentMethod: "SEPAY" | "COD"
}

// Seller
export interface SellerRequestInput {
  phone: string
  address: string
}

export interface ApproveSellerInput {
  action: "APPROVE" | "REJECT"
  reason?: string
}

// Review
export interface CreateReviewInput {
  orderId: string
  productId: string
  revieweeId: string
  rating: number
  accuracy?: number
  communication?: number
  delivery?: number
  comment?: string
  photos?: string[]
}

// ============================================================
// Address Types
// ============================================================

export interface AddressInput {
  fullName: string
  phone: string
  street: string
  provinceCode: string
  provinceName: string
  wardCode: string
  wardName: string
  district?: string
  city?: string
  isDefault?: boolean
}

export interface AddressWithUser extends Address {
  user: User
}

// Vietnam Province API Types
export interface VietnamProvince {
  code: string | number
  name: string
  codename: string
  division_type: string
  phone_code?: number
}

export interface VietnamWard {
  code: string | number
  name: string
  codename: string
  division_type: string
  province_code?: string | number
  district_code?: string | number
}

// ============================================================
// Session Types
// ============================================================

export interface SessionUser {
  id: string
  email: string
  name: string
  role: "BUYER" | "SELLER" | "ADMIN"
  sellerStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED"
  sellerRank?: "NEW" | "TRUSTED" | "TOP_SELLER"
  avatar?: string | null
}

// ============================================================
// Notification Types
// ============================================================

export type NotificationPayload = {
  type: Notification["type"]
  title: string
  message: string
  relatedId?: string
  relatedType?: string
}

// ============================================================
// Price Suggestion Types
// ============================================================

export interface PriceSuggestionInput {
  brandId: string
  modelId: string
  condition: "LIKE_NEW" | "PERFECT_99" | "EXCELLENT_98" | "EXCELLENT_97" | "GOOD"
  storageGb: number
  batteryHealth: number
  releaseDate?: Date
}

export interface PriceSuggestionResult {
  suggestedPrice: number
  minPrice: number
  maxPrice: number
  factors: {
    conditionFactor: number
    ageFactor: number
    batteryFactor: number
    storageFactor: number
  }
}

// ============================================================
// Chat Types
// ============================================================

export interface SendMessageInput {
  conversationId: string
  content: string
  type?: "TEXT" | "IMAGE"
  mediaUrl?: string
}

export interface CreateConversationInput {
  productId?: string
  participantId: string
}
