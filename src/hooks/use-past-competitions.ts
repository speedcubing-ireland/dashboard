import { useEffect, useState } from "react";
import { getAllCompetitions } from "@/services/wca/unofficial";
import type { APICompetition } from "@/types/competition";

export function usePastCompetitions() {
  const [competitions, setCompetitions] = useState<APICompetition[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    getAllCompetitions()
      .then(setCompetitions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectAll = () => setSelected(competitions.map((c) => c.id));
  const deselectAll = () => setSelected([]);

  return {
    competitions,
    selected,
    loading,
    searchTerm,
    setSearchTerm,
    toggle,
    selectAll,
    deselectAll,
    setSelected,
  };
}
