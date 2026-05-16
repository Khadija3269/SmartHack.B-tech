import { Link, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { MentorQA } from "@/components/MentorQA";
import { currentUser } from "@/lib/auth";
import { getHackathon, isJoined, joinHackathon, leaveHackathon } from "@/lib/store";

function HackathonDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hack, setHack] = useState();
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    setHack(getHackathon(id));
    setJoined(isJoined(id));
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
        <Link to="/hackathons" className="absolute right-6 top-6 text-gray-800 text-2xl">←</Link>
        <h1 className="text-2xl font-bold text-gray-800">{hack.title}</h1>
      </div>

      <main className="max-w-3xl mx-auto px-10 py-8 space-y-3 text-gray-800 text-sm">
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
        <hr />

        <div className="flex flex-col items-center gap-3 pt-4">
          <button
            onClick={handleJoin}
            className={`font-semibold px-10 py-3 rounded-full shadow hover:opacity-90 text-white ${
              joined ? "bg-red-600" : "bg-[#5B8FCF]"
            }`}
          >
            {joined ? "Leave Hackathon" : "Join Now"}
          </button>
          {joined && (<Link to="/submit-project" className="text-[#5B8FCF] underline text-sm font-semibold">
              Submit your project →
            </Link>)}
        </div>

        <MentorQA hackathon={hack} />
      </main>
    </div>
  );
}


export default HackathonDetailsPage;
