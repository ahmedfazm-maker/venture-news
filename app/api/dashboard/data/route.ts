import { NextRequest, NextResponse } from "next/server";
import { getJob, getEditions } from "@/lib/kv";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ valid: false }, { status: 401 });
  }

  const [job, editions] = await Promise.all([getJob(), getEditions()]);

  return NextResponse.json({ valid: true, job, editions });
}
