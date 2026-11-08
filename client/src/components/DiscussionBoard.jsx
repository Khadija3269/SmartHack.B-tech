import { useEffect, useState } from "react";
import { currentUser } from "@/lib/auth";
import {
  deleteDiscussionPost,
  discussionThreadsFor,
  isJoined,
  mentorForHackathon,
  postDiscussion,
  refreshDiscussion,
} from "@/lib/store";

const ROLE_BADGE = {
  mentor: { emoji: "🎓", label: "Mentor" },
  organizer: { emoji: "🛠️", label: "Organizer" },
  admin: { emoji: "🛠️", label: "Admin" },
  participant: { emoji: "🙋", label: "Participant" },
};

function timeAgo(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleString();
}

export function DiscussionBoard({ hackathon }) {
  const user = currentUser();
  const isMentor = user?.role === "mentor" && mentorForHackathon(hackathon.id) === user?.email?.toLowerCase();
  const isModerator = user?.role === "organizer" || user?.role === "admin";
  const canPost = !!user && (
    (user.role === "participant" && isJoined(hackathon.id)) || isMentor || isModerator
  );

  const [threads, setThreads] = useState([]);
  const [draft, setDraft] = useState("");
  const [replyDrafts, setReplyDrafts] = useState({});
  const [openReplyFor, setOpenReplyFor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const refresh = () => setThreads(discussionThreadsFor(hackathon.id));

  useEffect(() => {
    refreshDiscussion(hackathon.id).finally(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon.id]);

  const handlePost = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await postDiscussion(hackathon.id, draft.trim());
      setDraft("");
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId) => {
    const text = (replyDrafts[parentId] || "").trim();
    if (!text) return;
    try {
      await postDiscussion(hackathon.id, text, parentId);
      setReplyDrafts((d) => ({ ...d, [parentId]: "" }));
      setOpenReplyFor(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reply.");
    }
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this post?")) return;
    deleteDiscussionPost(id);
    refresh();
  };

  const canDelete = (post) => user && (user.email?.toLowerCase() === post.authorEmail?.toLowerCase() || isModerator);

  const badge = (role) => ROLE_BADGE[role] || ROLE_BADGE.participant;

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#1f3a68]">🗣️ Discussion Board</h2>
        <span className="text-xs text-gray-500">{threads.length} thread{threads.length === 1 ? "" : "s"}</span>
      </div>

      {canPost && (
        <div className="bg-[#cfe0f3]/40 rounded-md p-3 mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Start a discussion — ask the group a question, share a tip, or start a conversation…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handlePost}
              disabled={submitting || !draft.trim()}
              className="bg-[#5B8FCF] text-white text-sm font-semibold rounded-md px-4 py-1.5 disabled:opacity-50"
            >
              Post
            </button>
          </div>
        </div>
      )}

      {!canPost && !user && (
        <p className="text-sm text-gray-600 mb-4">Log in and join this hackathon to take part in the discussion.</p>
      )}
      {!canPost && user?.role === "participant" && !isJoined(hackathon.id) && (
        <p className="text-sm text-gray-600 mb-4">Join this hackathon to post in the discussion.</p>
      )}

      {error && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      {threads.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-4">No discussions yet — be the first to post.</p>
      ) : (
        <ul className="space-y-4">
          {threads.map((t) => {
            const b = badge(t.authorRole);
            return (
              <li key={t.id} className="border rounded-md p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1f3a68]">
                      {b.emoji} {t.authorName} <span className="text-gray-400 font-normal text-xs">({b.label})</span>
                    </p>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{t.message}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(t.createdAt)}</span>
                    {canDelete(t) && (
                      <button onClick={() => handleDelete(t.id)} className="text-red-500 text-xs font-bold">×</button>
                    )}
                  </div>
                </div>

                {t.replies.length > 0 && (
                  <ul className="mt-3 ml-4 pl-3 border-l-2 border-[#cfe0f3] space-y-2">
                    {t.replies.map((r) => {
                      const rb = badge(r.authorRole);
                      return (
                        <li key={r.id} className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-[#1f3a68]">
                              {rb.emoji} {r.authorName} <span className="text-gray-400 font-normal">({rb.label})</span>
                            </p>
                            <p className="text-sm text-gray-800">{r.message}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(r.createdAt)}</span>
                            {canDelete(r) && (
                              <button onClick={() => handleDelete(r.id)} className="text-red-500 text-xs font-bold">×</button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {canPost && (
                  openReplyFor === t.id ? (
                    <div className="mt-2 ml-4 flex gap-2">
                      <input
                        value={replyDrafts[t.id] || ""}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [t.id]: e.target.value }))}
                        placeholder="Write a reply…"
                        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                      <button onClick={() => handleReply(t.id)} className="bg-[#5B8FCF] text-white text-xs font-semibold rounded px-3 py-1">
                        Reply
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setOpenReplyFor(t.id)} className="mt-2 ml-4 text-xs font-semibold text-[#5B8FCF] hover:underline">
                      Reply
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
