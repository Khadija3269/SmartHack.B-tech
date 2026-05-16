import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import {
  getAssignments,
  getEvaluations,
  getHackathons,
  getMentorAssignments,
  getRegistrations,
  getSubmissions,
  refreshHackathons,
  refreshSubmissions,
  refreshRegistrations,
  refreshEvaluations,
  refreshAssignments,
  refreshMentorAssignments,
} from "@/lib/store";

function HistoryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const u = currentUser();
    if (!u) {
      navigate("/login");
      return;
    }
    setUser(u);
    Promise.all([refreshHackathons(), refreshSubmissions(), refreshRegistrations(), refreshEvaluations(), refreshAssignments(), refreshMentorAssignments()]).finally(() => setEntries(buildHistory(u)));
  }, [navigate]);

  const grouped = useMemo(() => {
    return [...entries].sort((a, b) => b.date - a.date);
  }, [entries]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="history" />

      <section className="bg-[#5B8FCF] py-6 text-center">
        <h1 className="text-2xl font-bold text-white">My History</h1>
        <p className="text-white/90 text-sm mt-1 capitalize">
          {user.role} — {user.fullName}
        </p>
      </section>

      <main className="max-w-3xl mx-auto p-8">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="font-bold text-[#1f3a68] mb-4 border-b pb-3">
            Activity Timeline
          </h2>

          {grouped.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">
              No activity yet. Start by{" "}
              <Link
                to="/hackathons"
                className="text-[#5B8FCF] hover:underline font-semibold"
              >
                browsing hackathons
              </Link>
              .
            </p>
          ) : (
            <ul className="space-y-3">
              {grouped.map((e) => (
                <li
                  key={e.id}
                  className="flex gap-3 items-start bg-[#cfe0f3]/40 rounded-md p-3"
                >
                  <div className="text-2xl">{e.icon}</div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-[#1f3a68]">
                        {e.title}
                      </p>
                      <p className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString()}
                      </p>
                    </div>

                    <p className="text-sm text-gray-700 mt-0.5">
                      {e.detail}
                    </p>

                    {e.hackathonId && (
                      <Link
                        to={`/hackathon-details/${e.hackathonId}`}
                        className="text-xs text-[#5B8FCF] hover:underline font-semibold"
                      >
                        View hackathon →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}

/* ========================= */
/* ✅ FIXED buildHistory */
/* ========================= */

function buildHistory(user) {
  const email = user.email.toLowerCase();
  const hackathons = getHackathons();
  const hackById = (id) => hackathons.find((h) => h.id === id);
  const out = [];

  // ✅ Account created
  out.push({
    id: "account-created",
    date: Date.now(),
    icon: "👤",
    title: "Account created",
    detail: `${user.fullName} joined the platform`,
  });

  /* ================= PARTICIPANT ================= */
  if (user.role === "participant") {
    getRegistrations()
      .filter((r) => r.participantEmail?.toLowerCase() === email)
      .forEach((r, i) => {
        const h = hackById(r.hackathonId);
        if (!h) return;

        out.push({
          id: `join-${r.hackathonId}-${i}`,
          date: new Date(h.startDate).getTime() || Date.now(),
          icon: "✅",
          title: `Joined "${h.title}"`,
          detail: `${h.theme} • ${h.location}`,
          hackathonId: h.id,
        });
      });

    getSubmissions()
      .filter((s) => s.participantEmail?.toLowerCase() === email)
      .forEach((s) => {
        const h = hackById(s.hackathonId);

        out.push({
          id: `submission-${s.id}`,
          date: Date.now(),
          icon: "📤",
          title: `Submitted to "${h?.title || "Hackathon"}"`,
          detail: `Submission ID: ${s.id}`,
          hackathonId: s.hackathonId,
        });
      });
  }

  /* ================= JUDGE ================= */
  if (user.role === "judge") {
    getAssignments()
      .filter((a) => a.judgeEmail?.toLowerCase() === email)
      .forEach((a, i) => {
        const h = hackById(a.hackathonId);
        if (!h) return;

        out.push({
          id: `jassign-${a.hackathonId}-${i}`,
          date: new Date(h.startDate).getTime() || Date.now(),
          icon: "⚖️",
          title: `Assigned to judge "${h.title}"`,
          detail: `${h.theme} • ${h.location}`,
          hackathonId: h.id,
        });
      });

    const subs = getSubmissions();

    getEvaluations()
      .filter((e) => e.judgeEmail?.toLowerCase() === email)
      .forEach((e) => {
        const sub = subs.find((s) => s.id === e.submissionId);
        const h = sub ? hackById(sub.hackathonId) : undefined;

        const total =
          (e.innovation || 0) +
          (e.design || 0) +
          (e.functionality || 0);

        out.push({
          id: `eval-${e.submissionId}`,
          date: Date.now(),
          icon: "📝",
          title: "Evaluated submission",
          detail: `Score: ${total}`,
          hackathonId: h?.id,
        });
      });
  }

  /* ================= MENTOR ================= */
  if (user.role === "mentor") {
    getMentorAssignments()
      .filter((a) => a.mentorEmail?.toLowerCase() === email)
      .forEach((a, i) => {
        const h = hackById(a.hackathonId);
        if (!h) return;

        out.push({
          id: `massign-${a.hackathonId}-${i}`,
          date: new Date(h.startDate).getTime() || Date.now(),
          icon: "🎓",
          title: `Mentoring "${h.title}"`,
          detail: `${h.theme} • ${h.location}`,
          hackathonId: h.id,
        });
      });
  }

  /* ================= ORGANIZER ================= */
  if (user.role === "organizer") {
    hackathons
      .filter((h) => h.organizerEmail?.toLowerCase() === email)
      .forEach((h) => {
        out.push({
          id: `created-${h.id}`,
          date: new Date(h.startDate).getTime() || Date.now(),
          icon: "🏆",
          title: `Created "${h.title}"`,
          detail: `${h.theme} • ${h.location}`,
          hackathonId: h.id,
        });
      });
  }

  /* ================= ADMIN ================= */
  if (user.role === "admin") {
    out.push({
      id: "admin-overview",
      date: Date.now(),
      icon: "🛡️",
      title: "Admin overview",
      detail: `${hackathons.length} hackathons, ${getSubmissions().length} submissions, ${getEvaluations().length} evaluations.`,
    });
  }

  return out;
}

export default HistoryPage;