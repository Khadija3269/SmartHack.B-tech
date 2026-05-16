import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { api } from "@/lib/api";
import { getUsersWithStatus, setUserStatus, deleteUser, refreshUsers } from "@/lib/store";

const PRO_ROLES = ["judge", "mentor", "organizer", "admin"];
const ROLE_OPTIONS = ["all", "participant", "judge", "organizer", "mentor", "admin"];

function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [reviewing, setReviewing] = useState(null);

  const refresh = () => setUsers(getUsersWithStatus());
  useEffect(() => { refreshUsers().finally(refresh); }, []);

  const filtered = useMemo(
    () => roleFilter === "all" ? users : users.filter((u) => u.role === roleFilter),
    [users, roleFilter]
  );

  const statusColor = (s) => (s === "Active" ? "text-green-600" : s === "Pending" ? "text-amber-600" : "text-red-600");

  const handleDelete = (email) => {
    if (!confirm("Delete this user?")) return;
    deleteUser(email);
    refresh();
  };

  const decide = async (u, decision) => {
    const reason = decision === "rejected" ? prompt("Reason for rejection (optional):") || "" : "";
    try {
      await api.post(`/api/users/${encodeURIComponent(u.email)}/decision`, { decision, reason });
      await refreshUsers();
      refresh();
      setReviewing(null);
    } catch (e) {
      alert("Failed: " + (e.message || e));
    }
  };

  const downloadCv = async (u) => {
    try {
      const { cvName, cvData } = await api.get(`/api/users/${encodeURIComponent(u.email)}/cv`);
      const a = document.createElement("a");
      a.href = cvData;
      a.download = cvName || "cv";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Failed: " + (e.message || e));
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />

      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between">
        <h1 className="text-[#1f3a68] text-xl font-bold">Manage Users</h1>
        <Link to="/admin-dashboard" className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="mb-4 flex items-center gap-3">
          <label htmlFor="role-filter" className="text-[#1f3a68] font-semibold">Filter by role:</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-[#5B8FCF] rounded-md px-3 py-2 bg-white text-[#1f3a68] font-medium capitalize focus:outline-none focus:ring-2 focus:ring-[#5B8FCF]"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r === "all" ? "All roles" : r.charAt(0).toUpperCase() + r.slice(1) + "s"}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-gray-600">
            {filtered.length} user{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_1fr_1fr_160px] bg-[#5B8FCF] text-white font-bold text-center rounded-lg p-3 mb-4">
          <div>Name</div><div className="border-x border-white">Role</div><div>Status</div><div></div>
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-500 py-10">No users to show.</p>
        )}

        <div className="space-y-3">
          {filtered.map((u) => {
            const isPro = PRO_ROLES.includes(u.role);
            const isPending = u.status === "Pending";
            return (
              <div key={u.email} className="grid grid-cols-[1fr_1fr_1fr_160px] items-center bg-[#cfe0f3] rounded-lg p-4 text-center font-semibold">
                <div>
                  <div>{u.fullName}</div>
                  <div className="text-xs text-gray-600 font-normal">{u.email}</div>
                </div>
                <div className="capitalize">{u.role}</div>
                <div className={`${statusColor(u.status)} font-bold`}>{u.status}</div>
                <div className="flex flex-col gap-1.5 items-center">
                  {isPro && (
                    <button onClick={() => setReviewing(u)} className="bg-[#1f3a68] text-white rounded w-28 py-1 text-sm">
                      {isPending ? "Review" : "View"}
                    </button>
                  )}
                  {!isPending && (
                    <>
                      <button onClick={() => { setUserStatus(u.email, "Blocked"); refresh(); }} className="bg-[#5B8FCF] text-white rounded w-28 py-1 text-sm">Block</button>
                      <button onClick={() => { setUserStatus(u.email, "Active"); refresh(); }} className="bg-green-600 text-white rounded w-28 py-1 text-sm">Activate</button>
                    </>
                  )}
                  <button onClick={() => handleDelete(u.email)} className="bg-red-600 text-white rounded w-28 py-1 text-sm">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {reviewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setReviewing(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-[#1f3a68]">{reviewing.fullName}</h2>
                <p className="text-sm text-gray-600">
                  {reviewing.email} — <span className="capitalize">{reviewing.role}</span>
                </p>
              </div>
              <button onClick={() => setReviewing(null)} className="text-2xl text-gray-500">×</button>
            </div>
            <div className="space-y-3 text-sm">
              <Field label="Organization" value={reviewing.organization} />
              <Field label="Bio" value={reviewing.bio} />
              <Field label="Experience" value={reviewing.experience} />
              <Field label="Reason" value={reviewing.reason} />
              <div>
                <p className="font-bold text-[#1f3a68]">CV</p>
                {reviewing.hasCv ? (
                  <button onClick={() => downloadCv(reviewing)} className="inline-block mt-1 bg-[#5B8FCF] text-white px-4 py-2 rounded">
                    Download {reviewing.cvName || "CV"}
                  </button>
                ) : (<p className="text-gray-500">No CV uploaded.</p>)}
              </div>
              {reviewing.status === "Rejected" && reviewing.rejectionReason && (
                <Field label="Rejection reason" value={reviewing.rejectionReason} />
              )}
            </div>
            {reviewing.status === "Pending" && (
              <div className="flex gap-3 mt-6 justify-end">
                <button onClick={() => decide(reviewing, "rejected")} className="bg-red-600 text-white px-5 py-2 rounded font-semibold">Reject</button>
                <button onClick={() => decide(reviewing, "approved")} className="bg-green-600 text-white px-5 py-2 rounded font-semibold">Approve</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <p className="font-bold text-[#1f3a68]">{label}</p>
      <p className="text-gray-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

export default ManageUsersPage;

