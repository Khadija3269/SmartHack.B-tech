import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { getHackathons } from "@/lib/store";

function HackathonsPage() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const data = (getHackathons() || []).slice().sort((a, b) => {
      const da = a.startDate || "";
      const db = b.startDate || "";
      return da.localeCompare(db);
    });
    setItems(data);
  }, []);

  const q = query.trim().toLowerCase();

  const filtered = q
    ? items.filter((h) =>
        [h.title, h.theme, h.location, h.category, h.description]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      )
    : items;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="hackathons" />

      <div className="flex items-center justify-center gap-4 my-8">
        <div className="h-px w-16 bg-gray-800" />
        <h1 className="text-2xl font-bold text-gray-800">
          Available Hackathons
        </h1>
        <div className="h-px w-16 bg-gray-800" />
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-12">
        {/* 🔍 Search */}
        <div className="mb-6 relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, theme, location, or category…"
            className="w-full pl-10 pr-4 py-3 rounded-full border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#5B8FCF] focus:ring-2 focus:ring-[#5B8FCF]/30"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>

        {/* 📭 Empty state */}
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500">
            {items.length === 0
              ? "No hackathons yet."
              : "No hackathons match your search."}
          </p>
        ) : (
          <div className="bg-[#9CB8DC] rounded-xl p-6 flex flex-col gap-4">
            {filtered.map((h) => (
              <div
                key={h.id}
                className="bg-[#9CB8DC] border-[1.5px] border-[#5B8FCF] rounded-lg p-5 flex justify-between items-center"
              >
                <div>
                  <h3 className="text-[#1e3a8a] font-semibold mb-2">
                    {h.title}
                  </h3>
                  <p className="text-sm text-gray-800">
                    Theme: {h.theme || "N/A"}
                  </p>
                  <p className="text-sm text-gray-800">
                    Date: {h.startDate || "?"} → {h.endDate || "?"}
                  </p>
                </div>

                {/* ✅ FIXED LINK */}
                <Link
                  to={`/hackathon-details/${h.id}`}
                  className="bg-white text-gray-800 px-5 py-2 rounded-full text-sm font-medium shadow hover:opacity-90"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default HackathonsPage;
