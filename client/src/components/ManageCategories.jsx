import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import {
  addCategory,
  getCategoryRecords,
  getHackathons,
  getUsersWithStatus,
  isArchived,
  refreshCategories,
  refreshHackathons,
  refreshUsers,
  removeCategory,
  renameCategory,
} from "@/lib/store";

// Admin-only: the list of hackathon categories is no longer fixed.
function ManageCategoriesPage() {
  const navigate = useNavigate();
  const me = currentUser();
  const [, tick] = useState(0);
  const rerender = () => tick((t) => t + 1);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [flash, setFlash] = useState(null); // { ok: boolean, text: string }
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!me) { navigate("/login"); return; }
    if (me.role !== "admin") { navigate("/"); return; }
    Promise.all([refreshCategories(), refreshHackathons(), refreshUsers()]).finally(rerender);
  }, []);

  const show = (text, ok = true) => {
    setFlash({ ok, text });
    setTimeout(() => setFlash(null), 3500);
  };

  const run = async (fn, successText) => {
    setBusy(true);
    try { await fn(); show(successText); return true; }
    catch (e) { show(e.message || "Something went wrong.", false); return false; }
    finally { setBusy(false); rerender(); }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    if (await run(() => addCategory(n), `Added “${n}”.`)) setName("");
  };
  const handleRename = async (c) => {
    const n = editName.trim();
    if (!n || n === c.name) { setEditingId(null); return; }
    if (await run(() => renameCategory(c.id, n), `Renamed “${c.name}” to “${n}”.`)) setEditingId(null);
  };
  const handleDelete = (c) => {
    if (!confirm(`Delete the category “${c.name}”? Organizers assigned to it will lose it.`)) return;
    run(() => removeCategory(c.id), `Deleted “${c.name}”.`);
  };

  const hackathons = getHackathons();
  const organizers = getUsersWithStatus().filter((u) => u.role === "organizer");
  const categories = getCategoryRecords();

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between">
        <h1 className="text-[#1f3a68] text-xl font-bold">Manage Categories</h1>
        <Link to="/admin-dashboard" className="text-[#1f3a68] text-2xl">←</Link>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <p className="text-sm text-gray-600 mb-4">
          Categories group hackathons and decide which organizers can manage them. Add as many as you need;
          assign them to organizers from <Link to="/manage-users" className="text-[#5B8FCF] font-semibold underline">Manage Users</Link>.
        </p>

        {flash && (
          <div className={`mb-4 rounded-md border px-4 py-2 text-sm font-semibold ${flash.ok ? "bg-green-100 border-green-300 text-green-800" : "bg-red-100 border-red-300 text-red-800"}`}>
            {flash.text}
          </div>
        )}

        <form onSubmit={handleAdd} className="flex gap-2 mb-6">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="New category name (e.g. Blockchain)"
            aria-label="New category name"
            className="flex-1 border border-[#5B8FCF] rounded-md px-3 py-2 text-sm"
          />
          <button type="submit" disabled={busy || !name.trim()}
            className="bg-[#1f3a68] text-white rounded-md px-5 py-2 text-sm font-semibold disabled:opacity-50">
            ＋ Add category
          </button>
        </form>

        {categories.length === 0 && <p className="text-center text-gray-500 py-8">No categories yet — add your first one above.</p>}

        <div className="space-y-3">
          {categories.map((c) => {
            const used = hackathons.filter((h) => h.category === c.name);
            const activeCount = used.filter((h) => !isArchived(h)).length;
            const orgs = organizers.filter((u) => (u.categories || []).includes(c.name));
            const editing = editingId === c.id;
            return (
              <div key={c.id} className="bg-[#cfe0f3] rounded-lg p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  {editing ? (
                    <input autoFocus value={editName} maxLength={40}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(c); if (e.key === "Escape") setEditingId(null); }}
                      aria-label={`Rename ${c.name}`}
                      className="border border-[#5B8FCF] rounded px-2 py-1 text-sm w-full" />
                  ) : (
                    <div className="font-bold text-[#1f3a68]">{c.name}</div>
                  )}
                  <div className="text-xs text-gray-700 mt-1">
                    {activeCount} active · {used.length - activeCount} archived hackathon{used.length === 1 ? "" : "s"}
                    {" • "}
                    {orgs.length ? `${orgs.length} organizer${orgs.length === 1 ? "" : "s"}: ${orgs.map((u) => u.fullName || u.email).join(", ")}` : <em>no organizer assigned</em>}
                  </div>
                </div>
                {editing ? (
                  <div className="flex gap-2">
                    <button onClick={() => setEditingId(null)} className="text-sm px-3 py-1 rounded border bg-white">Cancel</button>
                    <button onClick={() => handleRename(c)} disabled={busy} className="text-sm px-3 py-1 rounded bg-[#5B8FCF] text-white font-semibold">Save</button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className="bg-[#5B8FCF] text-white rounded px-4 py-1 text-sm font-semibold">Rename</button>
                    <button onClick={() => handleDelete(c)} disabled={busy || used.length > 0}
                      title={used.length ? "In use by hackathons — rename it instead" : "Delete category"}
                      className="bg-red-600 text-white rounded px-4 py-1 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default ManageCategoriesPage;
