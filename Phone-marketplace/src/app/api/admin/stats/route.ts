import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

// GET /api/admin/stats - Thống kê tổng quan cho Admin
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Không có quyền" }, { status: 403 })
    }

    // ========== KPI METRICS ==========

    // Tổng người dùng (buyers)
    const totalUsers = await prisma.user.count({
      where: { role: "BUYER" }
    })

    // Tổng sellers
    const totalSellers = await prisma.user.count({
      where: { role: "SELLER" }
    })

    // Tổng sản phẩm
    const products = await prisma.product.groupBy({
      by: ["status"],
      _count: { id: true },
    })

    const totalProducts = products.reduce((sum, p) => sum + p._count.id, 0)
    const pendingProducts = products
      .filter(p => p.status === "PENDING")
      .reduce((sum, p) => sum + p._count.id, 0)
    const activeProducts = products
      .filter(p => p.status === "ACTIVE")
      .reduce((sum, p) => sum + p._count.id, 0)

    // Tổng đơn hàng
    const orders = await prisma.order.groupBy({
      by: ["status"],
      _count: { id: true },
    })

    const totalOrders = orders.reduce((sum, o) => sum + o._count.id, 0)
    const pendingOrders = orders
      .filter(o => 
        o.status === "PENDING_PAYMENT" || 
        o.status === "PAID" || 
        o.status === "CONFIRMED"
      )
      .reduce((sum, o) => sum + o._count.id, 0)

    // Tính doanh thu (chỉ từ đơn COMPLETED)
    const completedOrders = await prisma.order.findMany({
      where: { status: "COMPLETED" },
      select: { totalAmount: true, createdAt: true }
    })

    const totalRevenue = completedOrders.reduce(
      (sum, o) => sum + Number(o.totalAmount), 
      0
    )

    // Doanh thu tháng này vs tháng trước
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthRevenue = completedOrders
      .filter(o => new Date(o.createdAt) >= startOfMonth)
      .reduce((sum, o) => sum + Number(o.totalAmount), 0)

    const lastMonthRevenue = completedOrders
      .filter(o => {
        const date = new Date(o.createdAt)
        return date >= startOfLastMonth && date <= endOfLastMonth
      })
      .reduce((sum, o) => sum + Number(o.totalAmount), 0)

    // Tính % thay đổi doanh thu
    let revenueChange = 0
    if (lastMonthRevenue > 0) {
      revenueChange = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
    } else if (thisMonthRevenue > 0) {
      revenueChange = 100
    }

    // Tổng đơn tháng này vs tháng trước
    const thisMonthOrders = await prisma.order.count({
      where: { createdAt: { gte: startOfMonth } }
    })

    const lastMonthOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth
        }
      }
    })

    let ordersChange = 0
    if (lastMonthOrders > 0) {
      ordersChange = Math.round(((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100)
    } else if (thisMonthOrders > 0) {
      ordersChange = 100
    }

    // ========== ACTION CENTER - PENDING TASKS ==========

    // Seller chờ duyệt — user đã request (role vẫn BUYER, sellerStatus = PENDING)
    const pendingSellers = await prisma.user.count({
      where: {
        sellerStatus: "PENDING"
      }
    })

    // Return requests pending
    const pendingReturns = await prisma.returnRequest.count({
      where: { status: { in: ["PENDING", "SELLER_APPROVED"] } }
    })

    // Complaints and violations - set to 0 if tables don't exist
    // These features can be added when the tables are created
    const pendingComplaints = 0
    const pendingViolations = 0

    // ========== REVENUE CHART DATA ==========

    // Đơn hàng theo ngày (7 ngày gần nhất)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true
      },
      orderBy: { createdAt: "asc" }
    })

    // Group orders by day
    const ordersByDay: Record<string, { count: number; revenue: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split("T")[0]
      ordersByDay[key] = { count: 0, revenue: 0 }
    }

    recentOrders.forEach(order => {
      const key = order.createdAt.toISOString().split("T")[0]
      if (ordersByDay[key]) {
        ordersByDay[key].count++
        if (order.status === "COMPLETED") {
          ordersByDay[key].revenue += Number(order.totalAmount)
        }
      }
    })

    // 30 ngày data
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentOrders30Days = await prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo }
      },
      select: {
        createdAt: true,
        totalAmount: true,
        status: true
      },
      orderBy: { createdAt: "asc" }
    })

    const ordersByDay30: Record<string, { count: number; revenue: number }> = {}
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split("T")[0]
      ordersByDay30[key] = { count: 0, revenue: 0 }
    }

    recentOrders30Days.forEach(order => {
      const key = order.createdAt.toISOString().split("T")[0]
      if (ordersByDay30[key]) {
        ordersByDay30[key].count++
        if (order.status === "COMPLETED") {
          ordersByDay30[key].revenue += Number(order.totalAmount)
        }
      }
    })

    // ========== RECENT ORDERS ==========

    const recentOrdersList = await prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderCode: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        buyer: {
          select: {
            id: true,
            name: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: { items: true }
        }
      }
    })

    // ========== ACTIVITY FEED ==========

    const activities: Array<{
      id: string
      type: string
      title: string
      description?: string
      timestamp: Date
      metadata?: Record<string, string | number>
      link?: string
    }> = []

    // Recent seller registrations (role BUYER, sellerStatus changes)
    const recentSellers = await prisma.user.findMany({
      where: {
        sellerStatus: { in: ["PENDING", "APPROVED", "REJECTED"] },
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        name: true,
        role: true,
        sellerStatus: true,
        createdAt: true
      }
    })

    recentSellers.forEach(seller => {
      const type = seller.sellerStatus === "PENDING" ? "SELLER_REGISTER" 
        : seller.sellerStatus === "APPROVED" ? "SELLER_APPROVED" 
        : "SELLER_REJECTED"
      
      const title = seller.sellerStatus === "PENDING" 
        ? `${seller.name || "Seller"} đăng ký`
        : seller.sellerStatus === "APPROVED"
        ? `Seller ${seller.name || "Unknown"} được duyệt`
        : `Seller ${seller.name || "Unknown"} bị từ chối`

      activities.push({
        id: `seller-${seller.id}`,
        type,
        title,
        timestamp: seller.createdAt
      })
    })

    // Recent orders
    recentOrdersList.slice(0, 3).forEach(order => {
      const type = order.status === "COMPLETED" ? "ORDER_COMPLETED"
        : order.status === "CANCELLED" ? "ORDER_CANCELLED"
        : "ORDER_CREATED"

      const title = order.status === "COMPLETED"
        ? `Đơn #${order.orderCode} hoàn thành`
        : order.status === "CANCELLED"
        ? `Đơn #${order.orderCode} bị hủy`
        : `Đơn #${order.orderCode} tạo mới`

      activities.push({
        id: `order-${order.id}`,
        type,
        title,
        description: `${Number(order.totalAmount).toLocaleString("vi-VN")}₫`,
        timestamp: order.createdAt,
        metadata: { amount: Number(order.totalAmount), items: order._count.items }
      })
    })

    // Recent product approvals
    const recentProducts = await prisma.product.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo }
      },
      orderBy: { createdAt: "desc" },
      take: 2,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true
      }
    })

    recentProducts.forEach(product => {
      const type = product.status === "ACTIVE" ? "PRODUCT_APPROVED"
        : product.status === "REJECTED" ? "PRODUCT_REJECTED"
        : "PRODUCT_APPROVED"

      const title = product.status === "ACTIVE"
        ? `Sản phẩm "${product.title}" được duyệt`
        : product.status === "REJECTED"
        ? `Sản phẩm "${product.title}" bị từ chối`
        : `Sản phẩm "${product.title}" chờ duyệt`

      activities.push({
        id: `product-${product.id}`,
        type,
        title,
        timestamp: product.createdAt
      })
    })

    // Sort activities by timestamp
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    // ========== TOP PERFORMERS ==========

    // Top Sellers by revenue
    const topSellers = await prisma.order.groupBy({
      by: ["sellerId"],
      _sum: { totalAmount: true },
      _count: { id: true },
      where: { status: "COMPLETED" }
    })

    const topSellerIds = topSellers
      .sort((a, b) => Number(b._sum.totalAmount || 0) - Number(a._sum.totalAmount || 0))
      .slice(0, 5)
      .map(s => s.sellerId)

    const topSellerDetails = await prisma.user.findMany({
      where: { id: { in: topSellerIds } },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        sellerStats: {
          select: { avgRating: true }
        }
      }
    })

    const topSellersData = topSellerIds.map((sellerId, index) => {
      const seller = topSellers.find(s => s.sellerId === sellerId)
      const details = topSellerDetails.find(d => d.id === sellerId)
      return {
        id: sellerId,
        name: details?.name || "Unknown",
        email: details?.email || "",
        avatar: details?.avatar || undefined,
        ordersCount: seller?._count.id || 0,
        revenue: Number(seller?._sum.totalAmount) || 0,
        rating: Number(details?.sellerStats?.avgRating) || 0,
        href: `/admin/sellers/${sellerId}`
      }
    })

    // Top Products
    const topProducts = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, price: true },
      where: {
        order: { status: "COMPLETED" }
      }
    })

    const topProductIds = topProducts
      .sort((a, b) => Number(b._sum.price || 0) - Number(a._sum.price || 0))
      .slice(0, 5)
      .map(p => p.productId)

    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: {
        id: true,
        title: true,
        slug: true,
        images: {
          take: 1,
          select: { url: true }
        }
      }
    })

    const topProductsData = topProductIds.map((productId) => {
      const product = topProducts.find(p => p.productId === productId)
      const details = topProductDetails.find(p => p.id === productId)
      return {
        id: productId,
        title: details?.title || "Unknown",
        slug: details?.slug || "",
        image: details?.images[0]?.url || undefined,
        ordersCount: product?._sum.quantity || 0,
        revenue: Number(product?._sum.price) || 0,
        href: `/products/${details?.slug || productId}`
      }
    })

    // Top Brands
    const topBrands = await prisma.product.groupBy({
      by: ["brandId"],
      _count: { id: true },
      where: { status: "ACTIVE" }
    })

    const topBrandIds = topBrands
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 5)
      .map(p => p.brandId)

    const topBrandDetails = await prisma.brand.findMany({
      where: { id: { in: topBrandIds } },
      select: {
        id: true,
        name: true
      }
    })

    // Tính revenue theo brand (approximate)
    const brandRevenues = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { price: true },
      where: {
        order: { status: "COMPLETED" }
      }
    })

    const brandProductMap = await prisma.product.findMany({
      where: { brandId: { in: topBrandIds } },
      select: { id: true, brandId: true }
    })

    const revenueByBrand: Record<string, number> = {}
    brandProductMap.forEach(p => {
      const productRevenue = brandRevenues.find(r => r.productId === p.id)
      if (productRevenue?._sum.price) {
        revenueByBrand[p.brandId] = (revenueByBrand[p.brandId] || 0) + Number(productRevenue._sum.price)
      }
    })

    const topBrandsData = topBrandIds.map(brandId => {
      const details = topBrandDetails.find(b => b.id === brandId)
      const brandProducts = topBrands.find(b => b.brandId === brandId)
      return {
        id: brandId,
        name: details?.name || "Unknown",
        productsCount: brandProducts?._count.id || 0,
        revenue: revenueByBrand[brandId] || 0
      }
    })

    // ========== SYSTEM ALERTS ==========

    const systemAlerts: Array<{
      id: string
      type: string
      severity: string
      title: string
      description?: string
      count?: number
      timestamp?: Date
      link?: string
    }> = []

    // Note: System alerts will be enhanced when Report, Complaint, and Violation tables are added
    // For now, we'll add basic alerts based on pending tasks

    // Alert if there are pending sellers
    if (pendingSellers > 0) {
      systemAlerts.push({
        id: "alert-pending-sellers",
        type: "SELLER_REPORTED",
        severity: pendingSellers > 5 ? "HIGH" : "MEDIUM",
        title: `${pendingSellers} seller chờ duyệt`,
        description: "Cần xem xét và duyệt sellers mới",
        link: "/admin/sellers"
      })
    }

    // Alert if there are pending products
    if (pendingProducts > 0) {
      systemAlerts.push({
        id: "alert-pending-products",
        type: "PRODUCT_SCAM",
        severity: pendingProducts > 10 ? "HIGH" : "MEDIUM",
        title: `${pendingProducts} sản phẩm chờ duyệt`,
        description: "Cần kiểm tra sản phẩm trước khi hiển thị",
        link: "/admin/products?status=PENDING"
      })
    }

    // Pending violations
    if (pendingViolations > 0) {
      systemAlerts.push({
        id: "alert-violations",
        type: "PENDING_VIOLATIONS",
        severity: pendingViolations > 5 ? "HIGH" : "MEDIUM",
        title: `${pendingViolations} báo cáo vi phạm chưa xử lý`,
        link: "/admin/violations"
      })
    }

    // Pending complaints
    if (pendingComplaints > 0) {
      systemAlerts.push({
        id: "alert-complaints",
        type: "PENDING_COMPLAINTS",
        severity: "LOW",
        title: `${pendingComplaints} khiếu nại chưa xử lý`,
        link: "/admin/complaints"
      })
    }

    // ========== ORDERS BY STATUS ==========

    const ordersByStatus = Object.fromEntries(
      orders.map(o => [o.status, o._count.id])
    )

    // ========== BUILD RESPONSE ==========

    const stats = {
      // KPIs
      totalRevenue,
      revenueChange,
      revenueTrend: revenueChange >= 0 ? "up" : "down",
      previousRevenue: lastMonthRevenue,
      totalOrders,
      ordersChange,
      ordersTrend: ordersChange >= 0 ? "up" : "down",
      previousOrders: lastMonthOrders,
      totalUsers,
      usersChange: 0, // Có thể tính thêm nếu cần
      usersTrend: "neutral",
      totalProducts,
      productsChange: 0,
      productsTrend: "neutral",
      activeProducts,

      // Action Center
      pendingTasks: {
        sellers: pendingSellers,
        products: pendingProducts,
        returns: pendingReturns,
        complaints: pendingComplaints,
        violations: pendingViolations,
        total: pendingSellers + pendingProducts + pendingReturns + pendingComplaints + pendingViolations
      },

      // Chart Data
      chartData7Days: Object.entries(ordersByDay).map(([date, data]) => ({
        date,
        label: new Date(date).toLocaleDateString("vi-VN", { weekday: "short", day: "numeric" }),
        ...data
      })),
      chartData30Days: Object.entries(ordersByDay30).map(([date, data]) => ({
        date,
        label: new Date(date).toLocaleDateString("vi-VN", { day: "numeric", month: "short" }),
        ...data
      })),

      // Recent Orders
      recentOrders: recentOrdersList.map(order => ({
        id: order.id,
        orderCode: order.orderCode,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        createdAt: order.createdAt.toISOString(),
        buyer: order.buyer,
        seller: order.seller,
        itemCount: order._count.items
      })),

      // Activity Feed
      activities: activities.slice(0, 10).map(a => ({
        ...a,
        timestamp: a.timestamp.toISOString()
      })),

      // System Alerts
      systemAlerts,

      // Top Performance
      topSellers: topSellersData,
      topProducts: topProductsData,
      topBrands: topBrandsData,

      // Orders by Status
      ordersByStatus
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error("GET /api/admin/stats error:", error)
    return NextResponse.json({ error: "Lỗi server" }, { status: 500 })
  }
}
