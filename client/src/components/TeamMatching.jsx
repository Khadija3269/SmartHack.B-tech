import { useEffect, useState } from "react";
import { currentUser } from "@/lib/auth";
import { notifyDirect } from "@/lib/notifications";
import { isJoined, refreshRegistrations, refreshUsers, teamMatchesFor } from "@/lib/store";

export function TeamMatching({ hackathon }) {
  const user = currentUser();
  const canSee = user?.role === "participant" && isJoined(hackathon.id);

  const [matches, setMatches] = useState([]);
  const [invited, setInvited] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!canSee) { setLoading(false); return; }
    Promise.all([refreshRegistrations(), refreshUsers()]).finally(() => {
      setMatches(teamMatchesFor(hackathon.id));
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hackathon.id, canSee]);

  if (!canSee) return null;

  const handleInvite = (candidate) => {
    notifyDirect(
      candidate.user.email,
      "Team invite 🤝",
      `${user.fullName || user.email} thinks you'd make a great teammate for "${hackathon.title}" and wants to team up!`,
      `/hackathon-details/${hackathon.id}`,
      "team_invite"
    );
    setInvited((m) => ({ ...m, [candidate.user.email]: true }));
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#1f3a68]">🤝 Suggested Teammates</h2>
        <span className="text-xs text-gray-500">{matches.length} joined</span>
      </div>

      {loading && <p className="text-sm text-gray-500 italic text-center py-4">Finding matches…</p>}

      {!loading && matches.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-4">
          No other participants have joined yet — check back once more people sign up.
        </p>
      )}

      {!loading && matches.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Ranked by shared interests and complementary skills. Add your own skills and interests in{" "}
            <a href="/settings" className="underline">Settings</a> for better matches.
          </p>
          <ul className="space-y-3">
            {matches.map((m) => (
              <li key={m.user.email} className="border rounded-md p-3 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#1f3a68]">{m.user.fullName || m.user.name}</span>
                    <span className="text-xs bg-[#5B8FCF]/10 text-[#5B8FCF] font-bold px-2 py-0.5 rounded-full">
                      {m.score}% match
                    </span>
                  </div>
                  {m.sharedInterests.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Shared interests:</span> {m.sharedInterests.join(", ")}
                    </p>
                  )}
                  {m.complementarySkills.length > 0 && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-semibold">Brings:</span> {m.complementarySkills.join(", ")}
                    </p>
                  )}
                  {m.sharedInterests.length === 0 && m.complementarySkills.length === 0 && (
                    <p className="text-xs text-gray-400 italic mt-1">No profile info yet.</p>
                  )}
                </div>
                <button
                  onClick={() => handleInvite(m)}
                  disabled={invited[m.user.email]}
                  className="shrink-0 bg-[#5B8FCF] text-white text-xs font-semibold rounded-md px-3 py-1.5 disabled:opacity-50"
                >
                  {invited[m.user.email] ? "Invited ✓" : "Invite to team"}
                </button>
              </li>
            ))}
          </ul>
        </>
      
      )}
    </div>
  );
}
