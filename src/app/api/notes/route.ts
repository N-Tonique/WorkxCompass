import { NextResponse } from "next/server";
import { deleteQuartzNote, listQuartzNotes } from "@/lib/quartz-content";

export const runtime = "nodejs";

export async function GET() {
  try {
    const notes = await listQuartzNotes();
    return NextResponse.json({ notes, quartzUrl: "http://localhost:8080" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list Quartz notes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { filename?: string };
    const filename = body.filename?.trim();
    if (!filename) {
      return NextResponse.json(
        { error: "Expected JSON body with filename." },
        { status: 400 },
      );
    }

    const deleted = await deleteQuartzNote(filename);
    const notes = await listQuartzNotes();
    return NextResponse.json({
      ok: true,
      deleted: deleted.filename,
      notes,
      quartzUrl: "http://localhost:8080",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete note.";
    const status = /not found/i.test(message)
      ? 404
      : /invalid|cannot be deleted/i.test(message)
        ? 400
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
