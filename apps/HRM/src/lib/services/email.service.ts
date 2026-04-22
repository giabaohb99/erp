import nodemailer from "nodemailer"

const RTR_COMPANY = {
  name: "Công ty TNHH POD SOFTWARE",
  shortName: "POD SOFTWARE",
  address: "K4.50 Đường Nile, KDC River Park, P.Phước Long, TP.Thủ Đức, TP.HCM",
  phone: "(028) 8386 9999",
  email: "hr@podsoftware.vn",
}

function getTransporter() {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !port || !user || !pass) {
    return null
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port, 10),
    secure: parseInt(port, 10) === 465,
    auth: { user, pass },
  })
}

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
  <tr><td style="background:#1E3A5F;padding:20px 32px;">
    <h1 style="margin:0;color:#ffffff;font-size:20px;">${RTR_COMPANY.shortName} — HRM</h1>
  </td></tr>
  <tr><td style="padding:32px;">
    ${content}
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
    <p style="margin:0;font-size:12px;color:#64748b;">
      ${RTR_COMPANY.name}<br/>
      ${RTR_COMPANY.address}<br/>
      ${RTR_COMPANY.phone} | ${RTR_COMPANY.email}
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

async function send(to: string, subject: string, html: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.log(`[Email] SMTP not configured — skipping email to ${to}: ${subject}`)
    return null
  }

  try {
    const result = await transporter.sendMail({
      from: `"${RTR_COMPANY.shortName} HRM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    console.log(`[Email] Sent to ${to}: ${subject}`)
    return result
  } catch (error) {
    console.error(`[Email] Failed to send to ${to}:`, error)
    return null
  }
}

function uniqueEmails(...emails: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const unique: string[] = []

  for (const raw of emails) {
    const email = raw?.trim()
    if (!email || !email.includes("@")) continue

    const key = email.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    unique.push(email)
  }

  return unique
}

async function sendMany(toEmails: string[], subject: string, html: string) {
  const recipients = uniqueEmails(...toEmails)
  if (recipients.length === 0) {
    console.log(`[Email] No recipients — skipping: ${subject}`)
    return []
  }

  const results = []
  for (const to of recipients) {
    results.push(await send(to, subject, html))
  }
  return results
}

function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.AUTH_URL ||
    ""
  ).replace(/\/+$/, "")
}

function buildReportApprovalUrl(reportId: string): string {
  const baseUrl = getAppBaseUrl()
  const path = `/reports/${reportId}`
  return baseUrl ? `${baseUrl}${path}` : path
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—"
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

function formatDateRange(startDate?: Date | string | null, endDate?: Date | string | null): string {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start === end || end === "—") return start
  return `${start} - ${end}`
}

export interface PayslipEmailData {
  toEmail: string
  employeeName: string
  employeeCode: string
  month: number
  year: number
  baseSalary: number
  totalContractSalary: number
  totalActualSalary: number
  actualDays: number
  standardDays: number
  items: { type: string; label: string; amount: number }[]
  totalEmployeeIns: number
  pitAmount: number
  advanceDeduction: number
  netSalary: number
  bankAccount: string
  bankName: string
}

function fmtVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"
}

function maskBank(account: string): string {
  if (!account || account.length <= 4) return account || "—"
  return "****" + account.slice(-4)
}

function buildPayslipHtml(p: PayslipEmailData): string {
  const period = `${String(p.month).padStart(2, "0")}/${p.year}`
  const nextMonth = p.month === 12 ? 1 : p.month + 1
  const nextYear = p.month === 12 ? p.year + 1 : p.year
  const estimatedPayDate = `05-10/${String(nextMonth).padStart(2, "0")}/${nextYear}`

  const bonusItems = p.items.filter((i) => i.amount > 0 && !i.type.includes("DEDUCTION"))
  const bonusRows = bonusItems.map((i) =>
    `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;">${i.label}</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${fmtVND(i.amount)}</td></tr>`
  ).join("")

  return baseTemplate(`
    <h2 style="color:#1E3A5F;margin-top:0;">Phiếu Lương Tháng ${period}</h2>
    <p>Xin chào <strong>${p.employeeName}</strong> (${p.employeeCode}),</p>
    <p>Phiếu lương kỳ <strong>${period}</strong> của bạn:</p>

    <!-- Thông Tin Công -->
    <h3 style="color:#1E3A5F;margin-bottom:8px;font-size:14px;">Thông Tin Công</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;width:50%;">Ngày công thực tế</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${p.actualDays}/${p.standardDays}</td></tr>
    </table>

    <!-- Lương HĐ -->
    <h3 style="color:#1E3A5F;margin-bottom:8px;font-size:14px;">Lương Hợp Đồng</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;width:50%;">Lương cơ bản</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${fmtVND(p.baseSalary)}</td></tr>
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Tổng lương HĐ</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${fmtVND(p.totalContractSalary)}</td></tr>
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Lương thực tế</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${fmtVND(p.totalActualSalary)}</td></tr>
    </table>

    ${bonusRows ? `
    <!-- Tăng Thêm -->
    <h3 style="color:#1E3A5F;margin-bottom:8px;font-size:14px;">Tăng Thêm</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${bonusRows}
    </table>
    ` : ""}

    <!-- Khấu Trừ -->
    <h3 style="color:#1E3A5F;margin-bottom:8px;font-size:14px;">Khấu Trừ</h3>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;width:50%;">BH người lao động</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#dc2626;">${fmtVND(p.totalEmployeeIns)}</td></tr>
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Thuế TNCN</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#dc2626;">${fmtVND(p.pitAmount)}</td></tr>
      ${p.advanceDeduction > 0 ? `<tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Trừ tạm ứng</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;color:#dc2626;">${fmtVND(p.advanceDeduction)}</td></tr>` : ""}
    </table>

    <!-- THỰC LĨNH -->
    <div style="background:#f0f9ff;border:2px solid #1E3A5F;border-radius:8px;padding:16px;text-align:center;margin:16px 0;">
      <p style="margin:0 0 4px;color:#64748b;font-size:12px;">THỰC LĨNH</p>
      <p style="margin:0;color:#1E3A5F;font-size:28px;font-weight:bold;">${fmtVND(p.netSalary)}</p>
    </div>

    <!-- Ngân Hàng -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;width:50%;">Số TK ngân hàng</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${maskBank(p.bankAccount)}</td></tr>
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Ngân hàng</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${p.bankName || "—"}</td></tr>
      <tr><td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:bold;">Dự kiến chuyển khoản</td><td style="padding:6px 8px;border:1px solid #e2e8f0;text-align:right;">${estimatedPayDate}</td></tr>
    </table>

    <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Đây là phiếu lương điện tử. Vui lòng không reply email này.</p>
  `)
}

export const emailService = {
  send,
  sendMany,
  uniqueEmails,
  buildReportApprovalUrl,

  async sendContractExpiryAlert(params: {
    toEmail: string
    employeeName: string
    contractNo: string
    expiryDate: string
    daysLeft: number
  }) {
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">Thông báo hợp đồng sắp hết hạn</h2>
      <p>Xin chào,</p>
      <p>Hợp đồng lao động của nhân viên sau sắp hết hạn:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.employeeName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Số hợp đồng</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.contractNo}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Ngày hết hạn</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.expiryDate}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Còn lại</td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626;font-weight:bold;">${params.daysLeft} ngày</td></tr>
      </table>
      <p>Vui lòng kiểm tra và xử lý gia hạn hoặc tái ký hợp đồng kịp thời.</p>
    `)
    return send(params.toEmail, `[HRM] Hợp đồng sắp hết hạn — ${params.employeeName} (${params.daysLeft} ngày)`, html)
  },

  async sendWelcomeEmployee(params: {
    toEmail: string
    employeeName: string
    employeeCode: string
  }) {
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">Chào mừng đến với ${RTR_COMPANY.shortName}!</h2>
      <p>Xin chào <strong>${params.employeeName}</strong>,</p>
      <p>Chúng tôi rất vui mừng chào đón bạn gia nhập đội ngũ ${RTR_COMPANY.name}.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Mã nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.employeeCode}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Email công ty</td><td style="padding:8px;border:1px solid #e2e8f0;">${params.toEmail}</td></tr>
      </table>
      <p>Chúc bạn có những trải nghiệm tuyệt vời tại RTR!</p>
    `)
    return send(params.toEmail, `[HRM] Chào mừng ${params.employeeName} đến với ${RTR_COMPANY.shortName}`, html)
  },

  async sendPayslip(params: PayslipEmailData) {
    const html = buildPayslipHtml(params)
    return send(params.toEmail, `[HRM] Phiếu lương tháng ${params.month}/${params.year} — ${params.employeeName}`, html)
  },

  buildPayslipHtml(params: PayslipEmailData): string {
    return buildPayslipHtml(params)
  },

  isSmtpConfigured(): boolean {
    return getTransporter() !== null
  },

  async sendReportPendingApproval(params: {
    toEmail?: string
    toEmails?: string[]
    managerName?: string
    recipientName?: string
    employeeName: string
    employeeCode?: string | null
    reportType: string
    reportId: string
    startDate?: Date | string | null
    endDate?: Date | string | null
    notes?: string | null
    approvalUrl?: string
    approvalLevel?: "L1" | "L2"
  }) {
    const approvalUrl = params.approvalUrl || buildReportApprovalUrl(params.reportId)
    const recipientName = params.recipientName || params.managerName || "anh/chị"
    const dateRange = formatDateRange(params.startDate, params.endDate)
    const notes = params.notes?.trim()
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">Đơn từ chờ phê duyệt</h2>
      <p>Xin chào <strong>${escapeHtml(recipientName)}</strong>,</p>
      <p>Có một đơn từ mới đang chờ bạn xem xét và phê duyệt:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Loại đơn</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.reportType)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.employeeName)}${params.employeeCode ? ` (${escapeHtml(params.employeeCode)})` : ""}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Thời gian</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(dateRange)}</td></tr>
        ${notes ? `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Ghi chú</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(notes)}</td></tr>` : ""}
      </table>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(approvalUrl)}" style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
          Mở trang duyệt
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Nếu nút không mở được, copy đường dẫn này vào trình duyệt:<br/>${escapeHtml(approvalUrl)}</p>
    `)
    return sendMany(
      uniqueEmails(params.toEmail, ...(params.toEmails || [])),
      `[HRM] Đơn từ chờ phê duyệt — ${params.employeeName}`,
      html
    )
  },

  async sendReportSubmittedConfirmation(params: {
    toEmail?: string
    toEmails?: string[]
    employeeName: string
    employeeCode?: string | null
    reportType: string
    reportId: string
    startDate?: Date | string | null
    endDate?: Date | string | null
    notes?: string | null
    isResubmission?: boolean
  }) {
    const reportUrl = buildReportApprovalUrl(params.reportId)
    const dateRange = formatDateRange(params.startDate, params.endDate)
    const notes = params.notes?.trim()
    const actionLabel = params.isResubmission ? "nộp lại" : "nộp"
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">${params.isResubmission ? "Đã nộp lại đơn" : "Đã nộp đơn thành công"}</h2>
      <p>Xin chào <strong>${escapeHtml(params.employeeName)}</strong>,</p>
      <p>Bạn đã ${escapeHtml(actionLabel)} đơn thành công. Đơn hiện đã được gửi đến Quản lý và HR để xử lý.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Loại đơn</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.reportType)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.employeeName)}${params.employeeCode ? ` (${escapeHtml(params.employeeCode)})` : ""}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Thời gian</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(dateRange)}</td></tr>
        ${notes ? `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Ghi chú</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(notes)}</td></tr>` : ""}
      </table>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
          Mở chi tiết đơn
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Nếu nút không mở được, copy đường dẫn này vào trình duyệt:<br/>${escapeHtml(reportUrl)}</p>
    `)
    return sendMany(
      uniqueEmails(params.toEmail, ...(params.toEmails || [])),
      `[HRM] ${params.isResubmission ? "Đã nộp lại đơn" : "Đã nộp đơn"} — ${params.reportType}`,
      html
    )
  },

  async sendReportReturned(params: {
    toEmail?: string
    toEmails?: string[]
    employeeName: string
    employeeCode?: string | null
    reportType: string
    reportId?: string
    startDate?: Date | string | null
    endDate?: Date | string | null
    notes?: string | null
    reason: string
    returnedLevel?: "L1" | "L2"
  }) {
    const reportUrl = params.reportId ? buildReportApprovalUrl(params.reportId) : ""
    const dateRange = formatDateRange(params.startDate, params.endDate)
    const notes = params.notes?.trim()
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">Đơn từ bị trả lại</h2>
      <p>Xin chào <strong>${escapeHtml(params.employeeName)}</strong>,</p>
      <p>Đơn từ của bạn đã bị trả lại và cần chỉnh sửa:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Loại đơn</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.reportType)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.employeeName)}${params.employeeCode ? ` (${escapeHtml(params.employeeCode)})` : ""}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Thời gian</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(dateRange)}</td></tr>
        ${notes ? `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Ghi chú</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(notes)}</td></tr>` : ""}
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Lý do trả lại</td><td style="padding:8px;border:1px solid #e2e8f0;color:#dc2626;">${escapeHtml(params.reason)}</td></tr>
      </table>
      ${reportUrl ? `
      <p style="margin:24px 0;">
        <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
          Mở chi tiết đơn
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Nếu nút không mở được, copy đường dẫn này vào trình duyệt:<br/>${escapeHtml(reportUrl)}</p>
      ` : ""}
      <p>Vui lòng đăng nhập hệ thống HRM để chỉnh sửa và gửi lại.</p>
    `)
    return sendMany(
      uniqueEmails(params.toEmail, ...(params.toEmails || [])),
      `[HRM] Đơn từ bị trả lại — ${params.reportType}`,
      html
    )
  },

  async sendReportApproved(params: {
    toEmail?: string
    toEmails?: string[]
    employeeName: string
    employeeCode?: string | null
    reportType: string
    reportId: string
    startDate?: Date | string | null
    endDate?: Date | string | null
    notes?: string | null
  }) {
    const reportUrl = buildReportApprovalUrl(params.reportId)
    const dateRange = formatDateRange(params.startDate, params.endDate)
    const notes = params.notes?.trim()
    const html = baseTemplate(`
      <h2 style="color:#1E3A5F;margin-top:0;">Đơn từ đã được duyệt</h2>
      <p>Xin chào <strong>${escapeHtml(params.employeeName)}</strong>,</p>
      <p>Đơn từ của bạn đã được phê duyệt thành công.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;width:40%;">Loại đơn</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.reportType)}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Nhân viên</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(params.employeeName)}${params.employeeCode ? ` (${escapeHtml(params.employeeCode)})` : ""}</td></tr>
        <tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Thời gian</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(dateRange)}</td></tr>
        ${notes ? `<tr><td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;">Ghi chú</td><td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(notes)}</td></tr>` : ""}
      </table>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#1E3A5F;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:bold;">
          Mở chi tiết đơn
        </a>
      </p>
      <p style="font-size:12px;color:#64748b;">Nếu nút không mở được, copy đường dẫn này vào trình duyệt:<br/>${escapeHtml(reportUrl)}</p>
    `)
    return sendMany(
      uniqueEmails(params.toEmail, ...(params.toEmails || [])),
      `[HRM] Đơn từ đã được duyệt — ${params.reportType}`,
      html
    )
  },
}
