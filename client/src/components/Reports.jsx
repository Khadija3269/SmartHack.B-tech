import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import {
  getCategories,
  isArchived,
  myCategories,
  platformReport,
  refreshAssignments,
  refreshHackathons,
  refreshEvaluations,
  refreshFeedback,
  refreshMentorAssignments,
  refreshRegistrations,
  refreshSubmissions,
  refreshUsers,
} from "@/lib/store";

const pct = (n) => `${Math.round((n || 0) * 100)}%`;
const fmtScore = (v) => (v == null ? "—" : v.toFixed(1));

function StatCard({ value, label }) {
  return (
    <div className="bg-[#5B8FCF] text-white rounded-lg py-5 text-center">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
    </div>
  );
}

function ProgressBar({ value }) {
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-green-500" style={{ width: pct(value) }} />
    </div>
  );
}

function ReportsPage() {
  const navigate = useNavigate();
  const me = currentUser();
  const isAdminUser = me?.role === "admin";
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [ready, setReady] = useState(false);

  // Rebuild the report whenever a filter changes (data is already cached).
  useEffect(() => {
    if (ready) setReport(platformReport({ category, status }));
  }, [category, status, ready]);

  useEffect(() => {
    if (!me) { navigate("/login"); return; }
    if (!["admin", "organizer"].includes(me.role)) { navigate("/"); return; }
    Promise.all([
      refreshHackathons(),
      refreshSubmissions(),
      refreshRegistrations(),
      refreshEvaluations(),
      refreshAssignments(),
      refreshMentorAssignments(),
      refreshUsers(),
      refreshFeedback(),
    ]).finally(() => {
      setReady(true);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print"><SiteHeader active="dashboard" /></div>
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between no-print">
        <h1 className="text-[#1f3a68] text-xl font-bold">Performance Reports</h1>
        <Link to={isAdminUser ? "/admin-dashboard" : "/organizer-dashboard"} className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        {loading && <p className="text-center text-gray-500 py-10">Generating report…</p>}

        {!loading && report && (
          <>
            {/* Print-only title block */}
            <div className="print-only mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#1f3a68]">HackHub — Performance Report</h1>
              <p className="text-sm text-gray-600">
                Generated {new Date().toLocaleString()} by {me?.fullName || me?.email} ({me?.role})
              </p>
              <p className="text-sm text-gray-600">
                Category: {category || (isAdminUser ? "All categories" : myCategories().join(", ") || "—")} · Status: {status === "all" ? "Active & archived" : status}
              </p>
            </div>

            {/* Filters + print (hidden when printing) */}
            <div className="no-print mb-6 flex flex-wrap items-center gap-3">
              <label htmlFor="rep-category" className="text-[#1f3a68] font-semibold text-sm">Category:</label>
              <select id="rep-category" value={category} onChange={(e) => setCategory(e.target.value)}
                className="border border-[#5B8FCF] rounded-md px-3 py-1.5 bg-white text-[#1f3a68] text-sm font-medium">
                <option value="">{isAdminUser ? "All categories" : "All my categories"}</option>
                {(isAdminUser ? getCategories() : myCategories()).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <label htmlFor="rep-status" className="text-[#1f3a68] font-semibold text-sm">Status:</label>
              <select id="rep-status" value={status} onChange={(e) => setStatus(e.target.value)}
                className="border border-[#5B8FCF] rounded-md px-3 py-1.5 bg-white text-[#1f3a68] text-sm font-medium">
                <option value="all">Active &amp; archived</option>
                <option value="active">Active only</option>
                <option value="archived">Archived only</option>
              </select>
              <Link to="/leaderboard" className="text-sm font-semibold text-[#1f3a68] underline ml-2">🏆 Leaderboard →</Link>
              <button onClick={() => window.print()}
                className="ml-auto bg-[#1f3a68] text-white rounded px-4 py-2 text-sm font-semibold hover:opacity-90">
                🖨️ Print / Save as PDF
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#1f3a68]" />
              <h2 className="text-lg font-bold text-[#1f3a68]">Platform Overview</h2>
              <div className="flex-1 h-px bg-[#1f3a68]" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <StatCard value={report.hackathonCount} label="Hackathons" />
              <StatCard value={report.totalTeams} label="Teams / Submissions" />
              <StatCard value={report.totalRegistrations} label="Participant Registrations" />
              <StatCard value={fmtScore(report.platformAverageScore)} label="Avg. Score (all hackathons)" />
            </div>
            {isAdminUser ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard value={report.participantCount} label="Participants (platform)" />
                <StatCard value={report.judgeCount} label="Judges (platform)" />
                <StatCard value={report.mentorCount} label="Mentors (platform)" />
                <StatCard value={report.organizerCount} label="Organizers (platform)" />
              </div>
            ) : <div className="mb-8" />}

            <div className="bg-[#f4f7fc] rounded-xl p-5 mb-10">
              <div className="flex justify-between text-sm font-semibold mb-2">
                <span>Evaluation completion</span>
                <span>{report.totalEvaluated} / {report.totalTeams} teams judged ({pct(report.evaluationCompletionRate)})</span>
              </div>
              <ProgressBar value={report.evaluationCompletionRate} />
            </div>

            {report.totalFeedback > 0 && (
              <div className="bg-[#f4f7fc] rounded-xl p-5 mb-10">
                <p className="text-sm font-semibold mb-2">
                  Participant feedback sentiment ({report.totalFeedback} review{report.totalFeedback === 1 ? "" : "s"})
                </p>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-700 font-semibold">😊 Positive: {report.sentimentBreakdown.positive}</span>
                  <span className="text-gray-600 font-semibold">😐 Neutral: {report.sentimentBreakdown.neutral}</span>
                  <span className="text-red-700 font-semibold">😟 Negative: {report.sentimentBreakdown.negative}</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#1f3a68]" />
              <h2 className="text-lg font-bold text-[#1f3a68]">Per-Hackathon Breakdown</h2>
              <div className="flex-1 h-px bg-[#1f3a68]" />
            </div>

            {report.perHackathon.length === 0 && (
              <p className="text-center text-gray-500 py-10">No hackathons match these filters.</p>
            )}

            <div className="space-y-4">
              {report.perHackathon.map((r) => (
                <div key={r.hackathon?.id} className="bg-[#cfe0f3] rounded-xl p-5 print-card">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">{r.hackathon?.title || "Untitled hackathon"}</h3>
                    <div className="flex gap-2">
                      <span className="bg-[#1f3a68] text-white text-xs font-semibold rounded-full px-2.5 py-0.5">{r.hackathon?.category || "Uncategorized"}</span>
                      {isArchived(r.hackathon) && <span className="bg-gray-500 text-white text-xs font-semibold rounded-full px-2.5 py-0.5">Archived</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center mb-3">
                    <div className="bg-white rounded-lg py-3">
                      <div className="text-xl font-bold text-[#1f3a68]">{r.teamsCount}</div>
                      <div className="text-xs text-gray-600">Teams</div>
                    </div>
                    <div className="bg-white rounded-lg py-3">
                      <div className="text-xl font-bold text-[#1f3a68]">{r.participantsCount}</div>
                      <div className="text-xs text-gray-600">Participants</div>
                    </div>
                    <div className="bg-white rounded-lg py-3">
                      <div className="text-xl font-bold text-[#1f3a68]">{fmtScore(r.averageScore)}</div>
                      <div className="text-xs text-gray-600">Avg. score</div>
                    </div>
                    <div className="bg-white rounded-lg py-3">
                      <div className="text-xl font-bold text-[#1f3a68]">{fmtScore(r.highestScore)}</div>
                      <div className="text-xs text-gray-600">Top score</div>
                    </div>
                    <div className="bg-white rounded-lg py-3">
                      <div className="text-xl font-bold text-[#1f3a68]">{fmtScore(r.lowestScore)}</div>
                      <div className="text-xs text-gray-600">Lowest score</div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span>Judging progress</span>
                      <span>{r.evaluatedCount} / {r.teamsCount} evaluated</span>
                    </div>
                    <ProgressBar value={r.teamsCount ? r.evaluatedCount / r.teamsCount : 0} />
                    <div className="text-xs text-gray-600 mt-2">
                      {r.judgesAssigned} judge{r.judgesAssigned === 1 ? "" : "s"} assigned
                      {r.mentorAssigned ? " • mentor assigned" : " • no mentor assigned"}
                    </div>
                  </div>

                  {r.feedback.count > 0 && (
                    <div className="bg-white rounded-lg p-3 mt-2 text-xs">
                      <span className="font-semibold">Feedback: </span>
                      {r.feedback.average.toFixed(1)}/5 avg · {r.feedback.count} review{r.feedback.count === 1 ? "" : "s"} ·{" "}
                      <span className="text-green-700">😊 {r.feedback.positive}</span>{" "}
                      <span className="text-gray-600">😐 {r.feedback.neutral}</span>{" "}
                      <span className="text-red-700">😟 {r.feedback.negative}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default ReportsPage;
