import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import {
  AiParseTxRequestSchema,
  AI_QUICK_ADD_JSON_SCHEMA,
  parseAiQuickAddResponse,
} from "@/lib/ai-quick-add";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Tối đa 30 lượt nhận diện AI / 10 phút / người dùng
const aiParseLimiter = new SlidingWindowRateLimiter(30, 10 * 60 * 1000);

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
      // Fallback IP
    }
  }

  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `ip:${forwarded || realIp || "local"}`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: "Chưa bật AI phía server (thiếu GEMINI_API_KEY).",
      },
      { status: 503 }
    );
  }

  const rateKey = await resolveRateLimitKey(req);
  const limit = aiParseLimiter.check(rateKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Bạn gọi AI quá nhanh. Thử lại sau ${limit.retryAfterSec} giây nhé.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Yêu cầu không hợp lệ." },
      { status: 400 }
    );
  }

  const parsedReq = AiParseTxRequestSchema.safeParse(body);
  if (!parsedReq.success) {
    return NextResponse.json(
      { ok: false, error: "Vui lòng nhập câu mô tả giao dịch hợp lệ." },
      { status: 400 }
    );
  }

  const { text, today, wallets } = parsedReq.data;
  const walletListText =
    wallets.length > 0
      ? wallets.map((w) => `- id: "${w.id}", tên: "${w.name}"`).join("\n")
      : "(không có danh sách ví)";

  const prompt = `Bạn là bộ phân tích giao dịch tài chính tiếng Việt cho ứng dụng quản lý tiền cá nhân.
Hôm nay là ngày: ${today} (giờ Việt Nam UTC+7).

Danh sách ví hiện có của người dùng:
${walletListText}

Câu người dùng nhập:
"${text}"

Hãy trích xuất 1 hoặc nhiều giao dịch (nếu người dùng kể nhiều khoản trong cùng 1 câu) thành DUY NHẤT một JSON đúng schema:
- Đổi chính xác tiền Việt: "70k" -> 70000, "1tr5" -> 1500000, "50 nghìn" -> 50000.
- Chọn đúng slug danh mục trong: food, transport, shopping, entertainment, health, education, rent, utilities, internet, salary, family, freelance, savings, other.
  Ví dụ: đổ xăng/grab/gửi xe -> transport; ăn uống/trà sữa/cà phê -> food; cắt tóc/quần áo/đồ dùng -> shopping; thuốc/khám -> health; sách/học phí -> education; tiền trọ -> rent; điện nước -> utilities; wifi/4g -> internet.
- Nếu câu nhắc tên ví (vd: "momo", "tiền mặt", "ck"/"chuyển khoản" -> ví Ngân hàng), trả đúng wallet_id từ danh sách trên; nếu không nhắc, trả null.
- Tính đúng ngày YYYY-MM-DD nếu câu có "hôm qua", "hôm kia", "tuần trước"...; mặc định là "${today}".`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      store: false,
      input: prompt,
      response_format: AI_QUICK_ADD_JSON_SCHEMA,
    });

    const parsed = parseAiQuickAddResponse(
      interaction.output_text,
      wallets.map((w) => w.id),
      today
    );

    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      items: parsed.items,
      remainingQuota: limit.remaining,
    });
  } catch (err: unknown) {
    console.error("[ai-parse-tx] Gemini API error:", err);
    return NextResponse.json(
      { ok: false, error: "Không thể kết nối AI lúc này. Bạn vẫn có thể lưu bằng nhận diện nhanh!" },
      { status: 502 }
    );
  }
}
