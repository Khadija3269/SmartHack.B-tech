import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser, logout, updateProfile, changePassword } from "@/lib/auth";
import { deleteUser } from "@/lib/store";
import { usePreferences } from "@/lib/preferences";
//settings for our system
function SettingsPage() {
  const navigate = useNavigate();
  const { t } = usePreferences();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("Profile");

  useEffect(() => {
    const u = currentUser();
    if (!u) navigate("/login");
    setUser(u);
  }, [navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="settings" />

      <main className="grid md:grid-cols-[260px_1fr] min-h-[calc(100vh-72px)]">
        {/* Sidebar */}
        <aside className="bg-[#5B8FCF] text-white p-6">
          <button
            onClick={() => navigate("/")}
            className="text-2xl mb-4 hover:opacity-80"
            aria-label="Back"
          >
            ←
          </button>
          <h2 className="text-3xl font-bold mb-8">{t("Settings")}</h2>
          <nav className="space-y-1">
            {(["Profile", "Notifications", "System preferences", "Feedback"]).map((tb) => (
              <button
                key={tb}
                onClick={() => setTab(tb)}
                className={`block w-full text-left px-3 py-2 rounded ${tab === tb ? "bg-[#1f3a68] font-semibold" : "hover:bg-white/10"
                  }`}
              >
                {t(tb)}
              </button>
            ))}
          </nav>
          <button
            onClick={() => { logout(); navigate("/"); }}
            className="mt-10 w-full bg-white text-[#1f3a68] font-bold rounded-full py-2 hover:opacity-90"
          >
            {t("Log out")}
          </button>
        </aside>

        {/* Content */}
        <section className="p-8 md:p-10">
          {tab === "Profile" && <ProfileTab user={user} setUser={setUser} navigate={navigate} />}
          {tab === "Notifications" && <NotificationsTab />}
          {tab === "System preferences" && <SystemTab />}
          {tab === "Feedback" && <FeedbackTab />}
        </section>
      </main>
    </div>
  );
}

function ProfileTab({
  user,
  setUser,
  navigate,
}) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user.fullName);
  const [editingEmail, setEditingEmail] = useState(false);
  const [email, setEmail] = useState(user.email);
  const [editingUsername, setEditingUsername] = useState(false);
  const [username, setUsername] = useState(
    user.username || user.email.split("@")[0],
  );
  const [picture, setPicture] = useState(
    localStorage.getItem(`smarthack_avatar_${user.email}`),
  );
  const [msg, setMsg] = useState(null);

  const flash = (m) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2000);
  };

  const persistUser = (next) => {
    // local-only update of the cached session (server is updated separately)
    localStorage.setItem("smarthack_session", JSON.stringify(next));
    setUser(next);
  };

  const saveName = async () => {
    if (!name.trim()) return flash("Name cannot be empty.");
    try {
      const next = await updateProfile(user.email, { name: name.trim() });
      setUser(next);
      setEditingName(false);
      flash("✓ Name updated");
    } catch (e) { flash(e.message); }
  };

  const saveEmail = async () => {
    const newEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) return flash("Invalid email.");
    if (newEmail === user.email) return setEditingEmail(false);
    const avatar = localStorage.getItem(`smarthack_avatar_${user.email}`);
    try {
      const next = await updateProfile(user.email, { email: newEmail });
      if (avatar) {
        localStorage.setItem(`smarthack_avatar_${newEmail}`, avatar);
        localStorage.removeItem(`smarthack_avatar_${user.email}`);
      }
      setUser(next);
      setEditingEmail(false);
      flash("✓ Email updated");
    } catch (e) { flash(e.message); }
  };

  const saveUsername = async () => {
    if (!username.trim()) return flash("Username cannot be empty.");
    try {
      const next = await updateProfile(user.email, { username: username.trim() });
      setUser(next);
      setEditingUsername(false);
      flash("✓ Username updated");
    } catch (e) { flash(e.message); }
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1.5 * 1024 * 1024) return flash("Image must be under 1.5MB.");
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      localStorage.setItem(`smarthack_avatar_${user.email}`, dataUrl);
      setPicture(dataUrl);
      flash("✓ Picture updated");
    };
    reader.readAsDataURL(file);
  };

  const removePicture = () => {
    localStorage.removeItem(`smarthack_avatar_${user.email}`);
    setPicture(null);
    flash("Picture removed");
  };

  const handleDelete = () => {
    if (!confirm("Permanently delete your account? This cannot be undone.")) return;
    deleteUser(user.email);
    localStorage.removeItem("smarthack_session");
    localStorage.removeItem(`smarthack_avatar_${user.email}`);
    navigate("/");
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">Profile Settings</h3>

      {msg && (
        <div className="mb-4 text-sm bg-[#5B8FCF]/10 text-[#1f3a68] border border-[#5B8FCF]/30 rounded px-3 py-2">
          {msg}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-[#cfe0f3] flex items-center justify-center text-3xl overflow-hidden">
          {picture ? (
            <img src={picture} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <span>👤</span>
          )}
        </div>
        <label className="text-sm text-[#5B8FCF] font-semibold hover:underline cursor-pointer">
          upload new picture
          <input type="file" accept="image/*" onChange={onPickFile} className="hidden" />
        </label>
        <button onClick={removePicture} className="text-sm text-red-600 font-semibold hover:underline">
          Remove
        </button>
      </div>

      <div className="divide-y border-y">
        <Row label="Name">
          {editingName ? (
            <div className="flex gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="border px-3 py-1 rounded" />
              <button onClick={saveName} className="bg-[#5B8FCF] text-white px-3 py-1 rounded text-sm">Save</button>
              <button onClick={() => { setName(user.fullName); setEditingName(false); }} className="text-xs text-gray-500 underline">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>{user.fullName}</span>
              <button onClick={() => setEditingName(true)} className="text-xs text-[#5B8FCF] underline">Edit</button>
            </div>
          )}
        </Row>
        <Row label="Email">
          {editingEmail ? (
            <div className="flex gap-2">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className="border px-3 py-1 rounded" />
              <button onClick={saveEmail} className="bg-[#5B8FCF] text-white px-3 py-1 rounded text-sm">Save</button>
              <button onClick={() => { setEmail(user.email); setEditingEmail(false); }} className="text-xs text-gray-500 underline">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>{user.email}</span>
              <button onClick={() => setEditingEmail(true)} className="text-xs text-[#5B8FCF] underline">Edit</button>
            </div>
          )}
        </Row>
        <Row label="Role"><span className="capitalize">{user.role}</span></Row>
      </div>

      <h3 className="text-xl font-bold mt-8 mb-4">Account info</h3>
      <div className="divide-y border-y">
        <Row label="Username">
          {editingUsername ? (
            <div className="flex gap-2">
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="border px-3 py-1 rounded" />
              <button onClick={saveUsername} className="bg-[#5B8FCF] text-white px-3 py-1 rounded text-sm">Save</button>
              <button onClick={() => setEditingUsername(false)} className="text-xs text-gray-500 underline">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>{username}</span>
              <button onClick={() => setEditingUsername(true)} className="text-xs text-[#5B8FCF] underline">Edit</button>
            </div>
          )}
        </Row>
        <Row label="Password">
          <InlineChangePassword userEmail={user.email} flash={flash} />
        </Row>
      </div>

      <div className="flex justify-end mt-6">
        <button onClick={handleDelete} className="bg-red-600 text-white font-semibold rounded px-5 py-2 hover:opacity-90">
          Delete Account
        </button>
      </div>
    </div>
  );
}

function validateStrongPassword(pw) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a symbol.";
  return null;
}

function InlineChangePassword({ userEmail, flash }) {
  const [open, setOpen] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [localErr, setLocalErr] = useState("");

  const reset = () => { setOldPw(""); setNewPw(""); setConfirmPw(""); setLocalErr(""); };

  const handleSave = async () => {
    setLocalErr("");
    if (!oldPw || !newPw || !confirmPw) return setLocalErr("All fields are required.");
    const pwErr = validateStrongPassword(newPw);
    if (pwErr) return setLocalErr(pwErr);
    if (newPw !== confirmPw) return setLocalErr("New passwords do not match.");
    setSaving(true);
    try {
      await changePassword(userEmail, oldPw, newPw);
      reset();
      setOpen(false);
      flash("✓ Password changed successfully");
    } catch (e) {
      setLocalErr(e.message || "Could not change password.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center gap-3">
        <span>••••••••••</span>
        <button onClick={() => setOpen(true)} className="text-xs text-[#5B8FCF] underline">
          Change password
        </button>
      </div>
    );
  }

  const inp = "w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B8FCF]";

  return (
    <div className="space-y-2 w-full max-w-sm">
      <input type="password" placeholder="Current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className={inp} />
      <input type="password" placeholder="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inp} />
      <p className="text-gray-400 text-[10px] -mt-1">Min 8 chars · uppercase · lowercase · number · symbol</p>
      <input type="password" placeholder="Confirm new password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inp} />
      {localErr && <p className="text-red-600 text-xs">{localErr}</p>}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={saving} className="bg-[#5B8FCF] text-white px-4 py-1.5 rounded text-sm font-semibold disabled:opacity-60">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => { setOpen(false); reset(); }} className="text-xs text-gray-500 underline">Cancel</button>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 py-3 text-sm">
      <div className="text-gray-600">{label}</div>
      <div className="font-medium">{children}</div>
    </div>
  );
}

const SYS_KEY = "smarthack_settings_system";

// Import notification helpers inline (avoiding circular import issues with dynamic require)
function getNotifPrefsForUser(email) {
  const DEFAULT = { hackathonCreated: true, newSubmission: true, userRegistered: true, weeklySummary: true, criticalAlerts: true };
  if (!email) return DEFAULT;
  try {
    const saved = JSON.parse(localStorage.getItem(`smarthack_notif_prefs_${email}`) || "null");
    return saved ? { ...DEFAULT, ...saved } : DEFAULT;
  } catch { return DEFAULT; }
}

function saveNotifPrefsForUser(email, prefs) {
  if (!email) return;
  localStorage.setItem(`smarthack_notif_prefs_${email}`, JSON.stringify(prefs));
}

function getInbox(email) {
  try { return JSON.parse(localStorage.getItem(`smarthack_notifications_${email}`) || "[]"); }
  catch { return []; }
}

function addDismissedId(email, id) {
  try {
    const arr = JSON.parse(localStorage.getItem(`smarthack_notif_dismissed_${email}`) || "[]");
    arr.push(id);
    localStorage.setItem(`smarthack_notif_dismissed_${email}`, JSON.stringify(arr.slice(-500)));
  } catch {}
}

function dismissFromInbox(email, id) {
  const inbox = getInbox(email).filter((n) => n.id !== id);
  localStorage.setItem(`smarthack_notifications_${email}`, JSON.stringify(inbox));
  addDismissedId(email, id);
}

function dismissAllFromInbox(email) {
  const inbox = getInbox(email);
  inbox.forEach((n) => addDismissedId(email, n.id));
  localStorage.setItem(`smarthack_notifications_${email}`, JSON.stringify([]));
}

function NotificationsTab() {
  const user = currentUser();
  const email = user?.email;

  const [prefs, setPrefs] = useState(getNotifPrefsForUser(email));
  const [inbox, setInbox] = useState([]);
  const refreshInbox = () => setInbox(email ? getInbox(email) : []);

  useEffect(() => {
    setPrefs(getNotifPrefsForUser(email));
    refreshInbox();
  }, [email]);

  const update = (k, v) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    saveNotifPrefsForUser(email, next);
  };

  const handleDismiss = (id) => {
    if (!email) return;
    dismissFromInbox(email, id);
    refreshInbox();
  };

  const handleDismissAll = () => {
    if (!email) return;
    dismissAllFromInbox(email);
    refreshInbox();
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
    <div>
      <h3 className="text-2xl font-bold mb-2">System Notifications</h3>
      <p className="text-sm text-gray-500 mb-5">Choose which events you want to be notified about. These settings apply only to your account.</p>
      <div className="divide-y border-y mb-8">
        <Toggle label="Hackathon Created" value={prefs.hackathonCreated} onChange={(v) => update("hackathonCreated", v)} />
        <Toggle label="New Submission" value={prefs.newSubmission} onChange={(v) => update("newSubmission", v)} />
        <Toggle label="User Registered" value={prefs.userRegistered} onChange={(v) => update("userRegistered", v)} />
      </div>


      <h3 className="text-2xl font-bold mb-5">Email alerts</h3>
      <div className="divide-y border-y mb-8">
        <Toggle label="Receive Weekly Summary" value={prefs.weeklySummary} onChange={(v) => update("weeklySummary", v)} />
        <Toggle label="Receive Critical Alerts" value={prefs.criticalAlerts} onChange={(v) => update("criticalAlerts", v)} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-2xl font-bold">Recent Notifications</h3>
          <p className="text-xs text-gray-400 mt-0.5">Dismissed notifications will never reappear.</p>
        </div>
        {inbox.length > 0 && (
          <button onClick={handleDismissAll} className="text-xs text-red-500 hover:underline font-medium">
            Dismiss all
          </button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        {inbox.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">
            <div className="text-3xl mb-2">🔕</div>
            No notifications
          </div>
        ) : (
          <ul className="divide-y">
            {inbox.slice(0, 15).map((n) => (
              <li key={n.id} className={`flex gap-3 px-4 py-3 ${!n.read ? "bg-blue-50/60" : ""}`}>
                <span className="text-lg mt-0.5">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1f3a68]">{n.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  {!n.read && <span className="w-2 h-2 bg-[#5B8FCF] rounded-full" />}
                  <button
                    onClick={() => handleDismiss(n.id)}
                    className="text-gray-300 hover:text-red-400 text-xs transition"
                    title="Dismiss permanently"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(!value)}
          className={`relative w-12 h-6 rounded-full transition ${value ? "bg-green-500" : "bg-gray-300"}`}
          aria-pressed={value}
        >
          <span className={`absolute top-0.5 ${value ? "left-6" : "left-0.5"} w-5 h-5 bg-white rounded-full transition-all`} />
        </button>
      </div>
    </div>
  );
}

function SystemTab() {
  const { theme, language, setTheme, setLanguage, t } = usePreferences();

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">{t("System Preferences")}</h3>

      <div className="py-3">
        <div className="font-semibold mb-3">{t("Theme:")}</div>
        <div className="flex gap-4">
          <button
            onClick={() => setTheme("light")}
            className={`px-5 py-2 rounded border-2 ${theme === "light" ? "border-[#5B8FCF] bg-[#5B8FCF]/10" : "border-gray-200"}`}
          >☀️ {t("Light Mode")}</button>
          <button
            onClick={() => setTheme("dark")}
            className={`px-5 py-2 rounded border-2 ${theme === "dark" ? "border-[#5B8FCF] bg-[#5B8FCF]/10" : "border-gray-200"}`}
          >🌙 {t("Dark Mode")}</button>
        </div>
      </div>

      <hr className="my-5" />

      <div className="py-3">
        <label className="font-semibold mr-3">{t("Language:")}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="border px-3 py-1.5 rounded bg-gray-50"
        >
          <option value="English">{t("English")}</option>
          <option value="Arabic">{t("Arabic")}</option>
          <option value="French">{t("French")}</option>
        </select>
      </div>
    </div>
  );
}

function FeedbackTab() {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = () => {
    if (!rating) return alert("Please give a star rating.");
    const all = JSON.parse(localStorage.getItem("smarthack_feedback") || "[]");
    all.push({ rating, text, at: Date.now(), email: currentUser()?.email });
    localStorage.setItem("smarthack_feedback", JSON.stringify(all));
    setDone(true);
    setRating(0);
    setText("");
    setTimeout(() => setDone(false), 3000);
  };

  return (
    <div className="max-w-md">
      <h3 className="text-2xl font-bold text-center">We appreciate your feedback.</h3>
      <p className="text-center text-sm text-gray-600 my-3">
        We are always looking for ways to improve your experience. Please take a moment to evaluate and tell us what you think.
      </p>

      <div className="flex justify-center gap-2 mb-4">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setRating(n)} className="text-3xl" style={{ color: ["#22c55e", "#84cc16", "#eab308", "#f97316", "#ef4444"][n - 1] }}>
            {n <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What can we do to improve your experience?"
        rows={5}
        className="w-full border border-gray-300 rounded p-3 text-sm bg-gray-50"
      />

      <button
        onClick={handleSubmit}
        className="w-full mt-4 bg-[#5B8FCF] text-white font-semibold rounded py-2.5 hover:opacity-90"
      >
        Submit My Feedback
      </button>
      {done && <p className="text-green-600 text-sm text-center mt-3">✓ Thanks for your feedback!</p>}
    </div>
  );
}


export default SettingsPage;
