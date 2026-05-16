import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  evaluateSubmission,
  evaluationFor,
  getHackathon,
  getSubmissions,
} from "@/lib/store";

const STORAGE_KEY = "smarthack.scoring.criteria";
const DEFAULTS = [
  { id: "innovation",    name: "Innovation",    weight: 5, description: "Originality and creativity of the idea." },
  { id: "design",        name: "Design",        weight: 5, description: "UI / UX quality and visual appeal." },
  { id: "functionality", name: "Functionality", weight: 5, description: "How well the project works." },
];

function loadCriteria() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return DEFAULTS;
}

function EvaluationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId");

  const [criteria, setCriteria] = useState(DEFAULTS);
  const [sub, setSub] = useState(null);
  const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [readonly, setReadonly] = useState(false);

  useEffect(() => {
    const c = loadCriteria();
    setCriteria(c);

    const s = submissionId
      ? (getSubmissions() || []).find((x) => x.id === submissionId)
      : null;

    if (!s) { setSub(null); return; }
    setSub(s);

    const ev = evaluationFor(s.id);
    if (ev) {
      // Hydrate from saved scores object, falling back to legacy fields
      const initial = {};
      c.forEach((cr) => {
        if (ev.scores && ev.scores[cr.id] != null) initial[cr.id] = ev.scores[cr.id];
        else if (ev[cr.id] != null) initial[cr.id] = ev[cr.id];
        else initial[cr.id] = "";
      });
      setScores(initial);
      setFeedback(ev.feedback || "");
      setReadonly(true);
    } else {
      const blank = {};
      c.forEach((cr) => { blank[cr.id] = ""; });
      setScores(blank);
      setFeedback("");
      setReadonly(false);
    }
  }, [submissionId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!sub) return;
    const missing = criteria.some((c) => scores[c.id] === "" || scores[c.id] == null);
    if (missing || !feedback.trim()) {
      setError("⚠️ All fields are required.");
      return;
    }
    setError("");

    const payload = {
      submissionId: sub.id,
      feedback: feedback.trim(),
      scores: { ...scores },
      // keep legacy fields populated when present so older views still work
      innovation: scores.innovation ?? 0,
      design: scores.design ?? 0,
      functionality: scores.functionality ?? 0,
    };
    evaluateSubmission(payload);
    navigate("/evaluation-submitted");
  };

  const hack = sub ? getHackathon(sub.hackathonId) : null;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#5B8FCF] px-6 py-4 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">Project Evaluation</h1>
        <Link to="/judge-dashboard" className="text-white text-2xl">←</Link>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        {!sub ? (
          <p className="text-center text-gray-500">No submission selected.</p>
        ) : (
          <form onSubmit={handleSubmit} className="rounded-xl border bg-white p-8 shadow-sm">
            <div className="border-b pb-3 mb-6 text-center">
              <h2 className="text-lg"><strong>Project:</strong> {hack?.title || "—"}</h2>
              {readonly && (
                <div className="mt-3 inline-flex items-center gap-2 bg-green-100 border-2 border-green-500 text-green-700 font-bold px-4 py-2 rounded-full">
                  <span className="w-7 h-7 flex items-center justify-center rounded-full bg-green-600 text-white text-base">✓</span>
                  Evaluated
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-[1fr_1.3fr] gap-8">
              <div className="bg-[#5B8FCF]/25 rounded-lg p-5 text-sm space-y-2">
                <p><strong>Project:</strong> {sub.projectTitle}</p>
                <p><strong>Team:</strong> {sub.teamMembers || "—"}</p>
                <p><strong>Description:</strong> {sub.description}</p>
                <p><strong>Category:</strong> {sub.category}</p>
                {sub.fileName && <p><strong>File:</strong> {sub.fileName}</p>}
              </div>

              <div>
                <h3 className="font-bold mb-4">
                  Scoring {readonly && "(already evaluated)"}
                </h3>

                {criteria.map((c) => (
                  <div key={c.id} className="mb-3">
                    <label className="block font-medium">
                      {c.name} <span className="text-xs text-gray-500">(0–{c.weight})</span>
                    </label>
                    {c.description && (
                      <p className="text-xs text-gray-500 mb-1">{c.description}</p>
                    )}
                    <input
                      type="number"
                      min={0}
                      max={c.weight}
                      value={scores[c.id] ?? ""}
                      onChange={(e) =>
                        setScores((s) => ({ ...s, [c.id]: e.target.value === "" ? "" : Number(e.target.value) }))
                      }
                      disabled={readonly}
                      className="w-full border p-2"
                    />
                  </div>
                ))}

                <label className="block font-medium mt-2">Feedback:</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                  disabled={readonly}
                  className="w-full border p-2"
                />

                {error && <p className="text-red-500 text-sm font-medium mt-3">{error}</p>}

                {!readonly && (
                  <div className="flex justify-end mt-4">
                    <button type="submit" className="bg-[#5B8FCF] text-white font-semibold rounded-md px-6 py-2.5 hover:opacity-90">
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default EvaluationPage;
