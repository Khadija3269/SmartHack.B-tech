import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarProfile } from "@/components/SidebarProfile";
import { stats, refreshHackathons, refreshSubmissions, refreshUsers } from "@/lib/store";

function AdminDashboard() {
  const [s, setS] = useState({ hackCount: 0, partCount: 0, subCount: 0, userCount: 0 });
  useEffect(() => { Promise.all([refreshHackathons(), refreshSubmissions(), refreshUsers()]).finally(() => setS(stats())); }, []);

  const tiles = [
    { value: s.hackCount, label: "Total Hackathons" },
    { value: s.partCount, label: "Total Participants" },
    { value: s.subCount, label: "Submissions" },
    { value: s.userCount, label: "Total Users" },
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader active="dashboard" />
      <div className="flex flex-1">
        <SidebarProfile />
        <div className="flex-1 flex flex-col">
          <section className="bg-[#5B8FCF] py-6 text-center">
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          </section>

          <main className="max-w-5xl mx-auto p-8 w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 bg-[#5B8FCF] rounded-xl overflow-hidden mb-8">
          {tiles.map((t, i) => (<div key={t.label} className={`text-center text-white py-7 ${i < tiles.length - 1 ? "md:border-r border-white/40" : ""}`}>
              <div className="text-3xl font-bold">{t.value}</div>
              <div className="text-sm font-semibold mt-1">{t.label}</div>
            </div>))}
        </div>

        <div className="rounded-xl border bg-white shadow-sm divide-y">
          <Link to="/manage-users" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>👤</span> Manage Users</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/manage-hackathons" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>🏆</span> Manage Hackathons</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/scoring-config" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>⭐</span> Customized Scoring</span>
            <span className="text-gray-400">›</span>
          </Link>
        </div>
          </main>
        </div>
      </div>
    </div>
  );
}


export default AdminDashboard;
