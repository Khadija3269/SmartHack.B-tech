import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import {
  addJudge,
  removeJudge,
  assignMentor,
  deleteHackathon,
  getHackathons,
  judgesForHackathon,
  mentorForHackathon,
  refreshHackathons,
  refreshAssignments,
  refreshMentorAssignments,
  refreshUsers,
  updateHackathon,
} from "@/lib/store";
import { getUsers } from "@/lib/auth";

function ManageHackathonsPage() {
  const [items, setItems] = useState([]);
  const [judges, setJudges] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [flash, setFlash] = useState("");

  const refresh = () => {
    setItems((getHackathons() || []).slice().sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")));
    const users = getUsers();
    setJudges(users.filter((u) => u.role === "judge").map((u) => ({ email: u.email, fullName: u.fullName })));
    setMentors(users.filter((u) => u.role === "mentor").map((u) => ({ email: u.email, fullName: u.fullName })));
  };

  useEffect(() => { Promise.all([refreshHackathons(), refreshAssignments(), refreshMentorAssignments(), refreshUsers()]).finally(refresh); }, []);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between">
        <h1 className="text-[#1f3a68] text-xl font-bold">Manage Hackathons</h1>
        <Link to="/admin-dashboard" className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-[#1f3a68]" />
          <h2 className="text-xl font-bold">List of Hackathons</h2>
          <div className="flex-1 h-px bg-[#1f3a68]" />
        </div>

        {flash && (
          <div className="mb-4 rounded-md bg-green-100 border border-green-300 text-green-800 px-4 py-2 text-sm font-semibold">
            {flash}
          </div>
        )}

        {(judges.length === 0 || mentors.length === 0) && (
          <div className="mb-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-2 text-sm">
            {judges.length === 0 && <>No <strong>Judge</strong> accounts exist yet. </>}
            {mentors.length === 0 && <>No <strong>Mentor</strong> accounts exist yet. </>}
            Register users with those roles first, then come back to assign them.
          </div>
        )}

        {items.length === 0 && <p className="text-center text-gray-500 py-10">No hackathons yet.</p>}

        <div className="space-y-4">
          {items.map((h) => {
            const assignedEmails = (judgesForHackathon(h.id) || []).map((e) => e.toLowerCase());
            const assignedJudges = judges.filter((j) => assignedEmails.includes(j.email.toLowerCase()));
            const assignedMentorEmail = mentorForHackathon(h.id) || "";
            const assignedMentor = mentors.find((m) => m.email.toLowerCase() === assignedMentorEmail.toLowerCase());
            return (
              <div key={h.id} className="bg-[#cfe0f3] rounded-xl p-5 grid grid-cols-[1fr_240px] gap-5 items-center">
                <div>
                  <h3 className="font-bold mb-2">{h.title}</h3>
                  <p className="text-sm text-gray-800 mb-2">{h.description}</p>
                  <p className="text-xs text-gray-700">{h.startDate} → {h.endDate} • {h.location}</p>
                  <p className="text-xs mt-2">
                    <span className="font-semibold">Assigned judges:</span>{" "}
                    {assignedJudges.length ? (
                      <span className="text-green-700 font-semibold">
                        {assignedJudges.map((j) => `${j.fullName} (${j.email})`).join(", ")}
                      </span>
                    ) : (
                      <span className="italic text-gray-600">none</span>
                    )}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-semibold">Assigned mentor:</span>{" "}
                    {assignedMentor ? (
                      <span className="text-green-700 font-semibold">{assignedMentor.fullName} ({assignedMentor.email})</span>
                    ) : (
                      <span className="italic text-gray-600">none</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => {
                      const t = prompt("Edit title:", h.title);
                      if (t) { updateHackathon(h.id, { title: t }); refresh(); showFlash("Hackathon updated."); }
                    }}
                    className="bg-[#5B8FCF] text-white rounded w-32 py-1.5 font-semibold"
                  >Edit</button>
                  <button
                    onClick={() => { if (confirm("Delete?")) { deleteHackathon(h.id); refresh(); showFlash("Hackathon deleted."); } }}
                    className="bg-red-600 text-white rounded w-32 py-1.5 font-semibold"
                  >Delete</button>
                  <div className="flex flex-col gap-1 mt-1 w-full">
                    <label className="text-xs font-semibold">Assign judges (multiple):</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const email = e.target.value;
                        if (!email) return;
                        addJudge(h.id, email);
                        refresh();
                        const picked = judges.find((j) => j.email.toLowerCase() === email);
                        showFlash(`Added ${picked?.fullName || email} to "${h.title}".`);
                      }}
                      disabled={judges.length === 0}
                      className="border border-gray-400 rounded px-2 py-1 text-xs bg-white w-full disabled:opacity-50"
                    >
                      <option value="">— add a judge —</option>
                      {judges
                        .filter((j) => !assignedEmails.includes(j.email.toLowerCase()))
                        .map((j) => (
                          <option key={j.email} value={j.email.toLowerCase()}>
                            {j.fullName} ({j.email})
                          </option>
                        ))}
                    </select>
                    {assignedJudges.length > 0 && (
                      <ul className="mt-1 space-y-1">
                        {assignedJudges.map((j) => (
                          <li key={j.email} className="flex items-center justify-between bg-white rounded px-2 py-1 text-xs">
                            <span>{j.fullName}</span>
                            <button
                              onClick={() => {
                                removeJudge(h.id, j.email);
                                refresh();
                                showFlash(`Removed ${j.fullName} from "${h.title}".`);
                              }}
                              className="text-red-600 font-bold ml-2"
                              title="Remove"
                            >×</button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-semibold">Assign mentor:</label>
                    <select
                      value={assignedMentorEmail.toLowerCase()}
                      onChange={(e) => {
                        assignMentor(h.id, e.target.value);
                        refresh();
                        const picked = mentors.find((m) => m.email.toLowerCase() === e.target.value);
                        showFlash(e.target.value
                            ? `Assigned ${picked?.fullName || e.target.value} for "${h.title}".`
                            : `Cleared mentor for "${h.title}".`, );
                      }}
                      disabled={mentors.length === 0}
                      className="border border-gray-400 rounded px-2 py-1 text-xs bg-white w-full disabled:opacity-50"
                    >
                      <option value="">— none —</option>
                      {mentors.map((m) => (
                        <option key={m.email} value={m.email.toLowerCase()}>
                          {m.fullName} ({m.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}


export default ManageHackathonsPage;
