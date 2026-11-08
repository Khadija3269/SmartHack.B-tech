import { useEffect, useState } from "react";
import { currentUser } from "@/lib/auth";
import {
  deleteFeedback,
  feedbackFor,
  feedbackSummary,
  isJoined,
  myFeedbackFor,
  refreshFeedback,
  submitFeedback,
} from "@/lib/store";

const SENTIMENT_BADGE = {
  positive: { emoji: "😊", label: "Positive", color: "text-green-700" },
  neutral: { emoji: "😐", label: "Neutral", color: "text-gray-600" },
  negative: { emoji: "😟", label: "Negative", color: "text-red-700" },
};

function Stars({ value, onChange, readonly }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange && onChange(n)}
          className={`text-2xl leading-none ${n <= value ? "text-yellow-400" : "text-gray-300"} ${readonly ? "" : "cursor-pointer"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function EventFeedback({ hackathon }) {
  const user = currentUser();
  const canGiveFeedback = user?.role === "participant" && isJoined(hackathon.id);

  const [list, setList] = useState([]);
  const [summary, setSummary] = useState({ count: 0, average: null });
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  const refresh = () => {
    setList(feedbackFor(hackathon.id));
    setSummary(feedbackSummary(hackathon.id));
    const mine = myFeedbackFor(hackathon.id);
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment || "");
    }
  };

  useEffect(() => {
    refreshFeedback(hackathon.id).finally(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon.id]);

  const handleSubmit = async () => {
    if (!rating) { setError("Pick a star rating first."); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitFeedback(hackathon.id, rating, comment);
      refresh();
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    if (!confirm("Delete this feedback?")) return;
    deleteFeedback(id);
    refresh();
  };

  const isModerator = user?.role === "organizer" || user?.role === "admin";
  const canDelete = (fb) => user && (user.email?.toLowerCase() === fb.participantEmail?.toLowerCase() || isModerator);

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#1f3a68]">⭐ Event Feedback</h2>
        {summary.count > 0 && (
          <span className="text-xs text-gray-600 font-semibold">
            {summary.average.toFixed(1)} / 5 average · {summary.count} review{summary.count === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {canGiveFeedback && (
        <div className="bg-[#cfe0f3]/40 rounded-md p-3 mb-4">
          <p className="text-xs font-semibold text-[#1f3a68] mb-1">Rate this hackathon</p>
          <Stars value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Optional comment — what worked, what could be better…"
            className="w-full mt-2 rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          />
          {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          <div className="flex justify-end mt-2">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#5B8FCF] text-white text-sm font-semibold rounded-md px-4 py-1.5 disabled:opacity-50"
            >
              {submitting ? "Saving…" : savedFlash ? "✓ Saved" : "Submit feedback"}
            </button>
          </div>
        </div>
      )}

      {!canGiveFeedback && user?.role === "participant" && !isJoined(hackathon.id) && (
        <p className="text-sm text-gray-600 mb-4">Join this hackathon to leave feedback.</p>
      )}
      {!user && (
        <p className="text-sm text-gray-600 mb-4">Log in as a participant to leave feedback.</p>
      )}

      {list.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-4">No feedback yet.</p>
      ) : (
        <ul className="space-y-3">
          {list.map((f) => (
            <li key={f.id} className="border rounded-md p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#1f3a68]">{f.participantName}</span>
                    <Stars value={f.rating} readonly />
                  </div>
                  {f.comment && <p className="text-sm text-gray-800 mt-1">{f.comment}</p>}
                  {f.sentiment && SENTIMENT_BADGE[f.sentiment] && (
                    <p className={`text-xs font-semibold mt-1 ${SENTIMENT_BADGE[f.sentiment].color}`}>
                      {SENTIMENT_BADGE[f.sentiment].emoji} {SENTIMENT_BADGE[f.sentiment].label} sentiment
                    </p>
                  )}
                </div>
                {canDelete(f) && (
                  <button onClick={() => handleDelete(f.id)} className="text-red-500 text-xs font-bold shrink-0">×</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
