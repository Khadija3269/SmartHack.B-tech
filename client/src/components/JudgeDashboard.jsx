import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarProfile } from "@/components/SidebarProfile";
import { currentUser } from "@/lib/auth";
import { evaluationFor, submissionsForJudge, refreshSubmissions, refreshAssignments, refreshEvaluations } from "@/lib/store";

function JudgeDashboardPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const user = currentUser();
    if (!user) {
      navigate("/login");
      return;
    }

    Promise.all([refreshSubmissions(), refreshAssignments(), refreshEvaluations()]).finally(() => {
      const data = submissionsForJudge();
      setItems(Array.isArray(data) ? data : []);
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader active="dashboard" />
      <div className="flex flex-1">
        <SidebarProfile />
        <div className="flex-1 flex flex-col">
          <section className="bg-[#5B8FCF] py-5 relative">
            <h1 className="text-center text-[#1f3a68] text-2xl font-bold">
              Judge Dashboard
            </h1>
            <button
              onClick={() => navigate("/settings")}
              className="absolute top-1/2 right-10 -translate-y-1/2 w-11 h-11 rounded-full bg-white flex items-center justify-center text-2xl"
            >
              👩
            </button>
          </section>

          <main className="flex-1 max-w-4xl mx-auto w-full p-8">
        <div className="rounded-xl border bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold border-b pb-3 mb-5">
            Assigned Projects
          </h2>

          {items.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No assigned submissions yet. An admin must assign you to a hackathon, and participants must submit projects.
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map(({ sub, hackathon }) => {
                const ev = evaluationFor(sub.id);

                return (
                  <li
                    key={sub.id}
                    className={`rounded-md p-4 flex justify-between items-center ${ev ? "bg-green-100 border-2 border-green-500" : "bg-[#5B8FCF]/30"}`}
                  >
                    <div className="flex items-center gap-3">
                      {ev && (
                        <span className="w-9 h-9 flex items-center justify-center rounded-full bg-green-600 text-white text-xl font-bold shadow" title="Evaluated">✓</span>
                      )}
                      <div>
                      <p className="font-semibold">{sub.projectTitle}</p>

                      <p className="text-sm">
                        <span className="font-semibold">Hackathon:</span>{" "}
                        {hackathon?.title || "—"}
                      </p>

                      <p className="text-sm">
                        <span className="font-semibold">Team:</span>{" "}
                        {sub.teamMembers || "—"}
                      </p>

                      {ev && (
                        <p className="text-xs text-green-700 font-semibold mt-1">
                          ✓ Evaluated by you
                        </p>
                      )}
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        navigate(`/evaluation?submissionId=${sub.id}`)
                      }
                      className="bg-[#5B8FCF] text-white font-semibold rounded-md px-5 py-2 hover:opacity-90"
                    >
                      {ev ? "View" : "Evaluate"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default JudgeDashboardPage;