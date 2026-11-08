import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getScoringCriteria, refreshScoringCriteria, saveScoringCriteria } from "@/lib/store";

const DEFAULTS = [
  { id: "innovation",    name: "Innovation",    weight: 5, description: "Originality and creativity of the idea." },
  { id: "design",        name: "Design",        weight: 5, description: "UI / UX quality and visual appeal." },
  { id: "functionality", name: "Functionality", weight: 5, description: "How well the project works." },
];

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || String(Date.now() + Math.random());
}

function ScoringConfigPage() {
  const [criteria, setCriteria] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshScoringCriteria().finally(() => {
      const loaded = getScoringCriteria();
      setCriteria(loaded.length ? loaded : DEFAULTS);
      setLoading(false);
    });
  }, []);

  const update = (id, patch) =>
    setCriteria((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id) => setCriteria((c) => c.filter((x) => x.id !== id));
  const add = () =>
    setCriteria((c) => [...c, { id: uid(), name: "New criterion", weight: 5, description: "" }]);

  const save = async () => {
    const cleaned = criteria
      .map((c) => ({ ...c, name: c.name.trim(), weight: Math.max(1, Math.min(10, Number(c.weight) || 1)) }))
      .filter((c) => c.name);
    if (!cleaned.length) return alert("Add at least one criterion.");
    setSaving(true);
    setError("");
    try {
      const stored = await saveScoringCriteria(cleaned);
      setCriteria(stored);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e.message || "Could not save. Make sure you're logged in as an organizer or admin.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm("Reset to default criteria? This won't save until you click Save.")) return;
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
          Define the criteria judges will use to evaluate submissions. This rubric is shared by
          every judge on every hackathon — stored in the database, not in your browser — so all
          scores stay directly comparable. Each criterion has a name, a short description, and a
          maximum weight (1–10).
        </p>

        {loading && <p className="text-center text-gray-500 py-10">Loading current rubric…</p>}

        {!loading && (
          <>
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

            {error && <p className="text-red-500 text-sm font-medium mt-4">{error}</p>}

            <div className="flex gap-3 mt-8 justify-end">
              <button onClick={reset} className="bg-gray-200 text-[#1f3a68] font-semibold rounded-full px-5 py-2">
                Reset to defaults
              </button>
              <button onClick={save} disabled={saving} className="bg-[#1f3a68] text-white font-bold rounded-full px-8 py-2 disabled:opacity-60">
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ScoringConfigPage;

