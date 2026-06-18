"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TEAMS, loadTeamsFromMatches } from "@/data/teams";

const STORAGE_KEY = "worldcup-bracket-simulations";

const THIRD_PLACE_SLOT_GROUPS = {
  74: ["A", "B", "C", "D", "F"],
  77: ["C", "D", "F", "G", "H"],
  79: ["C", "E", "F", "H", "I"],
  80: ["E", "H", "I", "J", "K"],
  81: ["B", "E", "F", "I", "J"],
  82: ["A", "E", "H", "I", "J"],
  85: ["E", "F", "G", "I", "J"],
  87: ["D", "E", "I", "J", "L"],
};

const MANUAL_PLACEMENTS = ["first", "second", "third"];

function emptyStore() {
  return {
    activeSimulationId: null,
    simulations: [],
  };
}

function normalizeStore(data) {
  if (!Array.isArray(data?.simulations)) return emptyStore();

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

function readLocalStore() {
  if (typeof window === "undefined") return emptyStore();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyStore();

  return normalizeStore(JSON.parse(raw));
}

function writeLocalStore(store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeStore(store)),
  );
}

function compareStandings(a, b, groupMatches) {
  if (b.points !== a.points) return b.points - a.points;
  if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
  if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;

  const h2hMatches = groupMatches.filter(
    (match) =>
      (match.home === a.team.name && match.away === b.team.name) ||
      (match.home === b.team.name && match.away === a.team.name),
  );

  let h2hA = 0;
  let gdA = 0;
  let h2hB = 0;
  let gdB = 0;

  h2hMatches.forEach((match) => {
    if (!match.score) return;

    const aHome = match.home === a.team.name;
    const aGoals = aHome ? match.score.homeGoals : match.score.awayGoals;
    const bGoals = aHome ? match.score.awayGoals : match.score.homeGoals;

    if (aGoals > bGoals) h2hA += 3;
    else if (aGoals === bGoals) {
      h2hA += 1;
      h2hB += 1;
    } else h2hB += 3;

    gdA += aGoals - bGoals;
    gdB += bGoals - aGoals;
  });

  if (h2hB !== h2hA) return h2hB - h2hA;
  if (gdB !== gdA) return gdB - gdA;
  return 0;
}

function makeSimulationId() {
  return `sim-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRound(round) {
  const labels = {
    "Quarter-final": "Quarter-finals",
    "Semi-final": "Semi-finals",
    "Match for third place": "3rd Place",
  };

  return labels[round] || round;
}

function groupCode(group) {
  return group.replace(/^Group\s*/i, "");
}

function emptyManualRanking() {
  return {
    first: null,
    second: null,
    third: null,
  };
}

function buildUniformGroupModes(matches, mode = "scores") {
  return Object.fromEntries(
    [
      ...new Set(
        matches.filter((match) => match.group).map((match) => match.group),
      ),
    ].map((group) => [group, mode]),
  );
}

function normalizeGroupModes(matches, storedModes) {
  const hasManualMode = Object.values(storedModes || {}).some(
    (mode) => mode === "manual",
  );

  return buildUniformGroupModes(matches, hasManualMode ? "manual" : "scores");
}

function buildManualStandings(teams, ranking) {
  const nextRanking = { ...emptyManualRanking(), ...(ranking || {}) };
  const chosen = [];
  const used = new Set();

  MANUAL_PLACEMENTS.forEach((placement) => {
    const teamName = nextRanking[placement];
    if (
      teamName &&
      teams.some((team) => team.name === teamName) &&
      !used.has(teamName)
    ) {
      chosen.push(teamName);
      used.add(teamName);
    }
  });

  teams.forEach((team) => {
    if (!used.has(team.name)) chosen.push(team.name);
  });

  return chosen
    .map((teamName, index) => {
      const team = teams.find((item) => item.name === teamName);
      if (!team) return null;

      return {
        team,
        points: index === 0 ? 9 : index === 1 ? 6 : index === 2 ? 3 : 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        manualRank: index + 1,
      };
    })
    .filter(Boolean);
}

function assignThirdPlaceSlots(bestThirds) {
  const teamsByGroup = new Map(
    bestThirds.map((team) => [groupCode(team.group), team]),
  );
  const selectedGroups = new Set(teamsByGroup.keys());
  const orderedSlots = Object.entries(THIRD_PLACE_SLOT_GROUPS)
    .map(([slotId, allowedGroups]) => ({
      slotId,
      candidateGroups: allowedGroups.filter((group) =>
        selectedGroups.has(group),
      ),
    }))
    .sort((a, b) => a.candidateGroups.length - b.candidateGroups.length);

  const assignments = {};
  const usedGroups = new Set();

  function backtrack(index) {
    if (index === orderedSlots.length) return true;

    const slot = orderedSlots[index];
    for (const group of slot.candidateGroups) {
      if (usedGroups.has(group)) continue;

      assignments[slot.slotId] = teamsByGroup.get(group);
      usedGroups.add(group);

      if (backtrack(index + 1)) {
        return true;
      }

      usedGroups.delete(group);
      delete assignments[slot.slotId];
    }

    return false;
  }

  backtrack(0);
  return assignments;
}

function buildInitialScores(matches) {
  const scores = {};

  matches.forEach((match) => {
    if (match.group && match.score) {
      scores[`${match.team1}::${match.team2}`] = {
        homeGoals: match.score.ft[0],
        awayGoals: match.score.ft[1],
      };
    }
  });

  return scores;
}

function upsertSimulation(simulations, simulation) {
  const index = simulations.findIndex((item) => item.id === simulation.id);
  if (index === -1) return [simulation, ...simulations];

  const next = [...simulations];
  next[index] = simulation;
  return next;
}

export function useTournament() {
  const [matchesData, setMatchesData] = useState([]);
  const [defaultGroupScores, setDefaultGroupScores] = useState({});
  const [groupScores, setGroupScores] = useState({});
  const [groupModes, setGroupModes] = useState({});
  const [manualGroupRankings, setManualGroupRankings] = useState({});
  const [manualThirdQualifiers, setManualThirdQualifiers] = useState([]);
  const [knockoutResults, setKnockoutResults] = useState({});
  const [simulations, setSimulations] = useState([]);
  const [activeSimulationId, setActiveSimulationId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    async function loadTournament() {
      try {
        const worldCupRes = await fetch("/worldcup.json");
        const data = await worldCupRes.json();
        const allMatches = data.matches;
        const initialScores = buildInitialScores(allMatches);
        const initialGroupModes = buildUniformGroupModes(allMatches);
        const savedStore = readLocalStore();
        const savedSimulations = savedStore.simulations || [];
        const activeId =
          savedStore.activeSimulationId || savedSimulations[0]?.id || null;
        const activeSimulation =
          savedSimulations.find((simulation) => simulation.id === activeId) ||
          savedSimulations[0];

        setMatchesData(allMatches);
        setDefaultGroupScores(initialScores);
        loadTeamsFromMatches(allMatches);

        if (activeSimulation) {
          setGroupScores({
            ...initialScores,
            ...(activeSimulation.groupScores || {}),
          });
          setGroupModes(
            normalizeGroupModes(allMatches, activeSimulation.groupModes),
          );
          setManualGroupRankings(activeSimulation.manualGroupRankings || {});
          setManualThirdQualifiers(
            activeSimulation.manualThirdQualifiers || [],
          );
          setKnockoutResults(activeSimulation.knockoutResults || {});
          setActiveSimulationId(activeSimulation.id);
        } else {
          setGroupScores(initialScores);
          setGroupModes(initialGroupModes);
          setManualGroupRankings({});
          setManualThirdQualifiers([]);
          setKnockoutResults({});
        }

        setSimulations(savedSimulations);
        setDirty(false);
      } catch (error) {
        console.error("Failed to load tournament:", error);
        setSaveError("Could not load local simulations.");
      } finally {
        setLoading(false);
      }
    }

    loadTournament();
  }, []);

  const persistSimulation = useCallback(
    (simulation) => {
      setSaving(true);
      setSaveError("");

      try {
        const nextSimulations = upsertSimulation(simulations, simulation);
        writeLocalStore({
          activeSimulationId: simulation.id,
          simulations: nextSimulations,
        });
        setSimulations(nextSimulations);
        setActiveSimulationId(simulation.id);
        setDirty(false);
      } catch (error) {
        console.error("Failed to save tournament locally:", error);
        setSaveError("Could not save simulation locally.");
      } finally {
        setSaving(false);
      }
    },
    [simulations],
  );

  const setStoredActiveSimulation = useCallback(
    (id) => {
      try {
        writeLocalStore({ activeSimulationId: id, simulations });
      } catch (error) {
        console.error("Failed to update active local simulation:", error);
      }
    },
    [simulations],
  );

  const groupMatches = useMemo(
    () =>
      matchesData
        .filter((match) => match.group)
        .map((match) => ({
          home: match.team1,
          away: match.team2,
          group: match.group,
          key: `${match.team1}::${match.team2}`,
        })),
    [matchesData],
  );

  const groupTeamsByGroup = useMemo(() => {
    const map = {};

    groupMatches.forEach((match) => {
      if (!map[match.group]) map[match.group] = [];

      [match.home, match.away].forEach((teamName) => {
        if (!map[match.group].some((team) => team.name === teamName)) {
          const team = TEAMS.find(
            (item) => item.group === match.group && item.name === teamName,
          );
          if (team) map[match.group].push(team);
        }
      });
    });

    return map;
  }, [groupMatches]);

  const setGroupScore = useCallback((home, away, homeGoals, awayGoals) => {
    setGroupScores((prev) => ({
      ...prev,
      [`${home}::${away}`]: { homeGoals, awayGoals },
    }));
    setKnockoutResults({});
    setDirty(true);
  }, []);

  const setAllGroupModes = useCallback(
    (mode) => {
      setGroupModes(buildUniformGroupModes(matchesData, mode));
      setKnockoutResults({});
      setDirty(true);
    },
    [matchesData],
  );

  const setManualGroupRanking = useCallback((group, placement, teamName) => {
    setManualGroupRankings((prev) => {
      const nextGroupRanking = {
        ...emptyManualRanking(),
        ...(prev[group] || {}),
        [placement]: teamName || null,
      };

      if (teamName) {
        MANUAL_PLACEMENTS.forEach((slot) => {
          if (slot !== placement && nextGroupRanking[slot] === teamName) {
            nextGroupRanking[slot] = null;
          }
        });
      }

      return {
        ...prev,
        [group]: nextGroupRanking,
      };
    });
    setKnockoutResults({});
    setDirty(true);
  }, []);

  const groupStandings = useMemo(() => {
    const groups = Object.keys(groupTeamsByGroup).sort();
    const standings = {};

    groups.forEach((group) => {
      const teams = groupTeamsByGroup[group] ?? [];

      if (groupModes[group] === "manual") {
        standings[group] = buildManualStandings(
          teams,
          manualGroupRankings[group],
        );
        return;
      }

      const stats = teams.map((team) => ({
        team,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      }));

      groupMatches
        .filter((match) => match.group === group)
        .forEach((match) => {
          const score = groupScores[match.key];
          if (!score) return;

          const home = stats.find((stat) => stat.team.name === match.home);
          const away = stats.find((stat) => stat.team.name === match.away);
          if (!home || !away) return;

          home.goalsFor += score.homeGoals;
          home.goalsAgainst += score.awayGoals;
          away.goalsFor += score.awayGoals;
          away.goalsAgainst += score.homeGoals;

          if (score.homeGoals > score.awayGoals) home.points += 3;
          else if (score.homeGoals < score.awayGoals) away.points += 3;
          else {
            home.points += 1;
            away.points += 1;
          }
        });

      stats.forEach((stat) => {
        stat.goalDiff = stat.goalsFor - stat.goalsAgainst;
      });

      const matchesWithScores = groupMatches
        .filter((match) => match.group === group)
        .map((match) => ({ ...match, score: groupScores[match.key] }));

      standings[group] = stats.sort((a, b) =>
        compareStandings(a, b, matchesWithScores),
      );
    });

    return standings;
  }, [
    groupMatches,
    groupModes,
    groupScores,
    groupTeamsByGroup,
    manualGroupRankings,
  ]);

  const hasManualGroups = useMemo(
    () => Object.values(groupModes).some((mode) => mode === "manual"),
    [groupModes],
  );

  const thirdPlaceCandidates = useMemo(
    () =>
      Object.values(groupStandings)
        .map((group) => group[2]?.team)
        .filter(Boolean),
    [groupStandings],
  );

  const thirdPlaceCandidateNames = useMemo(
    () => new Set(thirdPlaceCandidates.map((team) => team.name)),
    [thirdPlaceCandidates],
  );

  const activeManualThirdQualifiers = useMemo(
    () =>
      manualThirdQualifiers
        .filter((teamName) => thirdPlaceCandidateNames.has(teamName))
        .slice(0, 8),
    [manualThirdQualifiers, thirdPlaceCandidateNames],
  );

  const toggleManualThirdQualifier = useCallback(
    (teamName) => {
      if (!thirdPlaceCandidateNames.has(teamName)) return;

      setManualThirdQualifiers((prev) => {
        const sanitized = prev
          .filter((item) => thirdPlaceCandidateNames.has(item))
          .slice(0, 8);

        if (sanitized.includes(teamName)) {
          return sanitized.filter((item) => item !== teamName);
        }

        if (sanitized.length >= 8) return sanitized;
        return [...sanitized, teamName];
      });
      setKnockoutResults({});
      setDirty(true);
    },
    [thirdPlaceCandidateNames],
  );

  const advancing = useMemo(() => {
    const winners = [];
    const runnersUp = [];
    const thirds = [];

    Object.values(groupStandings).forEach((group) => {
      if (group.length >= 2) {
        winners.push(group[0].team);
        runnersUp.push(group[1].team);
      }
      if (group.length >= 3) thirds.push(group[2]);
    });

    if (hasManualGroups) {
      const selectedThirds = thirds
        .filter((stat) => activeManualThirdQualifiers.includes(stat.team.name))
        .map((stat) => stat.team);

      return {
        winners,
        runnersUp,
        bestThirds: selectedThirds,
        thirdCandidates: thirds.map((stat) => stat.team),
        thirdQualifiersComplete: selectedThirds.length === 8,
      };
    }

    const bestThirds = [...thirds]
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
        return b.goalsFor - a.goalsFor;
      })
      .slice(0, 8)
      .map((stat) => stat.team);

    return {
      winners,
      runnersUp,
      bestThirds,
      thirdCandidates: thirds.map((stat) => stat.team),
      thirdQualifiersComplete: bestThirds.length === 8,
    };
  }, [groupStandings, hasManualGroups, activeManualThirdQualifiers]);

  const thirdPlaceSlotAssignments = useMemo(
    () => assignThirdPlaceSlots(advancing.bestThirds),
    [advancing.bestThirds],
  );

  const knockoutMatches = useMemo(() => {
    if (
      matchesData.length === 0 ||
      advancing.winners.length < 12 ||
      advancing.runnersUp.length < 12 ||
      advancing.bestThirds.length < 8
    ) {
      return [];
    }

    const koData = matchesData.filter((match) => !match.group);
    const allKoMatches = koData.map((match) => ({
      id: `M${match.num}`,
      round: normalizeRound(match.round),
      team1Placeholder: match.team1,
      team2Placeholder: match.team2,
      winner: knockoutResults[`M${match.num}`] || undefined,
    }));

    const resolve = (placeholder) => {
      if (placeholder.startsWith("1")) {
        const group = placeholder[1];
        return (
          advancing.winners.find((team) => groupCode(team.group) === group)
            ?.name || null
        );
      }

      if (placeholder.startsWith("2")) {
        const group = placeholder[1];
        return (
          advancing.runnersUp.find((team) => groupCode(team.group) === group)
            ?.name || null
        );
      }

      if (placeholder.startsWith("3")) {
        const slotMatchNum = koData.find(
          (match) => match.team1 === placeholder || match.team2 === placeholder,
        )?.num;

        if (slotMatchNum && thirdPlaceSlotAssignments[slotMatchNum]) {
          return thirdPlaceSlotAssignments[slotMatchNum].name;
        }

        return null;
      }

      if (placeholder.startsWith("W")) {
        const prevMatchNum = placeholder.slice(1);
        return knockoutResults[`M${prevMatchNum}`] || null;
      }

      if (placeholder.startsWith("L")) {
        const prevMatchNum = placeholder.slice(1);
        const semiWin = knockoutResults[`M${prevMatchNum}`];
        const match = allKoMatches.find(
          (item) => item.id === `M${prevMatchNum}`,
        );
        if (!match || !semiWin) return null;

        const team1 = resolve(match.team1Placeholder);
        const team2 = resolve(match.team2Placeholder);
        return semiWin === team1 ? team2 : team1;
      }

      return null;
    };

    return allKoMatches.map((match) => ({
      ...match,
      team1: resolve(match.team1Placeholder),
      team2: resolve(match.team2Placeholder),
    }));
  }, [matchesData, advancing, knockoutResults, thirdPlaceSlotAssignments]);

  const randomizeGroupScores = useCallback(() => {
    const newScores = {};

    groupMatches.forEach((match) => {
      newScores[match.key] = {
        homeGoals: Math.floor(Math.random() * 5),
        awayGoals: Math.floor(Math.random() * 5),
      };
    });

    setGroupScores(newScores);
    setGroupModes(buildUniformGroupModes(matchesData));
    setManualGroupRankings({});
    setManualThirdQualifiers([]);
    setKnockoutResults({});
    setDirty(true);
  }, [groupMatches, matchesData]);

  const setKnockoutWinner = useCallback((matchId, winner) => {
    setKnockoutResults((prev) => ({ ...prev, [matchId]: winner }));
    setDirty(true);
  }, []);

  const resetAll = useCallback(() => {
    setGroupScores(defaultGroupScores);
    setGroupModes(buildUniformGroupModes(matchesData));
    setManualGroupRankings({});
    setManualThirdQualifiers([]);
    setKnockoutResults({});
    setDirty(true);
  }, [defaultGroupScores, matchesData]);

  const createSimulation = useCallback(() => {
    const now = new Date().toISOString();
    const simulation = {
      id: makeSimulationId(),
      name: `Simulation ${simulations.length + 1}`,
      createdAt: now,
      updatedAt: now,
      groupScores: defaultGroupScores,
      groupModes: buildUniformGroupModes(matchesData),
      manualGroupRankings: {},
      manualThirdQualifiers: [],
      knockoutResults: {},
    };

    setGroupScores(defaultGroupScores);
    setGroupModes(buildUniformGroupModes(matchesData));
    setManualGroupRankings({});
    setManualThirdQualifiers([]);
    setKnockoutResults({});
    persistSimulation(simulation);
  }, [defaultGroupScores, matchesData, persistSimulation, simulations.length]);

  const saveSimulation = useCallback(() => {
    const activeSimulation = simulations.find(
      (simulation) => simulation.id === activeSimulationId,
    );
    const now = new Date().toISOString();

    if (activeSimulation) {
      persistSimulation({
        ...activeSimulation,
        updatedAt: now,
        groupScores,
        groupModes,
        manualGroupRankings,
        manualThirdQualifiers: activeManualThirdQualifiers,
        knockoutResults,
      });
      return;
    }

    persistSimulation({
      id: makeSimulationId(),
      name: `Simulation ${simulations.length + 1}`,
      createdAt: now,
      updatedAt: now,
      groupScores,
      groupModes,
      manualGroupRankings,
      manualThirdQualifiers: activeManualThirdQualifiers,
      knockoutResults,
    });
  }, [
    activeSimulationId,
    activeManualThirdQualifiers,
    groupModes,
    groupScores,
    knockoutResults,
    manualGroupRankings,
    persistSimulation,
    simulations,
  ]);

  const saveAsSimulation = useCallback(() => {
    const now = new Date().toISOString();

    persistSimulation({
      id: makeSimulationId(),
      name: `Simulation ${simulations.length + 1}`,
      createdAt: now,
      updatedAt: now,
      groupScores,
      groupModes,
      manualGroupRankings,
      manualThirdQualifiers: activeManualThirdQualifiers,
      knockoutResults,
    });
  }, [
    activeManualThirdQualifiers,
    groupModes,
    groupScores,
    knockoutResults,
    manualGroupRankings,
    persistSimulation,
    simulations.length,
  ]);

  const loadSimulation = useCallback(
    (id) => {
      const simulation = simulations.find((item) => item.id === id);
      if (!simulation) return;

      setGroupScores({
        ...defaultGroupScores,
        ...(simulation.groupScores || {}),
      });
      setGroupModes(normalizeGroupModes(matchesData, simulation.groupModes));
      setManualGroupRankings(simulation.manualGroupRankings || {});
      setManualThirdQualifiers(simulation.manualThirdQualifiers || []);
      setKnockoutResults(simulation.knockoutResults || {});
      setActiveSimulationId(simulation.id);
      setStoredActiveSimulation(simulation.id);
      setDirty(false);
    },
    [defaultGroupScores, matchesData, setStoredActiveSimulation, simulations],
  );

  const renameSimulation = useCallback(
    (name) => {
      const activeSimulation = simulations.find(
        (simulation) => simulation.id === activeSimulationId,
      );

      if (!activeSimulation) return;

      setSimulations((prev) =>
        prev.map((simulation) =>
          simulation.id === activeSimulationId
            ? {
                ...simulation,
                name,
                groupScores,
                groupModes,
                manualGroupRankings,
                manualThirdQualifiers: activeManualThirdQualifiers,
                knockoutResults,
              }
            : simulation,
        ),
      );
      setDirty(true);
    },
    [
      activeSimulationId,
      activeManualThirdQualifiers,
      groupModes,
      groupScores,
      knockoutResults,
      manualGroupRankings,
      simulations,
    ],
  );

  const canSaveSimulation =
    !hasManualGroups || advancing.thirdQualifiersComplete;

  return {
    loading,
    groupMatches,
    groupTeamsByGroup,
    groupScores,
    groupModes,
    manualGroupRankings,
    manualThirdQualifiers: activeManualThirdQualifiers,
    hasManualGroups,
    canSaveSimulation,
    setGroupScore,
    setAllGroupModes,
    setManualGroupRanking,
    toggleManualThirdQualifier,
    groupStandings,
    advancing,
    knockoutMatches,
    knockoutResults,
    setKnockoutWinner,
    randomizeGroupScores,
    resetAll,
    saving,
    saveError,
    dirty,
    simulations,
    activeSimulationId,
    createSimulation,
    saveSimulation,
    saveAsSimulation,
    loadSimulation,
    renameSimulation,
  };
}
