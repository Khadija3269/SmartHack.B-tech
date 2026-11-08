
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { usePreferences } from "@/lib/preferences";
import { getCategories, getHackathons, isArchived } from "@/lib/store";

function HackathonsPage() {
  const { t } = usePreferences();

  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    // Ended / archived hackathons live on the Archive page.
    const data = (getHackathons() || []).filter((h) => !isArchived(h)).sort((a, b) => {
      const da = a.startDate || "";
      const db = b.startDate || "";
      return da.localeCompare(db);
    });
    setItems(data);
  }, []);

  const q = query.trim().toLowerCase();

  const byCategory = category === "all" ? items : items.filter((h) => h.category === category);
  const filtered = q
    ? byCategory.filter((h) =>
        [h.title, h.theme, h.location, h.category, h.description]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      )
    : byCategory;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="hackathons" />

      <div className="flex items-center justify-center gap-4 my-8">
        <div className="h-px w-16 bg-gray-800" />
        <h1 className="text-2xl font-bold text-gray-800">
          {t("Available Hackathons")}
        </h1>
        <div className="h-px w-16 bg-gray-800" />
      </div>

      <div className="text-center -mt-4 mb-6">
        <Link to="/leaderboard" className="text-sm font-semibold text-[#1f3a68] underline">
          🏆 {t("View Leaderboard")} →
        </Link>
        <span className="mx-3 text-gray-400">|</span>
        <Link to="/archive" className="text-sm font-semibold text-[#1f3a68] underline">
          🗄️ {t("Archived Hackathons")} →
        </Link>
      </div>

      <main className="max-w-4xl mx-auto px-6 pb-12">
        {/* Category filter */}
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="category-filter" className="text-[#1f3a68] font-semibold text-sm">
            {t("Category:")}
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-[#5B8FCF] rounded-md px-3 py-2 bg-white text-[#1f3a68] text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#5B8FCF]"
          >
            <option value="all">{t("All categories")}</option>
            {getCategories().map((c) => (
              <option key={c} value={c}>{t(c)}</option>
            ))}
          </select>
          <span className="ml-auto text-sm text-gray-600">
            {filtered.length} {filtered.length === 1 ? t("hackathon") : t("hackathons")}
          </span>
        </div>

        {/* 🔍 Search */}
        <div className="mb-6 relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("Search by title, theme, location, or category…")}
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
              ? t("No hackathons yet.")
              : t("No hackathons match your filters.")}
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
                  <span className="inline-block bg-white text-[#1f3a68] text-xs font-semibold rounded-full px-2.5 py-0.5 mb-1">
                    {t(h.category || "Uncategorized")}
                  </span>
                  <p className="text-sm text-gray-800">
                    {t("Theme:")} {h.theme || "N/A"}
                  </p>
                  <p className="text-sm text-gray-800">
                    {t("Date:")} {h.startDate || "?"} → {h.endDate || "?"}
                  </p>
                </div>

                {/* View hackathon details */}
                <Link
                  to={`/hackathon-details/${h.id}`}
                  className="bg-white text-gray-800 px-5 py-2 rounded-full text-sm font-medium shadow hover:opacity-90"
                >
                  {t("View Details")}
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
