import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import {
  parseReceiptResponse,
  RECEIPT_RESPONSE_JSON_SCHEMA,
} from "@/lib/receipt-parser";
import { receiptScanLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1600; // tối đa 1600px cạnh dài
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const RECEIPT_PROMPT = `Bạn là hệ thống trích xuất thông tin hóa đơn bán lẻ tại Việt Nam.
Hãy đọc ảnh hóa đơn này và trả về DUY NHẤT một đối tượng JSON đúng cấu trúc:
{
  "merchant": "tên cửa hàng/quán",
  "date": "YYYY-MM-DD hoặc null nếu không thấy",
  "total": số tiền tổng thanh toán cuối cùng bằng VNĐ (số nguyên dương, bỏ dấu chấm/phẩy),
  "items": [{ "name": "tên món", "amount": số tiền VNĐ }],
  "suggested_category": "một trong: food, transport, shopping, entertainment, health, education, rent, utilities, internet, other"
}
Lưu ý:
- Chỉ lấy tổng tiền thanh toán cuối cùng (sau giảm giá/VAT).
- Không giải thích thêm, chỉ trả JSON hợp lệ.`;

/** Xác định key rate limit theo user_id (nếu có Bearer token Supabase) hoặc IP */
async function resolveRateLimitKey(req: NextRequest): Promise<string> {
  const authHeader = req.headers.get("authorization");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (authHeader?.startsWith("Bearer ") && supabaseUrl && supabaseKey) {
    try {
      const token = authHeader.slice(7);
      const sb = createClient(supabaseUrl, supabaseKey);
      const { data } = await sb.auth.getUser(token);
      if (data.user?.id) return `user:${data.user.id}`;
    } catch {
      // Fallback sang IP nếu token không xác thực được
    }
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `ip:${forwarded || realIp || "local"}`;
}

export async function POST(req: NextRequest) {
  // 1. Kiểm tra API key phía server (KHÔNG dùng NEXT_PUBLIC_)
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Chưa cấu hình GEMINI_API_KEY phía server. Vui lòng thêm vào .env.local và khởi động lại.",
      },
      { status: 503 }
    );
  }

  // 2. Rate limit theo từng người dùng
  const rateKey = await resolveRateLimitKey(req);
  const limit = receiptScanLimiter.check(rateKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Bạn đã quét quá nhiều lần. Vui lòng thử lại sau ${limit.retryAfterSec} giây.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSec) },
      }
    );
  }

  // 3. Đọc và kiểm tra file ảnh
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Yêu cầu không hợp lệ (cần multipart/form-data)." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Không tìm thấy tệp ảnh hóa đơn." },
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Tệp ảnh rỗng." },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhẹ hơn." },
      { status: 413 }
    );
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) {
    return NextResponse.json(
      { ok: false, error: "Chỉ hỗ trợ ảnh định dạng JPG, PNG, WebP hoặc HEIC." },
      { status: 415 }
    );
  }

  // 4. Nén ảnh phía server xuống tối đa 1600px cạnh dài (không lưu xuống đĩa)
  let base64Image: string;
  try {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const compressedBuffer = await sharp(inputBuffer)
      .rotate() // Tự xoay đúng chiều theo EXIF camera điện thoại
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();

    base64Image = compressedBuffer.toString("base64");
  } catch {
    return NextResponse.json(
      { ok: false, error: "Không thể xử lý tệp ảnh này. Vui lòng chụp hoặc chọn ảnh khác." },
      { status: 400 }
    );
  }

  // 5. Gọi Gemini API (model gemini-3.5-flash-lite — nhanh, rẻ, hỗ trợ gói miễn phí; store: false để bảo vệ riêng tư)
  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      store: false,
      input: [
        { type: "text", text: RECEIPT_PROMPT },
        {
          type: "image",
          data: base64Image,
          mime_type: "image/jpeg",
        },
      ],
      response_format: RECEIPT_RESPONSE_JSON_SCHEMA,
    });

    const parsed = parseReceiptResponse(interaction.output_text);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      data: parsed.data,
      remainingQuota: limit.remaining,
    });
  } catch (err: unknown) {
    console.error("[scan-receipt] Gemini API error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Không thể kết nối dịch vụ đọc hóa đơn lúc này. Vui lòng thử lại hoặc nhập tay.",
      },
      { status: 502 }
    );
  }
}
