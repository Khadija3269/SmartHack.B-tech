import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import {
  refreshAssignments,
  refreshCategories,
  refreshMentorAssignments,
  refreshRegistrations,
  refreshSubmissions,
  refreshUsers,
  usersSummary,
} from "@/lib/store";

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : "—");
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const STATUS_COLOR = { Active: "text-green-700", Pending: "text-amber-600", Blocked: "text-red-600", Rejected: "text-red-600" };

function Tile({ value, label, sub }) {
  return (
    <div className="bg-[#5B8FCF] text-white rounded-lg py-5 text-center print-card">
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs font-semibold mt-1">{label}</div>
      {sub && <div className="text-[11px] opacity-80 mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8 print-card">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 h-px bg-[#1f3a68]" />
        <h2 className="text-base font-bold text-[#1f3a68]">{title}</h2>
        <div className="flex-1 h-px bg-[#1f3a68]" />
      </div>
      {children}
    </section>
  );
}

// Admin-only overview of every user on the platform.
function UsersSummaryPage() {
  const navigate = useNavigate();
  const me = currentUser();
  const [sum, setSum] = useState(null);

  useEffect(() => {
    if (!me) { navigate("/login"); return; }
    if (me.role !== "admin") { navigate("/"); return; }
    Promise.all([
      refreshUsers(), refreshRegistrations(), refreshSubmissions(),
      refreshAssignments(), refreshMentorAssignments(), refreshCategories(),
    ]).finally(() => setSum(usersSummary()));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="no-print"><SiteHeader active="dashboard" /></div>
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between no-print">
        <h1 className="text-[#1f3a68] text-xl font-bold">Users Summary</h1>
        <Link to="/admin-dashboard" className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        {!sum && <p className="text-center text-gray-500 py-10">Loading summary…</p>}

        {sum && (
          <>
            <div className="print-only mb-6 text-center">
              <h1 className="text-2xl font-bold text-[#1f3a68]">HackHub — Users Summary</h1>
              <p className="text-sm text-gray-600">Generated {new Date().toLocaleString()} by {me?.fullName || me?.email}</p>
            </div>

            <div className="no-print mb-6 flex items-center gap-3">
              <Link to="/manage-users" className="text-sm font-semibold text-[#1f3a68] underline">Manage users →</Link>
              <button onClick={() => window.print()}
                className="ml-auto bg-[#1f3a68] text-white rounded px-4 py-2 text-sm font-semibold hover:opacity-90">
                🖨️ Print / Save as PDF
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Tile value={sum.total} label="Total users" sub={`+${sum.signups7} this week · +${sum.signups30} this month`} />
              <Tile value={sum.byStatus.Active} label="Active" sub={pct(sum.byStatus.Active, sum.total)} />
              <Tile value={sum.byStatus.Pending} label="Pending approval" sub={sum.byStatus.Pending ? "needs your review" : "all clear"} />
              <Tile value={sum.byStatus.Blocked + sum.byStatus.Rejected} label="Blocked / rejected" />
            </div>

            {sum.pending.length > 0 && (
              <div className="mb-8 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-sm no-print">
                <span className="font-semibold">⏳ {sum.pending.length} application{sum.pending.length === 1 ? "" : "s"} waiting for review: </span>
                {sum.pending.map((u) => `${u.fullName || u.email} (${u.role})`).join(", ")}.{" "}
                <Link to="/manage-users" className="font-semibold underline text-[#1f3a68]">Review now →</Link>
              </div>
            )}

            <Section title="Users by role & status">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="bg-[#5B8FCF] text-white">
                      <th className="p-2 text-left rounded-tl-lg">Role</th><th className="p-2">Total</th>
                      <th className="p-2">Active</th><th className="p-2">Pending</th>
                      <th className="p-2">Blocked</th><th className="p-2 rounded-tr-lg">Rejected</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sum.byRole.map((r) => (
                      <tr key={r.role} className="odd:bg-[#cfe0f3]/60">
                        <td className="p-2 text-left font-semibold">{cap(r.role)}s</td>
                        <td className="p-2 font-bold">{r.total}</td>
                        <td className="p-2">{r.Active}</td><td className="p-2">{r.Pending}</td>
                        <td className="p-2">{r.Blocked}</td><td className="p-2">{r.Rejected}</td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-[#1f3a68] font-bold">
                      <td className="p-2 text-left">All users</td><td className="p-2">{sum.total}</td>
                      <td className="p-2">{sum.byStatus.Active}</td><td className="p-2">{sum.byStatus.Pending}</td>
                      <td className="p-2">{sum.byStatus.Blocked}</td><td className="p-2">{sum.byStatus.Rejected}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Participant engagement">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Tile value={sum.participants.total} label="Participants" />
                <Tile value={sum.participants.joined} label="Joined a hackathon" sub={pct(sum.participants.joined, sum.participants.total)} />
                <Tile value={sum.participants.submitted} label="Submitted a project" sub={pct(sum.participants.submitted, sum.participants.total)} />
                <Tile value={sum.participants.inactive} label="Not joined any yet" />
              </div>
            </Section>

            <Section title="Staffing & category coverage">
              <ul className="text-sm space-y-2">
                <li>
                  <span className="font-semibold">Judges without a hackathon:</span>{" "}
                  {sum.judgesUnassigned.length ? sum.judgesUnassigned.map((u) => u.fullName || u.email).join(", ") : <span className="text-green-700">none — every active judge is assigned</span>}
                </li>
                <li>
                  <span className="font-semibold">Mentors without a hackathon:</span>{" "}
                  {sum.mentorsUnassigned.length ? sum.mentorsUnassigned.map((u) => u.fullName || u.email).join(", ") : <span className="text-green-700">none — every active mentor is assigned</span>}
                </li>
                <li>
                  <span className="font-semibold">Categories with no active organizer:</span>{" "}
                  {sum.uncoveredCategories.length ? <span className="text-amber-700">{sum.uncoveredCategories.join(", ")}</span> : <span className="text-green-700">none — every category is covered</span>}
                </li>
              </ul>

              {sum.organizers.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#5B8FCF] text-white text-left">
                        <th className="p-2 rounded-tl-lg">Organizer</th><th className="p-2">Status</th><th className="p-2 rounded-tr-lg">Categories</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.organizers.map((u) => (
                        <tr key={u.email} className="odd:bg-[#cfe0f3]/60">
                          <td className="p-2"><div className="font-semibold">{u.fullName}</div><div className="text-xs text-gray-600">{u.email}</div></td>
                          <td className={`p-2 font-semibold ${STATUS_COLOR[u.status] || ""}`}>{u.status}</td>
                          <td className="p-2">{(u.categories || []).join(", ") || <em className="text-gray-500">none</em>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Most recent sign-ups">
              {sum.recent.length === 0 ? <p className="text-sm text-gray-500 text-center">No sign-up dates on record.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#5B8FCF] text-white text-left">
                        <th className="p-2 rounded-tl-lg">Name</th><th className="p-2">Role</th><th className="p-2">Status</th><th className="p-2 rounded-tr-lg">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sum.recent.map((u) => (
                        <tr key={u.email} className="odd:bg-[#cfe0f3]/60">
                          <td className="p-2"><div className="font-semibold">{u.fullName}</div><div className="text-xs text-gray-600">{u.email}</div></td>
                          <td className="p-2 capitalize">{u.role}</td>
                          <td className={`p-2 font-semibold ${STATUS_COLOR[u.status] || ""}`}>{u.status}</td>
                          <td className="p-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </>
        )}
      </main>
    </div>
  );
}

export default UsersSummaryPage;
