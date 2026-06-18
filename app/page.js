"use client";

import { useState } from "react";
import GroupStage from "@/components/GroupStage";
import KnockoutBracket from "@/components/KnockoutBracket";
import { useTournament } from "@/hooks/useTournament";

function SimulationBar({ tournament }) {
  const {
    simulations,
    activeSimulationId,
    loadSimulation,
    createSimulation,
    saveSimulation,
    saveAsSimulation,
    renameSimulation,
    saving,
    saveError,
    dirty,
    hasManualGroups,
    canSaveSimulation,
  } = tournament;
  const activeSimulation = simulations.find(
    (simulation) => simulation.id === activeSimulationId,
  );
  const statusText = saveError
    ? saveError
    : saving
      ? "Saving..."
      : hasManualGroups && !canSaveSimulation
        ? "Select 8 third-place teams"
        : dirty
          ? "Unsaved changes"
          : activeSimulation
            ? "Saved"
            : "Unsaved draft";

  return (
    <section className="simulation-bar">
      <div className="simulation-fields">
        <span className="simulation-label">Simulation</span>
        <select
          value={activeSimulationId || ""}
          onChange={(event) => loadSimulation(event.target.value)}
          className="control-field simulation-select"
          disabled={simulations.length === 0}
        >
          {simulations.length === 0 ? (
            <option value="">No saved simulations</option>
          ) : (
            simulations.map((simulation) => (
              <option key={simulation.id} value={simulation.id}>
                {simulation.name}
              </option>
            ))
          )}
        </select>
        <input
          value={activeSimulation?.name || ""}
          onChange={(event) => renameSimulation(event.target.value)}
          className="control-field simulation-name"
          placeholder="Name this simulation"
          disabled={!activeSimulation}
        />
      </div>

      <div className="simulation-actions">
        <span className={saveError ? "save-status error" : "save-status"}>
          {statusText}
        </span>
        <button onClick={createSimulation} className="btn-ghost action-button">
          New
        </button>
        <button
          onClick={saveSimulation}
          className="btn-primary action-button"
          disabled={
            saving ||
            !canSaveSimulation ||
            (!dirty && Boolean(activeSimulation))
          }
        >
          Save
        </button>
        <button
          onClick={saveAsSimulation}
          className="btn-ghost action-button"
          disabled={saving || !canSaveSimulation}
        >
          Save Copy
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  const [tab, setTab] = useState("group");
  const tournament = useTournament();

  return (
    <main className="app-shell">
      <header className="hero-header fade-up">
        <div className="hero-eyebrow">FIFA / Official Predictor</div>

        <h1 className="hero-title display gold">
          World Cup<span className="text-[var(--text-primary)] ml-3">2026</span>
        </h1>

        <p className="hero-hosts">USA / Canada / Mexico</p>

        <div className="hero-rule">
          <span />
          <i />
          <span />
        </div>
      </header>

      <SimulationBar tournament={tournament} />

      <div className="tab-nav-wrap">
        <div className="tab-nav">
          <button
            onClick={() => setTab("group")}
            className={`btn-ghost tab-button ${tab === "group" ? "active" : ""}`}
          >
            Group Stage
          </button>
          <button
            onClick={() => setTab("knockout")}
            className={`btn-ghost tab-button ${
              tab === "knockout" ? "active" : ""
            }`}
          >
            Knockout Bracket
          </button>
        </div>
      </div>

      <div className="fade-up" key={tab}>
        {tab === "group" ? (
          <GroupStage tournament={tournament} />
        ) : (
          <KnockoutBracket tournament={tournament} />
        )}
      </div>
    </main>
  );
}
