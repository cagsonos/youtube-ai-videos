import { prisma } from "@/lib/prisma";
import { exportVideosToExcel } from "@/lib/excel";

export async function GET() {
  try {
    const videos = await prisma.video.findMany({
      orderBy: { id: "asc" },
    });

    const buffer = exportVideosToExcel(videos);
    const date = new Date().toISOString().split("T")[0];

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Neural-Cinema-Biblioteca-${date}.xlsx"`,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Error al exportar",
      },
      { status: 500 }
    );
  }
}
