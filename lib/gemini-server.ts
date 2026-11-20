/**
 * lib/gemini-server.ts
 * Helper dùng chung phía server để gọi Gemini Interactions API (@google/genai v3+)
 * với structured JSON output đúng chuẩn schema mới (Api-Revision 2026-05-20+)
 * và fallback model tự động khi gặp lỗi tạm thời.
 */
import { GoogleGenAI } from "@google/genai";

const MODEL_CANDIDATES = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
] as const;

type InteractionContentPart =
  | { type: "text"; text: string }
  | { type: "image"; data: string; mime_type: string };

export interface CallGeminiJsonOptions {
  apiKey: string;
  input: string | InteractionContentPart[];
  schema: Record<string, unknown>;
}

interface GeminiErrorInfo {
  status?: number;
  message: string;
}

export function extractGeminiErrorInfo(err: unknown): GeminiErrorInfo {
  if (err && typeof err === "object") {
    const obj = err as Record<string, unknown>;
    const rawStatus = obj.status ?? obj.statusCode ?? obj.code;
    const status = typeof rawStatus === "number" ? rawStatus : undefined;
    const message =
      typeof obj.message === "string"
        ? obj.message
        : String(err);
    return { status, message };
  }
  return { message: String(err) };
}

/**
 * Gọi Gemini Interactions API trả về JSON tuân theo JSON Schema.
 * Tự động thử fallback sang model kế tiếp nếu model đầu báo 404 hoặc 503.
 */
export async function callGeminiStructuredJson(
  opts: CallGeminiJsonOptions
): Promise<string | null | undefined> {
  const cleanKey = opts.apiKey.trim();
  const ai = new GoogleGenAI({ apiKey: cleanKey });

  let lastError: unknown;
  for (let i = 0; i < MODEL_CANDIDATES.length; i++) {
    const model = MODEL_CANDIDATES[i];
    try {
      const interaction = await ai.interactions.create({
        model,
        store: false,
        input: opts.input,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: opts.schema,
        },
      });
      return interaction.output_text;
    } catch (err: unknown) {
      lastError = err;
      const info = extractGeminiErrorInfo(err);
      const isRetryableModelErr =
        info.status === 404 ||
        info.status === 503 ||
        /not found|unavailable|overloaded/i.test(info.message);

      if (isRetryableModelErr && i < MODEL_CANDIDATES.length - 1) {
        console.warn(
          `[gemini-server] Model ${model} failed (${info.status ?? "unknown"}), falling back to ${MODEL_CANDIDATES[i + 1]}`
        );
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Chuyển lỗi từ Gemini API thành HTTP status + thông báo tiếng Việt dễ hiểu (không lộ bí mật).
 */
export function mapGeminiErrorToUserResponse(
  err: unknown,
  fallbackMessage: string
): { status: number; error: string } {
  const info = extractGeminiErrorInfo(err);

  if (info.status === 401 || info.status === 403 || /api key|permission|unauthenticated|forbidden/i.test(info.message)) {
    return {
      status: 502,
      error:
        "Khóa GEMINI_API_KEY không hợp lệ hoặc chưa có quyền truy cập. Hãy kiểm tra lại biến GEMINI_API_KEY trên Vercel.",
    };
  }

  if (info.status === 429 || /quota|rate limit|resource exhausted/i.test(info.message)) {
    return {
      status: 429,
      error:
        "AI đang chạm giới hạn lượt miễn phí phút này. Đợi khoảng 30 giây rồi thử lại nhé.",
    };
  }

  return {
    status: 502,
    error: fallbackMessage,
  };
}
