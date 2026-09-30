import { NextResponse } from "next/server";
import { readQuartzNote } from "@/lib/quartz-content";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ filename: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { filename: raw } = await context.params;
    const filename = decodeURIComponent(raw);
    const note = await readQuartzNote(filename);
    return NextResponse.json(note);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to read note.";
    const status = /not found/i.test(message)
      ? 404
      : /invalid/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
