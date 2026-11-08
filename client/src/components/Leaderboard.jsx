import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  globalLeaderboard,
  refreshEvaluations,
  refreshHackathons,
  refreshSubmissions,
} from "@/lib/store";

const MEDALS = ["🥇", "🥈", "🥉"];

function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([refreshHackathons(), refreshSubmissions(), refreshEvaluations()])
      .finally(() => {
        setRows(globalLeaderboard());
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="hackathons" />

      <div className="bg-[#5B8FCF] py-8 text-center relative">
        <Link to="/hackathons" className="absolute right-6 top-6 text-gray-800 text-2xl">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">🏆 Leaderboard</h1>
        <p className="text-sm text-gray-700 mt-1">Top teams across every hackathon on HackHub</p>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {loading && <p className="text-center text-gray-500 py-10">Loading…</p>}

        {!loading && rows.length === 0 && (
          <p className="text-center text-gray-500 py-10">No judged submissions yet across any hackathon.</p>
        )}

        {!loading && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={`${row.hackathon.id}-${row.submission.id}`}
                className={`rounded-xl p-4 flex items-center gap-4 border ${
                  row.rank <= 3 ? "bg-[#fff8e6] border-yellow-300" : "bg-[#f4f7fc] border-gray-200"
                }`}
              >
                <div className="w-10 text-center text-xl font-bold shrink-0">
                  {MEDALS[row.rank - 1] || `#${row.rank}`}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{row.submission.projectTitle || "Untitled project"}</div>
                  <div className="text-xs text-gray-600">
                    {row.submission.teamMembers || row.submission.participantEmail}
                  </div>
                  <Link
                    to={`/hackathon-details/${row.hackathon.id}`}
                    className="text-xs text-[#5B8FCF] underline"
                  >
                    {row.hackathon.title}
                  </Link>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold text-[#1f3a68]">{row.avgScore.toFixed(1)} pts</div>
                  <div className="text-xs text-gray-500">
                    {row.judgeCount} judge{row.judgeCount === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-6 text-center">
          Ranks every judged submission across all hackathons together. Scores are still each
          hackathon's own judges rating against the shared rubric — this view just combines them
          into one list. Hackathons with no judged submissions don't appear here.
        </p>
      </main>
    </div>
  );
}

export default LeaderboardPage;
