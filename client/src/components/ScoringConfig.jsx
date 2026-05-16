import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";

const STORAGE_KEY = "smarthack.scoring.criteria";

const DEFAULTS = [
  { id: "innovation",    name: "Innovation",    weight: 5, description: "Originality and creativity of the idea." },
  { id: "design",        name: "Design",        weight: 5, description: "UI / UX quality and visual appeal." },
  { id: "functionality", name: "Functionality", weight: 5, description: "How well the project works." },
];

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return DEFAULTS;
}

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
}

function ScoringConfigPage() {
  const [criteria, setCriteria] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => setCriteria(load()), []);

  const update = (id, patch) =>
    setCriteria((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id) => setCriteria((c) => c.filter((x) => x.id !== id));
  const add = () =>
    setCriteria((c) => [...c, { id: uid(), name: "New criterion", weight: 5, description: "" }]);

  const save = () => {
    const cleaned = criteria
      .map((c) => ({ ...c, name: c.name.trim(), weight: Math.max(1, Math.min(10, Number(c.weight) || 1)) }))
      .filter((c) => c.name);
    if (!cleaned.length) return alert("Add at least one criterion.");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    setCriteria(cleaned);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const reset = () => {
    if (!confirm("Reset to default criteria?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setCriteria(DEFAULTS);
  };

  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between">
        <h1 className="text-[#1f3a68] text-xl font-bold">Customized Scoring</h1>
        <Link to="/admin-dashboard" className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <p className="text-gray-700 mb-6">
          Define the criteria judges will use to evaluate submissions. Each criterion has a name,
          a short description, and a maximum weight (1–10).
        </p>

        <div className="space-y-4">
          {criteria.map((c) => (
            <div key={c.id} className="bg-[#cfe0f3] rounded-xl p-4 grid gap-3 md:grid-cols-[1fr_2fr_120px_80px] items-start">
              <div>
                <label className="block text-xs font-bold text-[#1f3a68] mb-1">Name</label>
                <input
                  value={c.name}
                  onChange={(e) => update(c.id, { name: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white text-[#1f3a68] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1f3a68] mb-1">Description</label>
                <input
                  value={c.description}
                  onChange={(e) => update(c.id, { description: e.target.value })}
                  className="w-full px-3 py-2 rounded-md bg-white text-[#1f3a68] outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#1f3a68] mb-1">Max weight</label>
                <input
                  type="number" min={1} max={10} value={c.weight}
                  onChange={(e) => update(c.id, { weight: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md bg-white text-[#1f3a68] outline-none"
                />
              </div>
              <div className="md:pt-6">
                <button onClick={() => remove(c.id)} className="bg-red-600 text-white rounded px-3 py-2 text-sm w-full">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button onClick={add} className="bg-[#5B8FCF] text-white font-semibold rounded-full px-5 py-2">
            + Add criterion
          </button>
          <p className="text-sm text-gray-600">Total max points: <b>{totalWeight}</b></p>
        </div>

        <div className="flex gap-3 mt-8 justify-end">
          <button onClick={reset} className="bg-gray-200 text-[#1f3a68] font-semibold rounded-full px-5 py-2">
            Reset to defaults
          </button>
          <button onClick={save} className="bg-[#1f3a68] text-white font-bold rounded-full px-8 py-2">
            {saved ? "✓ Saved" : "Save"}
          </button>
        </div>
      </main>
    </div>
  );
}

export default ScoringConfigPage;
