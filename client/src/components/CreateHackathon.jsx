import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { createHackathon, getCategories, myCategories, refreshCategories, refreshUsers } from "@/lib/store";
import { currentUser } from "@/lib/auth";

function CreateHackathonPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [location, setLocation] = useState("Sultan Qaboos University");
  const [duration, setDuration] = useState("48 Hours");
  const [teamSize, setTeamSize] = useState("2–5 members");
  const [rewards, setRewards] = useState("Certificates and prizes for the top teams.");
  const [description, setDescription] = useState("");
  const me = currentUser();
  const [allowed, setAllowed] = useState(myCategories());
  const [category, setCategory] = useState(allowed[0] || "");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [timeline, setTimeline] = useState([{ label: "", date: "" }]);
  const [error, setError] = useState("");

  useEffect(() => {
    // Pull the latest category assignment (an admin may have changed it).
    Promise.all([refreshUsers(), refreshCategories()]).finally(() => {
      const cats = myCategories();
      setAllowed(cats);
      setCategory((cur) => (cats.includes(cur) ? cur : cats[0] || ""));
    });
  }, []);

  const updateTimelineRow = (i, field, value) => {
    setTimeline((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };
  const addTimelineRow = () => setTimeline((rows) => [...rows, { label: "", date: "" }]);
  const removeTimelineRow = (i) => setTimeline((rows) => rows.filter((_, idx) => idx !== i));

  const handleCreate = (e) => {
    e.preventDefault();
    if (!category || !allowed.includes(category)) {
      setError("⚠️ You can only create hackathons in your assigned categories.");
      return;
    }
    if (!name.trim() || !startDate || !endDate || !description.trim()) {
      setError("⚠️ Name, dates, and description are required.");
      return;
    }
    setError("");
    createHackathon({
      title: name.trim(),
      theme: theme.trim() || category,
      startDate,
      endDate,
      location,
      duration,
      teamSize,
      rewards,
      description: description.trim(),
      category,
      submissionDeadline,
      timeline: timeline.filter((r) => r.label.trim() || r.date),
    });
    navigate("/hackathon-created");
  };

  const inputClass = "w-full p-2.5 rounded-md border border-gray-300 bg-gray-50 text-sm";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />
      <header className="bg-[#5B8FCF] py-4 px-6">
        <h1 className="text-xl font-bold text-[#1f3a68]">Create Hackathon</h1>
      </header>
      <main className="max-w-3xl mx-auto p-8">
        <form onSubmit={handleCreate} className="rounded-xl border bg-white p-8 shadow-sm space-y-5">
          <div>
            <label className="block font-bold text-sm mb-2">Hackathon Name</label>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-bold text-sm mb-2">Theme</label>
              <input className={inputClass} value={theme} onChange={(e) => setTheme(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold text-sm mb-2">Category</label>
              <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                {allowed.length === 0 && <option value="">No category assigned</option>}
                {getCategories().filter((c) => allowed.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {me?.role === "organizer" && (
                <p className="text-xs text-gray-500 mt-1">
                  {allowed.length ? "Limited to the categories you were assigned." : "Ask an admin to assign you a category first."}
                </p>
              )}
              {me?.role === "admin" && (
                <p className="text-xs text-gray-500 mt-1">
                  Need a new one? <Link to="/manage-categories" className="text-[#5B8FCF] font-semibold underline">Add a category</Link>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-bold text-sm mb-2">Start Date</label>
              <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold text-sm mb-2">End Date</label>
              <input type="date" className={inputClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-bold text-sm mb-2">Location</label>
              <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold text-sm mb-2">Duration</label>
              <input className={inputClass} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label className="block font-bold text-sm mb-2">Team Size</label>
              <input className={inputClass} value={teamSize} onChange={(e) => setTeamSize(e.target.value)} />
            </div>
            <div>
              <label className="block font-bold text-sm mb-2">Rewards</label>
              <input className={inputClass} value={rewards} onChange={(e) => setRewards(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block font-bold text-sm mb-2">Description</label>
            <textarea className={inputClass} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div>
            <label className="block font-bold text-sm mb-2">Submission Deadline</label>
            <input
              type="date"
              className={inputClass}
              value={submissionDeadline}
              onChange={(e) => setSubmissionDeadline(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">When participants must submit their project by.</p>
          </div>

          <div>
            <label className="block font-bold text-sm mb-2">Event Timeline</label>
            <div className="space-y-2">
              {timeline.map((row, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    className={inputClass}
                    placeholder="Milestone (e.g. Opening Ceremony)"
                    value={row.label}
                    onChange={(e) => updateTimelineRow(i, "label", e.target.value)}
                  />
                  <input
                    type="datetime-local"
                    className={inputClass}
                    value={row.date}
                    onChange={(e) => updateTimelineRow(i, "date", e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeTimelineRow(i)}
                    className="text-red-500 font-bold px-2"
                    title="Remove milestone"
                  >×</button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addTimelineRow}
              className="mt-2 text-sm font-semibold text-[#5B8FCF] hover:underline"
            >+ Add milestone</button>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <div className="flex justify-end">
            <button type="submit" className="bg-[#5B8FCF] text-white font-semibold px-7 py-2.5 rounded-md hover:opacity-90">
              Create
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}


export default CreateHackathonPage;
