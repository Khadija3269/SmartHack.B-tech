import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import {
  deleteSubmission,
  refreshSubmissions,
  refreshHackathons,
  submissionsForOrganizer,
  getHackathon,
} from "@/lib/store";

function ViewSubmissionsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => setItems(submissionsForOrganizer());

  useEffect(() => {
    const user = currentUser();
    if (!user) { navigate("/login"); return; }

    // Re-fetch latest data from server then render
    Promise.all([refreshSubmissions(), refreshHackathons()])
      .finally(() => {
        refresh();
        setLoading(false);
      });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="dashboard" />
        <p className="text-center mt-20 text-gray-500">Loading submissions…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />

      <header className="bg-[#5B8FCF] px-6 py-4 flex items-center justify-between">
        <h1 className="text-white text-xl font-bold">View Submissions</h1>
        <Link to="/organizer-dashboard" className="text-white text-2xl">←</Link>
      </header>

      <main className="max-w-4xl mx-auto p-8 space-y-4">
        {items.length === 0 && (
          <p className="text-center text-gray-500 py-10">No submissions yet.</p>
        )}

        {items.map((s) => {
          const h = getHackathon(s.hackathonId);

          return (
            <div
              key={s.id}
              className="bg-[#cfe0f3] rounded-xl p-5 flex justify-between items-start"
            >
              <div className="w-full pr-4">
                <h3 className="font-bold">{s.projectTitle}</h3>

                <p className="text-sm mt-1">
                  <span className="font-semibold">Team:</span>{" "}
                  {s.teamMembers || "—"}
                </p>

                <p className="text-sm">
                  <span className="font-semibold">Hackathon:</span>{" "}
                  {h?.title || "—"}
                </p>

                <p className="text-sm">
                  <span className="font-semibold">Submitted by:</span>{" "}
                  {s.participantEmail || "—"}
                </p>

                <p className="text-sm">
                  <span className="font-semibold">Status:</span>{" "}
                  <span className="text-green-700 font-semibold">{s.status}</span>
                </p>

                <p className="text-sm text-gray-700 mt-2">{s.description}</p>

                <div className="mt-3">
                  {s.fileUrl ? (
                    <div className="flex gap-3 flex-wrap">
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 font-semibold underline text-sm"
                      >
                        📄 Open File
                      </a>
                      <a
                        href={s.fileUrl}
                        download
                        className="text-green-700 font-semibold underline text-sm"
                      >
                        ⬇ Download
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      📎 {s.fileName || "No file attached"}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm("Delete submission?")) {
                    deleteSubmission(s.id);
                    refresh();
                  }
                }}
                className="bg-red-600 text-white text-xs font-semibold rounded px-3 py-1.5 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          );
        })}
      </main>
    </div>
  );
}

export default ViewSubmissionsPage;
