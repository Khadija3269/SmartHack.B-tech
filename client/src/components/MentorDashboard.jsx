import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SidebarProfile } from "@/components/SidebarProfile";
import { currentUser } from "@/lib/auth";
import {
  leaveHackathon,
  myJoinedHackathons,
  mySubmissions,
  getMentorAssignments,
} from "@/lib/store";
import {
  getNotifications,
  markRead,
  dismissNotification,
} from "@/lib/notifications";

function MentorDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("Browse Hackathons");
  const [items, setItems] = useState([]);
  const [subs, setSubs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const user = currentUser();

  const refreshNotifs = () => {
    if (user?.email) setNotifications(getNotifications(user.email));
  };

  const refresh = () => {
    setItems(myJoinedHackathons());
    setSubs(mySubmissions());
    refreshNotifs();
  };

  useEffect(() => {
    if (!user) navigate("/login");
    refresh();
  }, [navigate]);

  useEffect(() => {
    if (activeTab === "Notifications") refreshNotifs();
  }, [activeTab]);

  const handleLeave = (id, title) => {
    if (!window.confirm(`Leave "${title}"?`)) return;
    leaveHackathon(id);
    refresh();
  };

  const handleNotifClick = (n) => {
    markRead(user.email, n.id);
    refreshNotifs();
    if (n.link) navigate(n.link);
  };

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    dismissNotification(user.email, id);
    refreshNotifs();
  };

  const submittedFor = (hid) => subs.find((s) => s.hackathonId === hid);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <SiteHeader active="dashboard" />
      <div className="flex flex-1">
        <SidebarProfile />
        <div className="flex-1 flex flex-col">
          <section className="bg-[#5B8FCF] py-5 relative">
            <h1 className="text-center text-[#1f3a68] text-2xl font-bold">
              Mentor Dashboard
            </h1>
            <button
              onClick={() => navigate("/settings")}
              className="absolute top-1/2 right-10 -translate-y-1/2 w-11 h-11 rounded-full bg-white flex items-center justify-center text-2xl"
            >
              👩
            </button>
          </section>

          <main className="max-w-3xl mx-auto w-full p-6">
            <div className="flex justify-center mb-6">
              {["Browse Hackathons", "Notifications"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-2 border border-gray-300 text-sm ${
                    activeTab === tab
                      ? "bg-white text-black font-semibold"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {tab}
                  {tab === "Notifications" && unreadCount > 0 && (
                    <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* BROWSE HACKATHONS */}
            {activeTab === "Browse Hackathons" && (
              <div className="space-y-4">
                {items.length === 0 && (
                  <div className="text-center text-gray-500 py-10">
                    Welcome Mentor, Please guide the participants that are lost.{" "}
                    <Link to="/hackathons" className="text-[#5B8FCF] underline">
                      Browse hackathons
                    </Link>
                  </div>
                )}
                {items.map((h) => {
                  const sub = submittedFor(h.id);
                  return (
                    <div key={h.id} className="border border-gray-300 rounded-lg p-5 bg-white">
                      <h3 className="font-bold text-base mb-2">{h.title}</h3>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Status:</span>{" "}
                        <span className={`font-semibold ${sub ? "text-blue-600" : "text-green-600"}`}>
                          {sub ? `Submitted (${sub.status})` : "Joined"}
                        </span>
                      </p>
                      <p className="text-sm mb-1">
                        <span className="font-semibold">Timeline:</span>{" "}
                        {h.startDate} → {h.endDate}
                      </p>
                      <p className="text-sm text-gray-700 mb-3">{h.description}</p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/hackathon-details/${h.id}`}
                          className="bg-black text-white text-xs font-semibold rounded px-4 py-2"
                        >
                          View Details
                        </Link>
                        {!sub && (
                          <Link
                            to={`/submit-project?hackathonId=${h.id}`}
                            className="bg-white border border-black text-black text-xs font-semibold rounded px-4 py-2"
                          >
                            Submit Project
                          </Link>
                        )}
                        <button
                          onClick={() => handleLeave(h.id, h.title)}
                          className="bg-red-600 text-white text-xs font-semibold rounded px-4 py-2"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* NOTIFICATIONS — per-user only */}
            {activeTab === "Notifications" && (
              <div className="space-y-3">
                {notifications.length === 0 && (
                  <div className="text-center text-gray-500 py-10">
                    No notifications.
                  </div>
                )}
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n)}
                    className={`border rounded-lg p-4 bg-white text-sm cursor-pointer flex justify-between items-start gap-3 ${
                      n.read
                        ? "border-gray-200 text-gray-500"
                        : "border-blue-300 font-medium text-gray-800"
                    }`}
                  >
                    <div>
                      {!n.read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 align-middle" />
                      )}
                      <span className="font-semibold">{n.title}</span>
                      <p className="mt-0.5 text-gray-600 font-normal">{n.message}</p>
                      {n.link && (
                        <p className="mt-1 text-[#5B8FCF] text-xs">Tap to view →</p>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleDismiss(e, n.id)}
                      className="text-gray-300 hover:text-red-400 text-xl leading-none flex-shrink-0"
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default MentorDashboard;
