import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarProfile } from "@/components/SidebarProfile";
import { getHackathons, refreshHackathons, refreshSubmissions, refreshUsers, stats, submissionsForOrganizer } from "@/lib/store";

function OrganizerDashboard() {
  const [s, setS] = useState({ hackCount: 0, partCount: 0, subCount: 0, userCount: 0 });
  const [activeUsers, setActiveUsers] = useState(0);

  useEffect(() => {
    Promise.all([refreshHackathons(), refreshSubmissions(), refreshUsers()]).finally(() => {
      setS(stats());
      setActiveUsers(new Set(submissionsForOrganizer().map((x) => x.participantEmail)).size);
    });
  }, []);

  const tiles = [
    { value: s.hackCount, label: "Total Hackathons" },
    { value: s.partCount, label: "Total Participants" },
    { value: s.subCount, label: "Submissions" },
    { value: activeUsers, label: "Active users" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader active="dashboard" />
      <div className="flex flex-1">
        <SidebarProfile />
        <div className="flex-1 flex flex-col">
          <section className="bg-[#5B8FCF] py-5">
            <h1 className="text-center text-[#1f3a68] text-2xl font-bold">Organizer Dashboard</h1>
          </section>

          <main className="flex-1 max-w-5xl mx-auto w-full p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {tiles.map((s) => (
            <div key={s.label} className="bg-[#5B8FCF] text-white rounded-lg py-6 text-center">
              <div className="text-4xl font-bold">{s.value}</div>
              <div className="text-sm font-semibold mt-2">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border bg-white shadow-sm divide-y">
          <Link to="/create-hackathon" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-medium"><span className="text-xl text-gray-700">＋</span> Create Hackathon</span>
            <span className="text-gray-400 text-xl">›</span>
          </Link>
          <Link to="/view-submissions" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-medium"><span className="text-lg">📄</span> View Submissions</span>
            <span className="text-gray-400 text-xl">›</span>
          </Link>
          <Link to="/manage-hackathons" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-medium"><span className="text-lg">🛠️</span> Manage Hackathons</span>
            <span className="text-gray-400 text-xl">›</span>
          </Link>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
}


export default OrganizerDashboard;
