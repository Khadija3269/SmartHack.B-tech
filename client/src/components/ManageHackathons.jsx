import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { ShareButtons } from "@/components/ShareButtons";
import {
  addJudge,
  removeJudge,
  assignMentor,
  announcementsFor,
  deleteAnnouncement,
  deleteHackathon,
  getCategories,
  isArchived,
  manageableHackathons,
  myCategories,
  publishCategoryAnnouncement,
  setArchived,
  judgesForHackathon,
  mentorForHackathon,
  publishAnnouncement,
  refreshAnnouncements,
  refreshCategories,
  refreshHackathons,
  refreshAssignments,
  refreshMentorAssignments,
  refreshUsers,
  updateHackathon,
} from "@/lib/store";
import { currentUser, getUsers } from "@/lib/auth";
import { AdLinkFields, AdLinkSummary, EMPTY_AD_LINK, adLinkError } from "@/components/AdCard";

function ManageHackathonsPage() {
  const navigate = useNavigate();
  const me = currentUser();
  const isAdminUser = me?.role === "admin";
  const [view, setView] = useState("active"); // active | archived
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [catAnnounceOpen, setCatAnnounceOpen] = useState(false);
  const [catAnnounce, setCatAnnounce] = useState({ category: "", title: "", message: "", link: EMPTY_AD_LINK });
  const [items, setItems] = useState([]);
  const [judges, setJudges] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [flash, setFlash] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [announceOpenId, setAnnounceOpenId] = useState(null);
  const [announceDraft, setAnnounceDraft] = useState({ title: "", message: "", link: EMPTY_AD_LINK });
  const [, forceTick] = useState(0);

  const refresh = () => {
    setItems(manageableHackathons().sort((a, b) => (a.startDate || "").localeCompare(b.startDate || "")));
    const users = getUsers();
    setJudges(users.filter((u) => u.role === "judge").map((u) => ({ email: u.email, fullName: u.fullName })));
    setMentors(users.filter((u) => u.role === "mentor").map((u) => ({ email: u.email, fullName: u.fullName })));
  };

  useEffect(() => {
    if (!me) { navigate("/login"); return; }
    if (!["admin", "organizer"].includes(me.role)) { navigate("/"); return; }
    Promise.all([refreshHackathons(), refreshAssignments(), refreshMentorAssignments(), refreshUsers(), refreshAnnouncements(), refreshCategories()])
      .finally(() => { refresh(); forceTick((t) => t + 1); });
  }, []);

  const showFlash = (msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 2500);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setEditDraft({
      title: h.title || "",
      theme: h.theme || "",
      category: h.category || "",
      startDate: h.startDate || "",
      endDate: h.endDate || "",
      submissionDeadline: h.submissionDeadline || "",
      timeline: (h.timeline && h.timeline.length ? h.timeline : [{ label: "", date: "" }]),
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditDraft(null); };
  const saveEdit = (id) => {
    const patch = {
      ...editDraft,
      timeline: editDraft.timeline.filter((r) => r.label.trim() || r.date),
    };
    updateHackathon(id, patch);
    setEditingId(null);
    setEditDraft(null);
    refresh();
    showFlash("Hackathon updated.");
  };
  const updateTimelineRow = (i, field, value) => {
    setEditDraft((d) => ({ ...d, timeline: d.timeline.map((r, idx) => idx === i ? { ...r, [field]: value } : r) }));
  };
  const addTimelineRow = () => setEditDraft((d) => ({ ...d, timeline: [...d.timeline, { label: "", date: "" }] }));
  const removeTimelineRow = (i) => setEditDraft((d) => ({ ...d, timeline: d.timeline.filter((_, idx) => idx !== i) }));

  const handlePublish = (hackathonId) => {
    if (!announceDraft.title.trim() || !announceDraft.message.trim()) return false;
    const linkErr = adLinkError(announceDraft.link);
    if (linkErr) { showFlash(linkErr); return false; }
    publishAnnouncement(hackathonId, announceDraft.title.trim(), announceDraft.message.trim(), announceDraft.link)
      .then(() => { forceTick((t) => t + 1); showFlash(announceDraft.link.mode !== "none" ? "Ad published." : "Announcement published."); })
      .catch((e) => showFlash(e.message || "Could not publish announcement."));
    setAnnounceDraft({ title: "", message: "", link: EMPTY_AD_LINK });
    return true;
  };
  const handleCategoryPublish = () => {
    const { category, title, message, link } = catAnnounce;
    if (!category || !title.trim() || !message.trim()) { showFlash("Choose a category and fill in the title and message."); return; }
    const linkErr = adLinkError(link);
    if (linkErr) { showFlash(linkErr); return; }
    publishCategoryAnnouncement(category, title.trim(), message.trim(), link)
      .then((rows) => {
        forceTick((t) => t + 1);
        setCatAnnounceOpen(false);
        setCatAnnounce({ category: "", title: "", message: "", link: EMPTY_AD_LINK });
        showFlash(`Announcement sent to ${rows.length} ${category} hackathon${rows.length === 1 ? "" : "s"}.`);
      })
      .catch((e) => showFlash(e.message || "Could not publish announcement."));
  };
  const handleArchive = (h, archive) => {
    if (archive && !confirm(`Archive "${h.title}"? It will be closed to joining and submissions.`)) return;
    setArchived(h.id, archive)
      .then(() => { refresh(); showFlash(archive ? "Hackathon archived." : "Hackathon restored."); })
      .catch((e) => { refresh(); showFlash(e.message || "Could not update hackathon."); });
    refresh();
  };
  // Deleting never destroys data: the hackathon moves to the Archived tab and can be restored.
  const handleDelete = (h) => {
    if (!confirm(`Delete "${h.title}"?\n\nIt will be moved to the archive (closed to joining and submissions). Its teams, submissions and scores are kept, and you can restore it later.`)) return;
    deleteHackathon(h.id)
      .then(() => { refresh(); showFlash("Hackathon deleted and moved to the archive."); })
      .catch((e) => { refresh(); showFlash(e.message || "Could not delete hackathon."); });
    refresh();
  };
  const handleDeleteAnnouncement = (id) => {
    deleteAnnouncement(id);
    forceTick((t) => t + 1);
    showFlash("Announcement removed.");
  };

  const visible = items.filter(
    (h) => (view === "archived") === isArchived(h) && (categoryFilter === "all" || h.category === categoryFilter)
  );

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#a8c5e8] px-6 py-4 flex items-center justify-between">
        <h1 className="text-[#1f3a68] text-xl font-bold">Manage Hackathons</h1>
        <Link to={isAdminUser ? "/admin-dashboard" : "/organizer-dashboard"} className="text-[#1f3a68] text-2xl">←</Link>
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

        {/* Organizer scope notice */}
        {!isAdminUser && (
          <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 text-[#1f3a68] px-4 py-2 text-sm">
            You manage: {myCategories().length ? <strong>{myCategories().join(", ")}</strong> : <em>no categories assigned yet — ask an admin.</em>}
          </div>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-md overflow-hidden border border-[#5B8FCF]">
            {[["active", "Active"], ["archived", "Archived"]].map(([k, label]) => (
              <button key={k} onClick={() => setView(k)}
                className={`px-4 py-1.5 text-sm font-semibold ${view === k ? "bg-[#5B8FCF] text-white" : "bg-white text-[#1f3a68]"}`}>
                {label} ({items.filter((h) => (k === "archived") === isArchived(h)).length})
              </button>
            ))}
          </div>
          <label htmlFor="mh-category" className="text-[#1f3a68] font-semibold text-sm">Category:</label>
          <select id="mh-category" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-[#5B8FCF] rounded-md px-3 py-1.5 bg-white text-[#1f3a68] text-sm font-medium">
            <option value="all">All {isAdminUser ? "" : "my "}categories</option>
            {(isAdminUser ? getCategories() : myCategories()).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setCatAnnounceOpen((o) => !o)}
            className="ml-auto bg-[#1f3a68] text-white rounded px-3 py-1.5 text-sm font-semibold">
            📣 Announce / advertise to a category
          </button>
        </div>

        {catAnnounceOpen && (
          <div className="mb-5 bg-white border border-[#5B8FCF] rounded-lg p-4 space-y-2">
            <p className="text-sm font-bold text-[#1f3a68]">Announce or advertise on every active hackathon in a category</p>
            <select value={catAnnounce.category} onChange={(e) => setCatAnnounce({ ...catAnnounce, category: e.target.value })}
              className="border rounded px-2 py-1 text-sm w-full">
              <option value="">— choose category —</option>
              {(isAdminUser ? getCategories() : myCategories()).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Announcement title"
              value={catAnnounce.title} onChange={(e) => setCatAnnounce({ ...catAnnounce, title: e.target.value })} />
            <textarea className="border rounded px-2 py-1 text-sm w-full" rows={2} placeholder="Message"
              value={catAnnounce.message} onChange={(e) => setCatAnnounce({ ...catAnnounce, message: e.target.value })} />
            <AdLinkFields value={catAnnounce.link} onChange={(link) => setCatAnnounce({ ...catAnnounce, link })} />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCatAnnounceOpen(false)} className="text-sm px-3 py-1 rounded border">Cancel</button>
              <button onClick={handleCategoryPublish} className="text-sm px-3 py-1 rounded bg-[#5B8FCF] text-white font-semibold">Publish to category</button>
            </div>
          </div>
        )}

        {visible.length === 0 && (
          <p className="text-center text-gray-500 py-10">
            {items.length === 0 ? "No hackathons in your scope yet." : `No ${view} hackathons match your filters.`}
          </p>
        )}

        <div className="space-y-4">
          {visible.map((h) => {
            const archived = isArchived(h);
            const assignedEmails = (judgesForHackathon(h.id) || []).map((e) => e.toLowerCase());
            const assignedJudges = judges.filter((j) => assignedEmails.includes(j.email.toLowerCase()));
            const assignedMentorEmail = mentorForHackathon(h.id) || "";
            const assignedMentor = mentors.find((m) => m.email.toLowerCase() === assignedMentorEmail.toLowerCase());
            return (
              <div key={h.id} className="bg-[#cfe0f3] rounded-xl p-5 grid grid-cols-[1fr_240px] gap-5 items-center">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-[#1f3a68] text-white text-xs font-semibold rounded-full px-2.5 py-0.5">{h.category || "Uncategorized"}</span>
                    {archived && (
                      <span className={`${h.archivedReason === "deleted" ? "bg-red-600" : "bg-gray-500"} text-white text-xs font-semibold rounded-full px-2.5 py-0.5`}>
                        {h.archivedReason === "deleted" ? "Deleted" : h.archivedReason === "manual" ? "Archived" : "Ended"}
                      </span>
                    )}
                    {archived && h.archivedAt && (
                      <span className="text-xs text-gray-600">
                        {h.archivedReason === "deleted" ? "deleted" : "archived"} {new Date(h.archivedAt).toLocaleDateString()}{h.archivedBy ? ` by ${h.archivedBy}` : ""}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold mb-2">{h.title}</h3>
                  <p className="text-sm text-gray-800 mb-2">{h.description}</p>
                  <p className="text-xs text-gray-700">{h.startDate} → {h.endDate} • {h.location}</p>
                  {h.submissionDeadline && (
                    <p className="text-xs text-gray-700 mt-1">
                      <span className="font-semibold">Submission deadline:</span> {h.submissionDeadline}
                    </p>
                  )}
                  {h.timeline?.length > 0 && (
                    <ul className="text-xs text-gray-700 mt-1 list-disc list-inside">
                      {h.timeline.map((t, i) => (
                        <li key={i}>{t.label} — {t.date}</li>
                      ))}
                    </ul>
                  )}

                  <div className="mt-2">
                    <p className="text-xs font-semibold mb-1">📢 Share this hackathon</p>
                    <ShareButtons
                      text={`🚀 Join "${h.title}"! Theme: ${h.theme || "open"}. ${h.startDate} → ${h.endDate} at ${h.location}.`}
                      url={`${window.location.origin}/hackathon-details/${h.id}`}
                    />
                  </div>
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

                  {editingId === h.id && editDraft && (
                    <div className="mt-3 bg-white rounded-lg p-4 space-y-3 border border-[#5B8FCF]">
                      <div className="grid grid-cols-2 gap-2">
                        <input className="border rounded px-2 py-1 text-sm" placeholder="Title" value={editDraft.title}
                          onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })} />
                        <input className="border rounded px-2 py-1 text-sm" placeholder="Theme" value={editDraft.theme}
                          onChange={(e) => setEditDraft({ ...editDraft, theme: e.target.value })} />
                        <label className="text-xs font-semibold self-center col-span-2">Category
                          <select className="border rounded px-2 py-1 text-sm w-full" value={editDraft.category}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                            {(isAdminUser ? getCategories() : myCategories()).map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </label>
                        <label className="text-xs font-semibold self-center">Start
                          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={editDraft.startDate}
                            onChange={(e) => setEditDraft({ ...editDraft, startDate: e.target.value })} />
                        </label>
                        <label className="text-xs font-semibold self-center">End
                          <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={editDraft.endDate}
                            onChange={(e) => setEditDraft({ ...editDraft, endDate: e.target.value })} />
                        </label>
                      </div>
                      <label className="text-xs font-semibold block">Submission deadline
                        <input type="date" className="border rounded px-2 py-1 text-sm w-full" value={editDraft.submissionDeadline}
                          onChange={(e) => setEditDraft({ ...editDraft, submissionDeadline: e.target.value })} />
                      </label>
                      <div>
                        <label className="text-xs font-semibold block mb-1">Timeline</label>
                        <div className="space-y-1">
                          {editDraft.timeline.map((row, i) => (
                            <div key={i} className="flex gap-1 items-center">
                              <input className="border rounded px-2 py-1 text-xs flex-1" placeholder="Milestone" value={row.label}
                                onChange={(e) => updateTimelineRow(i, "label", e.target.value)} />
                              <input type="datetime-local" className="border rounded px-2 py-1 text-xs" value={row.date}
                                onChange={(e) => updateTimelineRow(i, "date", e.target.value)} />
                              <button onClick={() => removeTimelineRow(i)} className="text-red-500 font-bold px-1">×</button>
                            </div>
                          ))}
                        </div>
                        <button onClick={addTimelineRow} className="text-xs font-semibold text-[#5B8FCF] hover:underline mt-1">
                          + Add milestone
                        </button>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={cancelEdit} className="text-sm px-3 py-1 rounded border">Cancel</button>
                        <button onClick={() => saveEdit(h.id)} className="text-sm px-3 py-1 rounded bg-[#5B8FCF] text-white font-semibold">Save</button>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 bg-white rounded-lg p-4 border">
                    <p className="text-xs font-bold mb-2">📣 Ads &amp; announcements</p>
                    {announcementsFor(h.id).map((a) => (
                      <div key={a.id} className="bg-green-50 border border-green-200 rounded px-2 py-1.5 mb-1 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-semibold">{a.title}</span> — {a.message}
                            <AdLinkSummary ad={a} />
                          </div>
                          <button onClick={() => handleDeleteAnnouncement(a.id)} className="text-red-600 font-bold ml-2 shrink-0">×</button>
                        </div>
                        <div className="mt-1.5">
                          <ShareButtons
                            text={`📣 ${a.title} — ${a.message} (${h.title})`}
                            url={`${window.location.origin}/hackathon-details/${h.id}`}
                          />
                        </div>
                      </div>
                    ))}
                    {announceOpenId === h.id ? (
                      <div className="space-y-1 mt-1">
                        <input className="border rounded px-2 py-1 text-xs w-full" placeholder="Announcement title"
                          value={announceDraft.title} onChange={(e) => setAnnounceDraft({ ...announceDraft, title: e.target.value })} />
                        <textarea className="border rounded px-2 py-1 text-xs w-full" rows={2} placeholder="Message"
                          value={announceDraft.message} onChange={(e) => setAnnounceDraft({ ...announceDraft, message: e.target.value })} />
                        <AdLinkFields size="xs" excludeId={h.id} value={announceDraft.link} onChange={(link) => setAnnounceDraft({ ...announceDraft, link })} />
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => { setAnnounceOpenId(null); setAnnounceDraft({ title: "", message: "", link: EMPTY_AD_LINK }); }} className="text-xs px-2 py-1 rounded border">Cancel</button>
                          <button onClick={() => { if (handlePublish(h.id)) setAnnounceOpenId(null); }} className="text-xs px-2 py-1 rounded bg-[#5B8FCF] text-white font-semibold">Publish</button>
                        </div>
                      </div>
                    ) : archived ? (
                      <p className="text-xs text-gray-500 italic">Announcements are closed for archived hackathons.</p>
                    ) : (
                      <button onClick={() => setAnnounceOpenId(h.id)} className="text-xs font-semibold text-[#5B8FCF] hover:underline">
                        + New announcement / ad
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => openEdit(h)}
                    className="bg-[#5B8FCF] text-white rounded w-32 py-1.5 font-semibold"
                  >Edit</button>
                  <button
                    onClick={() => handleArchive(h, !archived)}
                    className="bg-gray-600 text-white rounded w-32 py-1.5 font-semibold"
                    title={archived && h.endDate && h.endDate < new Date().toLocaleDateString("en-CA") ? "Ended — extend the end date (Edit) to re-open" : ""}
                  >{archived ? "Restore" : "Archive"}</button>
                  {!archived && (
                    <button
                      onClick={() => handleDelete(h)}
                      className="bg-red-600 text-white rounded w-32 py-1.5 font-semibold"
                      title="Moves the hackathon to the archive — nothing is permanently erased"
                    >Delete</button>
                  )}
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
