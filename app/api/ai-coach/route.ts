import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import {
  AiCoachInputSchema,
  AI_COACH_JSON_SCHEMA,
  parseAiCoachResponse,
} from "@/lib/ai-coach";
import { SlidingWindowRateLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Tối đa 15 lượt phân tích AI / 10 phút / người dùng
const aiCoachLimiter = new SlidingWindowRateLimiter(15, 10 * 60 * 1000);

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
      // Fallback sang IP
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
        error:
          "Tính năng Trợ lý AI chưa được kích hoạt (thiếu GEMINI_API_KEY phía server).",
      },
      { status: 503 }
    );
  }

  const rateKey = await resolveRateLimitKey(req);
  const limit = aiCoachLimiter.check(rateKey);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `Bạn đã gọi phân tích AI quá nhanh. Vui lòng thử lại sau ${limit.retryAfterSec} giây.`,
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dữ liệu gửi lên không hợp lệ." },
      { status: 400 }
    );
  }

  const parsedInput = AiCoachInputSchema.safeParse(body);
  if (!parsedInput.success) {
    return NextResponse.json(
      { ok: false, error: "Thiếu hoặc sai định dạng số liệu tài chính." },
      { status: 400 }
    );
  }

  const d = parsedInput.data;
  const prompt = `Bạn là trợ lý tài chính cá nhân thân thiện, tinh tế (kiểu người bạn đồng hành GenZ, không dạy đời, nói thẳng dễ hiểu, dùng tiếng Việt tự nhiên) cho một sinh viên Việt Nam.

Dưới đây là số liệu tổng hợp (đơn vị: VNĐ) trong tháng ${d.month}:
- Tổng thu tháng này: ${d.income.toLocaleString("vi-VN")} đ (tháng trước: ${d.prevIncome.toLocaleString("vi-VN")} đ)
- Tổng chi tháng này: ${d.expense.toLocaleString("vi-VN")} đ (tháng trước: ${d.prevExpense.toLocaleString("vi-VN")} đ)
- Ví khả dụng hiện có: ${d.availableBalance.toLocaleString("vi-VN")} đ
- Tiết kiệm đã khóa: ${d.lockedSavings.toLocaleString("vi-VN")} đ
- Hóa đơn định kỳ chưa trả: ${d.unpaidBills.toLocaleString("vi-VN")} đ
- Mức tiêu an toàn (Safe-to-Spend): ${Math.round(d.safeToSpendDaily).toLocaleString("vi-VN")} đ/ngày (còn ${d.daysRemaining} ngày trong tháng)
- Top danh mục chi nhiều nhất: ${d.topCategories.length > 0 ? d.topCategories.map((c) => `${c.name}: ${c.amount.toLocaleString("vi-VN")} đ (${Math.round(c.share)}%)`).join("; ") : "Chưa có chi tiêu"}
- Ngân sách: ${d.budgets.length > 0 ? d.budgets.map((b) => `${b.name}: ${b.spent.toLocaleString("vi-VN")}/${b.limit.toLocaleString("vi-VN")} đ (${Math.round(b.percentage)}%)`).join("; ") : "Chưa đặt"}
- Mục tiêu tiết kiệm: ${d.goals.length > 0 ? d.goals.map((g) => `${g.name}: ${g.saved.toLocaleString("vi-VN")}/${g.target.toLocaleString("vi-VN")} đ (${Math.round(g.percent)}%)`).join("; ") : "Chưa đặt"}

Hãy đánh giá tiến trình dùng tiền và đưa lời khuyên tiết kiệm sát thực tế sinh viên, trả về DUY NHẤT JSON đúng schema.`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash-lite",
      store: false,
      input: prompt,
      response_format: AI_COACH_JSON_SCHEMA,
    });

    const parsed = parseAiCoachResponse(interaction.output_text);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 422 });
    }

    return NextResponse.json({
      ok: true,
      data: parsed.data,
      remainingQuota: limit.remaining,
    });
  } catch (err: unknown) {
    console.error("[ai-coach] Gemini API error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: "Không thể kết nối Trợ lý AI lúc này. Vui lòng thử lại sau nhé.",
      },
      { status: 502 }
    );
  }
}
