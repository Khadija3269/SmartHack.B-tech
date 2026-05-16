import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { currentUser, dashboardPathFor, logout } from "@/lib/auth";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markRead,
  dismissNotification,
  dismissAll,
} from "@/lib/notifications";

export function SiteHeader({ active }) {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const linkClass = (key) =>
    `text-sm font-medium hover:text-[#5B8FCF] transition ${
      active === key
        ? "underline underline-offset-4 text-[#1f3a68] font-semibold"
        : "text-[#1f3a68]"
    }`;

  const refreshNotifs = (u) => {
    const email = (u || user)?.email;
    if (!email) return;
    setNotifications(getNotifications(email));
    setUnread(getUnreadCount(email));
  };

  useEffect(() => {
    const u = currentUser();
    setUser(u);
    if (u) refreshNotifs(u);

    // Poll every 10s so new broadcasts appear without a page reload
    const interval = setInterval(() => {
      const u2 = currentUser();
      if (u2) refreshNotifs(u2);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    navigate("/");
  };

  const handleBellClick = () => {
    setShowPanel((v) => !v);
    if (!showPanel && user) refreshNotifs(user);
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllRead(user.email);
    refreshNotifs(user);
  };

  const handleNotifClick = (n) => {
    if (!user) return;
    markRead(user.email, n.id);
    refreshNotifs(user);
    setShowPanel(false);
    if (n.link) navigate(n.link);
  };

  // Permanently dismiss — will never be re-delivered to this user
  const handleDismiss = (e, id) => {
    e.stopPropagation();
    if (!user) return;
    dismissNotification(user.email, id);
    refreshNotifs(user);
  };

  const handleDismissAll = () => {
    if (!user) return;
    dismissAll(user.email);
    refreshNotifs(user);
  };

  const typeIcon = (type) => {
    switch (type) {
      case "hackathon": return "🏆";
      case "submission": return "📄";
      case "user":       return "👤";
      default:           return "🔔";
    }
  };

  return (
    <header className="border-b bg-white relative z-50">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-[#5B8FCF] text-white font-bold flex items-center justify-center">
            S
          </div>
          <div className="leading-tight">
            <div className="font-bold text-[#1f3a68]">
              Smart<span className="text-[#5B8FCF]">Hack</span>
            </div>
            <div className="text-xs text-gray-500">Management System</div>
          </div>
        </Link>

        <nav className="flex items-center gap-6">
          <Link to="/" className={linkClass("home")}>Home</Link>
          <Link to="/about" className={linkClass("about")}>About Us</Link>
          {user && (
            <Link to={dashboardPathFor(user.role)} className={linkClass("dashboard")}>
              Dashboard
            </Link>
          )}
          <Link to="/hackathons" className={linkClass("hackathons")}>Hackathons</Link>
          {user && <Link to="/history" className={linkClass("history")}>History</Link>}
          <Link to="/settings" className={linkClass("settings")}>Settings</Link>

          {/* ── Notification Bell ── */}
          {user && (
            <div className="relative" ref={panelRef}>
              <button
                onClick={handleBellClick}
                className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
                title="Notifications"
                aria-label="Notifications"
              >
                <span className="text-xl">🔔</span>
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </button>

              {showPanel && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b bg-[#f8fafc]">
                    <span className="font-bold text-[#1f3a68] text-sm">Notifications</span>
                    {unread > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-[#5B8FCF] hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List */}
                  <div className="max-h-80 overflow-y-auto divide-y">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-400 text-sm">
                        <div className="text-3xl mb-2">🔕</div>
                        No notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`flex gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition ${
                            !n.read ? "bg-blue-50/60" : ""
                          }`}
                          onClick={() => handleNotifClick(n)}
                        >
                          <span className="text-lg flex-shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-1">
                              <p className={`text-xs font-semibold ${!n.read ? "text-[#1f3a68]" : "text-gray-700"}`}>
                                {n.title}
                              </p>
                              {/* ✕ = permanent dismiss, never re-appears */}
                              <button
                                onClick={(e) => handleDismiss(e, n.id)}
                                className="text-gray-300 hover:text-red-400 text-xs flex-shrink-0 ml-1 transition"
                                title="Dismiss permanently"
                              >
                                ✕
                              </button>
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">
                              {new Date(n.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {!n.read && (
                            <span className="w-2 h-2 bg-[#5B8FCF] rounded-full flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer */}
                  {notifications.length > 0 && (
                    <div className="px-4 py-2 border-t bg-[#f8fafc] text-center">
                      <button
                        onClick={handleDismissAll}
                        className="text-xs text-gray-400 hover:text-red-500 hover:underline transition"
                      >
                        Dismiss all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-md bg-[#ff0000] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Log out
            </button>
          ) : (
            <Link
              to="/login"
              className="rounded-md bg-[#5B8FCF] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
