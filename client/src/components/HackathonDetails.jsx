import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MentorQA } from "@/components/MentorQA";
import { DiscussionBoard } from "@/components/DiscussionBoard";
import { EventFeedback } from "@/components/EventFeedback";
import { TeamMatching } from "@/components/TeamMatching";
import { currentUser } from "@/lib/auth";
import { AdCard } from "@/components/AdCard";
import { announcementsFor, getHackathon, isAdLive, isArchived, isJoined, joinHackathon, leaveHackathon, refreshAnnouncements } from "@/lib/store";

function HackathonDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hack, setHack] = useState();
  const [joined, setJoined] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    setHack(getHackathon(id));
    setJoined(isJoined(id));
    refreshAnnouncements().then(() => setAnnouncements(announcementsFor(id).filter(isAdLive)));
  }, [id]);

  if (!hack) {
    return (
      <div className="min-h-screen bg-white">
        <SiteHeader active="hackathons" />
        <p className="text-center mt-20 text-gray-500">Hackathon not found.</p>
      </div>
    );
  }

  const handleJoin = () => {
    const user = currentUser();
    if (!user) return navigate("/login");
    if (user.role !== "participant") {
      alert("Only participants can join hackathons.");
      return;
    }
    if (isArchived(hack) && !joined) {
      alert("This hackathon is archived and closed to new participants.");
      return;
    }
    if (joined) {
      leaveHackathon(id);
      setJoined(false);
    } else {
      try {
        joinHackathon(id);
        setJoined(true);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Could not join hackathon.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="hackathons" />

      <div className="bg-[#5B8FCF] py-8 text-center relative">
        <Link to={isArchived(hack) ? "/archive" : "/hackathons"} className="absolute right-6 top-6 text-gray-800 text-2xl">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">{hack.title}</h1>
      </div>

      <main className="max-w-3xl mx-auto px-10 py-8 space-y-3 text-gray-800 text-sm">
        {isArchived(hack) && (
          <div className="rounded-md bg-gray-100 border border-gray-300 text-gray-700 px-4 py-2 font-semibold">
            {hack.archivedReason === "deleted"
              ? "🗄️ This hackathon was removed by its organizers and is archived. Joining and new submissions are closed."
              : "🗄️ This hackathon has ended and is archived. Joining and new submissions are closed."}
          </div>
        )}
        <div><span className="font-bold">Category:</span> {hack.category || "—"}</div>
        <div><span className="font-bold">Theme:</span> {hack.theme}</div>
        <div><span className="font-bold">Date:</span> {hack.startDate} → {hack.endDate}</div>
        <div><span className="font-bold">Location:</span> {hack.location}</div>
        <div><span className="font-bold">Duration:</span> {hack.duration}</div>
        <hr />
        <div><div className="font-bold mb-1">Description</div>{hack.description}</div>
        <hr />
        <div><span className="font-bold">Team Size:</span> {hack.teamSize}</div>
        <hr />
        <div><span className="font-bold">Rewards:</span> {hack.rewards}</div>
        {hack.submissionDeadline && (
          <>
            <hr />
            <div><span className="font-bold">Submission Deadline:</span> {hack.submissionDeadline}</div>
          </>
        )}
        {hack.timeline?.length > 0 && (
          <>
            <hr />
            <div>
              <div className="font-bold mb-1">Event Timeline</div>
              <ul className="list-disc list-inside space-y-1">
                {hack.timeline.map((t, i) => (
                  <li key={i}>{t.label} — {t.date}</li>
                ))}
              </ul>
            </div>
          </>
        )}
        {announcements.length > 0 && (
          <>
            <hr />
            <div>
              <div className="font-bold mb-1">📣 Announcements &amp; ads</div>
              <div className="space-y-2">
                {announcements.map((a) => <AdCard key={a.id} ad={a} />)}
              </div>
            </div>
          </>
        )}
        <hr />

        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            onClick={handleJoin}
            disabled={isArchived(hack) && !joined}
            className={`font-semibold px-10 py-3 rounded-full shadow hover:opacity-90 text-white disabled:opacity-50 disabled:cursor-not-allowed ${
              joined ? "bg-red-600" : "bg-[#5B8FCF]"
            }`}
          >
            {joined ? "Leave Hackathon" : isArchived(hack) ? "Closed" : "Join Now"}
          </button>
          {joined && !isArchived(hack) && (<Link to="/submit-project" className="text-[#5B8FCF] underline text-sm font-semibold">
              Submit your project →
            </Link>)}
          <Link to="/leaderboard" className="text-[#1f3a68] underline text-sm font-semibold">
            🏆 View Leaderboard →
          </Link>
        </div>

        <MentorQA hackathon={hack} />
        <TeamMatching hackathon={hack} />
        <DiscussionBoard hackathon={hack} />
        <EventFeedback hackathon={hack} />
      </main>
    </div>
  );
}


export default HackathonDetailsPage;
