import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import { getCategories, getHackathons, isArchived, refreshCategories, refreshHackathons } from "@/lib/store";

// Read-only list of hackathons that have ended (or were archived manually).
function ArchivePage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    refreshCategories();
    refreshHackathons().finally(() =>
      setItems(
        getHackathons()
          .filter(isArchived)
          .sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""))
      )
    );
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (h) =>
      (category === "all" || h.category === category) &&
      (!q || [h.title, h.theme, h.location, h.category].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
  );
  const user = currentUser();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="hackathons" />
      <div className="flex items-center justify-center gap-4 my-8">
        <div className="h-px w-16 bg-gray-800" />
        <h1 className="text-2xl font-bold text-gray-800">Archived Hackathons</h1>
        <div className="h-px w-16 bg-gray-800" />
      </div>
      <div className="text-center -mt-4 mb-6">
        <Link to="/hackathons" className="text-sm font-semibold text-[#1f3a68] underline">← Back to active hackathons</Link>
        {user && ["admin", "organizer"].includes(user.role) && (
          <>
            <span className="mx-3 text-gray-400">|</span>
            <Link to="/manage-hackathons" className="text-sm font-semibold text-[#1f3a68] underline">Manage hackathons</Link>
          </>
        )}
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-12">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label htmlFor="archive-category" className="text-[#1f3a68] font-semibold text-sm">Category:</label>
          <select
            id="archive-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-[#5B8FCF] rounded-md px-3 py-2 bg-white text-[#1f3a68] text-sm font-medium"
          >
            <option value="all">All categories</option>
            {[...new Set([...getCategories(), ...items.map((h) => h.category).filter(Boolean)])].sort().map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search archived hackathons…"
            className="flex-1 min-w-[200px] px-4 py-2 rounded-full border border-gray-300 text-sm"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-500">
            {items.length === 0 ? "No archived hackathons yet." : "No archived hackathons match your filters."}
          </p>
        ) : (
          <div className="bg-[#cfd8e6] rounded-xl p-6 flex flex-col gap-4">
            {filtered.map((h) => (
              <div key={h.id} className="bg-white/70 border border-gray-400 rounded-lg p-5 flex justify-between items-center">
                <div>
<div className="flex items-center gap-2 mb-1">
                    <span className="inline-block bg-[#1f3a68] text-white text-xs font-semibold rounded-full px-2.5 py-0.5">
                      {h.category || "Uncategorized"}
                    </span>
                    {h.archivedReason === "deleted" && (
                      <span className="inline-block bg-red-600 text-white text-xs font-semibold rounded-full px-2.5 py-0.5">Deleted</span>
                    )}
                  </div>
                  <h3 className="text-[#1e3a8a] font-semibold mb-1">{h.title}</h3>
                  <p className="text-sm text-gray-700">
                    {h.archivedReason === "deleted" && h.archivedAt
                      ? `Deleted: ${new Date(h.archivedAt).toLocaleDateString()}`
                      : `Ended: ${h.endDate || "?"}`} • {h.location}
                  </p>
                </div>
                <Link
                  to={`/hackathon-details/${h.id}`}
                  className="bg-white text-gray-800 px-5 py-2 rounded-full text-sm font-medium shadow hover:opacity-90"
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default ArchivePage;
