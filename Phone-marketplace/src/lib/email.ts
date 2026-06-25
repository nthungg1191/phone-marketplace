import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: parseInt(process.env.EMAIL_SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASS,
  },
})

interface OrderEmailData {
  to: string
  buyerName: string
  orderCode: string
  totalAmount: number
  items: Array<{
    title: string
    price: number
    quantity: number
    image: string
  }>
  shippingAddress: string
  paymentMethod: string
  paymentDeadline?: string | null
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
  }).format(amount)
}

export async function sendOrderConfirmationEmail(data: OrderEmailData) {
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <img src="${item.image}" alt="${item.title}" width="50" height="50" style="vertical-align: middle; border-radius: 4px; object-fit: cover;" />
          <span style="margin-left: 10px; vertical-align: middle;">${item.title}</span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatPrice(item.price * item.quantity)}</td>
      </tr>
    `
    )
    .join("")

  const paymentInfoHtml =
    data.paymentMethod === "SEPAY"
      ? `<p style="margin: 0 0 8px;"><strong>Thanh toán:</strong> <span style="color: #e67e22;">Chuyển khoản SEPAY</span></p>
         <p style="margin: 0 0 8px;"><strong>Hạn thanh toán:</strong> <span style="color: #c0392b;">${data.paymentDeadline || "30 phút"}</span></p>`
      : `<p style="margin: 0 0 8px;"><strong>Thanh toán:</strong> <span style="color: #27ae60;">Thanh toán khi nhận hàng (COD)</span></p>`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Xác nhận đơn hàng</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">Cảm ơn bạn đã đặt hàng tại HNT!</p>
    </div>

    <!-- Body -->
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px; font-size: 16px;">Xin chào <strong>${data.buyerName}</strong>,</p>
      <p style="margin: 0 0 20px; font-size: 15px; color: #555;">Đơn hàng <strong style="color: #667eea;">#${data.orderCode}</strong> của bạn đã được tạo thành công.</p>

      <!-- Order Info -->
      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 16px; color: #333; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">Thông tin đơn hàng</h3>
        <p style="margin: 0 0 8px;"><strong>Mã đơn hàng:</strong> <span style="color: #667eea; font-weight: bold;">#${data.orderCode}</span></p>
        <p style="margin: 0 0 8px;"><strong>Địa chỉ giao hàng:</strong> ${data.shippingAddress}</p>
        ${paymentInfoHtml}
      </div>

      <!-- Items Table -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px; color: #333; font-size: 16px;">Sản phẩm đã đặt</h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee; border-radius: 8px; overflow: hidden;">
          <thead>
            <tr style="background: #667eea; color: white;">
              <th style="padding: 12px; text-align: left;">Sản phẩm</th>
              <th style="padding: 12px; text-align: center;">SL</th>
              <th style="padding: 12px; text-align: right;">Đơn giá</th>
              <th style="padding: 12px; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding: 12px; text-align: right; font-weight: bold; background: #f8f9fa;">Tổng cộng:</td>
              <td style="padding: 12px; text-align: right; font-weight: bold; background: #f8f9fa; color: #667eea; font-size: 18px;">${formatPrice(data.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Footer Message -->
      <div style="background: #e8f5e9; border-radius: 8px; padding: 16px; border-left: 4px solid #27ae60;">
        <p style="margin: 0; font-size: 14px; color: #2e7d32;">
          ${data.paymentMethod === "SEPAY"
            ? "Vui lòng thanh toán trước khi hết thời hạn. Sau khi thanh toán thành công, đơn hàng sẽ được xác nhận và giao cho bạn trong thời gian sớm nhất."
            : "Đơn hàng của bạn đã được xác nhận. Người bán sẽ chuẩn bị và giao hàng trong thời gian sớm nhất. Vui lòng thanh toán khi nhận được hàng."
          }
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #888;">Nếu có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
      <p style="margin: 0; font-size: 14px; color: #888;">© 2025 HNT Marketplace</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `
Xin chào ${data.buyerName},

Don hang #${data.orderCode} cua ban da duoc tao thanh cong.

Thong tin don hang:
- Ma don hang: #${data.orderCode}
- Dia chi giao hang: ${data.shippingAddress}
- Thanh toan: ${data.paymentMethod === "SEPAY" ? "Chuyen khoan SEPAY" : "Thanh toan khi nhan hang (COD)"}
- Tong cong: ${formatPrice(data.totalAmount)}

San pham:
${data.items.map((item) => `- ${item.title} x${item.quantity}: ${formatPrice(item.price * item.quantity)}`).join("\n")}

Cam on ban da dat hang tai HNT!
  `

  try {
    await transporter.sendMail({
      from: `"HNT Marketplace" <${process.env.EMAIL_FROM}>`,
      to: data.to,
      subject: `[HNT] Xác nhận đơn hàng #${data.orderCode}`,
      text: textContent,
      html,
    })
    console.log(`[Email] Da gui email xac nhan don hang ${data.orderCode} toi ${data.to}`)
  } catch (error) {
    console.error(`[Email] Loi gui email xac nhan don hang ${data.orderCode}:`, error)
  }
}

// ─── Password Reset ────────────────────────────────────────────────────────────

export function generateResetToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let token = ""
  for (let i = 0; i < 48; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

interface PasswordResetResult {
  success: boolean
  error?: string
}

export async function sendPasswordResetEmail(
  email: string,
  token: string
): Promise<PasswordResetResult> {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Đặt lại mật khẩu</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 16px;">HNT Marketplace</p>
    </div>
    <div style="padding: 30px;">
      <p style="margin: 0 0 20px; font-size: 16px;">Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p style="margin: 0 0 20px; font-size: 15px; color: #555;">Nhấn vào nút bên dưới để đặt lại mật khẩu. Liên kết này sẽ hết hạn sau <strong>60 phút</strong>.</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: bold;">Đặt lại mật khẩu</a>
      </div>
      <p style="margin: 0 0 20px; font-size: 14px; color: #888;">Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
      <div style="background: #fff3cd; border-radius: 8px; padding: 16px; border-left: 4px solid #ffc107;">
        <p style="margin: 0; font-size: 14px; color: #856404;">
          <strong>Lưu ý bảo mật:</strong> Không chia sẻ liên kết này với ai. Đội ngũ HNT sẽ không bao giờ hỏi mật khẩu của bạn.
        </p>
      </div>
    </div>
    <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 14px; color: #888;">© 2025 HNT Marketplace</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    await transporter.sendMail({
      from: `"HNT Marketplace" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "[HNT] Yêu cầu đặt lại mật khẩu",
      html,
    })
    console.log(`[Email] Da gui email reset password toi ${email}`)
    return { success: true }
  } catch (error) {
    console.error(`[Email] Loi gui email reset password toi ${email}:`, error)
    return { success: false, error: String(error) }
  }
}
