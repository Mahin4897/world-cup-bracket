import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

const SAVE_PATH = path.join(
  process.cwd(),
  "data",
  "tournament-simulations.json",
);
const LEGACY_SAVE_PATH = path.join(
  process.cwd(),
  "data",
  "tournament-state.json",
);

function ensureDir() {
  const dir = path.dirname(SAVE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function emptyStore() {
  return {
    activeSimulationId: null,
    simulations: [],
  };
}

function normalizeStore(data) {
  if (Array.isArray(data?.simulations)) {
    return {
      activeSimulationId:
        data.activeSimulationId ?? data.simulations[0]?.id ?? null,
      simulations: data.simulations.map((simulation) => ({
        id: String(simulation.id),
        name: simulation.name || "Untitled simulation",
        createdAt: simulation.createdAt || new Date().toISOString(),
        updatedAt: simulation.updatedAt || new Date().toISOString(),
        groupScores: simulation.groupScores || {},
        groupModes: simulation.groupModes || {},
        manualGroupRankings: simulation.manualGroupRankings || {},
        manualThirdQualifiers: Array.isArray(simulation.manualThirdQualifiers)
          ? simulation.manualThirdQualifiers
          : [],
        knockoutResults: simulation.knockoutResults || {},
      })),
    };
  }

  if (data?.groupScores && data?.knockoutResults) {
    const now = new Date().toISOString();
    return {
      activeSimulationId: "legacy-save",
      simulations: [
        {
          id: "legacy-save",
          name: "Saved simulation",
          createdAt: now,
          updatedAt: now,
          groupScores: data.groupScores,
          groupModes: {},
          manualGroupRankings: {},
          manualThirdQualifiers: [],
          knockoutResults: data.knockoutResults,
        },
      ],
    };
  }

  return emptyStore();
}

function readStore() {
  ensureDir();

  if (fs.existsSync(SAVE_PATH)) {
    return normalizeStore(JSON.parse(fs.readFileSync(SAVE_PATH, "utf-8")));
  }

  if (fs.existsSync(LEGACY_SAVE_PATH)) {
    return normalizeStore(
      JSON.parse(fs.readFileSync(LEGACY_SAVE_PATH, "utf-8")),
    );
  }

  return emptyStore();
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(
    SAVE_PATH,
    JSON.stringify(normalizeStore(store), null, 2),
    "utf-8",
  );
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function GET() {
  try {
    return NextResponse.json(readStore());
  } catch (err) {
    console.error("GET /api/tournament error:", err);
    return NextResponse.json(
      { error: "Failed to load state" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (
      !body.id ||
      !body.name ||
      !isObject(body.groupScores) ||
      !isObject(body.knockoutResults) ||
      (body.groupModes !== undefined && !isObject(body.groupModes)) ||
      (body.manualGroupRankings !== undefined &&
        !isObject(body.manualGroupRankings)) ||
      (body.manualThirdQualifiers !== undefined &&
        !Array.isArray(body.manualThirdQualifiers))
    ) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const store = readStore();
    const now = new Date().toISOString();
    const simulation = {
      id: String(body.id),
      name: String(body.name).trim() || "Untitled simulation",
      createdAt: body.createdAt || now,
      updatedAt: now,
      groupScores: body.groupScores,
      groupModes: body.groupModes || {},
      manualGroupRankings: body.manualGroupRankings || {},
      manualThirdQualifiers: body.manualThirdQualifiers || [],
      knockoutResults: body.knockoutResults,
    };
    const index = store.simulations.findIndex(
      (item) => item.id === simulation.id,
    );

    if (index >= 0) store.simulations[index] = simulation;
    else store.simulations.unshift(simulation);

    store.activeSimulationId = simulation.id;
    writeStore(store);
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    console.error("POST /api/tournament error:", err);
    return NextResponse.json(
      { error: "Failed to save state" },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const store = readStore();

    if (
      body.activeSimulationId &&
      !store.simulations.some((item) => item.id === body.activeSimulationId)
    ) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 },
      );
    }

    store.activeSimulationId = body.activeSimulationId ?? null;
    writeStore(store);
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    console.error("PATCH /api/tournament error:", err);
    return NextResponse.json(
      { error: "Failed to update active simulation" },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { id } = await request.json();
    const store = readStore();
    const nextSimulations = store.simulations.filter((item) => item.id !== id);

    if (nextSimulations.length === store.simulations.length) {
      return NextResponse.json(
        { error: "Simulation not found" },
        { status: 404 },
      );
    }

    store.simulations = nextSimulations;
    if (store.activeSimulationId === id) {
      store.activeSimulationId = nextSimulations[0]?.id ?? null;
    }

    writeStore(store);
    return NextResponse.json({ ok: true, store });
  } catch (err) {
    console.error("DELETE /api/tournament error:", err);
    return NextResponse.json(
      { error: "Failed to delete simulation" },
      { status: 500 },
    );
  }
}
