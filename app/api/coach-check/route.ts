import { NextResponse } from "next/server";
import { getOpenAI, MODEL_DEFAULT } from "@/lib/openai";

export const dynamic = "force-dynamic";

// 진단용(임시). 런타임에 env를 읽는다(bracket 접근 → 인라인 방지).
export async function GET() {
  const name = "OPENAI_API_KEY";
  const key = process.env[name] ?? "";
  let badIndex = -1;
  let badCode = -1;
  for (let i = 0; i < key.length; i++) {
    const c = key.charCodeAt(i);
    if (c < 0x21 || c > 0x7e) {
      badIndex = i;
      badCode = c;
      break;
    }
  }
  const info = {
    probe: "PROBE_A7",
    keyLen: key.length,
    keyHasNonAscii: badIndex !== -1,
    badIndex,
    badCode,
    baseURL: process.env["OPENAI_BASE_URL"] ?? null,
    model: MODEL_DEFAULT(),
  };
  try {
    const res = await getOpenAI().chat.completions.create({
      model: MODEL_DEFAULT(),
      messages: [{ role: "user", content: "hi" }],
      max_tokens: 1,
    });
    return NextResponse.json({ ok: true, actualModel: res.model, ...info });
  } catch (e) {
    const err = e as { name?: string; status?: number; message?: string };
    return NextResponse.json({
      ok: false,
      name: err?.name ?? null,
      status: err?.status ?? null,
      message: (err?.message ?? String(e)).slice(0, 160),
      ...info,
    });
  }
}
