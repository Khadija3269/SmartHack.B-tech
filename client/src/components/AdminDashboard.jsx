import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarProfile } from "@/components/SidebarProfile";
import { stats, refreshHackathons, refreshSubmissions, refreshUsers, usersSummary } from "@/lib/store";

function AdminDashboard() {
  const [s, setS] = useState({ hackCount: 0, partCount: 0, subCount: 0, userCount: 0 });
  const [sum, setSum] = useState(null);
  useEffect(() => {
    Promise.all([refreshHackathons(), refreshSubmissions(), refreshUsers()]).finally(() => { setS(stats()); setSum(usersSummary()); });
  }, []);

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

        {sum && (
          <div className="mb-8 rounded-xl border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#1f3a68]">Users at a glance</span>
              <Link to="/users-summary" className="text-sm font-semibold text-[#5B8FCF] underline">Full summary →</Link>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {sum.byRole.map((r) => (
                <span key={r.role} className="bg-[#cfe0f3] text-[#1f3a68] rounded-full px-3 py-1 font-semibold capitalize">{r.role}s: {r.total}</span>
              ))}
              {sum.byStatus.Pending > 0 && (
                <Link to="/manage-users" className="bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-3 py-1 font-semibold">
                  ⏳ {sum.byStatus.Pending} pending approval
                </Link>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border bg-white shadow-sm divide-y">
          <Link to="/manage-users" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>👤</span> Manage Users</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/users-summary" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>📋</span> Users Summary</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/manage-categories" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>🏷️</span> Manage Categories</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/manage-hackathons" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>🏆</span> Manage Hackathons</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/create-hackathon" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>＋</span> Create Hackathon</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/view-submissions" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>📄</span> View Submissions</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/reports" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>📊</span> Reports (view &amp; print)</span>
            <span className="text-gray-400">›</span>
          </Link>
          <Link to="/archive" className="flex items-center justify-between p-5 hover:bg-gray-50">
            <span className="flex items-center gap-3 font-semibold"><span>🗄️</span> Archived Hackathons</span>
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
