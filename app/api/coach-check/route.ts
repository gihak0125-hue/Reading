import { NextResponse } from "next/server";
import { getOpenAI, MODEL_DEFAULT } from "@/lib/openai";

// 진단용(임시): OpenAI 호출이 왜 실패하는지 확인. 확인 후 삭제 예정.
export async function GET() {
  const key = process.env.OPENAI_API_KEY ?? "";
  // 첫 번째 비ASCII(출력가능 ASCII 아님) 문자의 위치와 코드 찾기
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
    keyLen: key.length,
    keyPrefix: key.slice(0, 8),
    keyHasNonAscii: badIndex !== -1,
    badIndex,
    badCode, // 10=줄바꿈, 32=공백, 160=nbsp, 8226=•, 8203=zero-width 등
    baseURL: process.env.OPENAI_BASE_URL ?? null,
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
      message: (err?.message ?? String(e)).slice(0, 200),
      ...info,
    });
  }
}
