import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { createHackathon } from "@/lib/store";

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
  const [category, setCategory] = useState("Mobile");
  const [error, setError] = useState("");

  const handleCreate = (e) => {
    e.preventDefault();
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
                <option>Mobile</option><option>Web</option><option>AI</option>
                <option>Data Science</option><option>Cybersecurity</option><option>Game Development</option>
              </select>
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
