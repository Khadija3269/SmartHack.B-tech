import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { currentUser } from "@/lib/auth";
import { getHackathon, myJoinedHackathons, submitProject, updateSubmission, mySubmissions } from "@/lib/store";

function SubmitProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const search = Object.fromEntries([...searchParams]);

  const [available, setAvailable] = useState([]);
  const [hackathonId, setHackathonId] = useState(search.hackathonId || "");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [members, setMembers] = useState("");
  const [category, setCategory] = useState("AI");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");          // ← was missing
  const [error, setError] = useState("");              // ← was missing
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingSubmissionId, setExistingSubmissionId] = useState(null);
  const [deadlinePassed, setDeadlinePassed] = useState(false);

  useEffect(() => {
    const me = currentUser();
    if (!me) {
      navigate("/login");
      return;
    }
    const joined = myJoinedHackathons();
    setAvailable(joined);
    if (!hackathonId && joined[0]) setHackathonId(joined[0].id);
  }, [navigate]);

  useEffect(() => {
    if (!hackathonId) {
      setAlreadySubmitted(false);
      setExistingSubmissionId(null);
      setDeadlinePassed(false);
      return;
    }

    const subs = mySubmissions();
    const existing = subs.find(s => s.hackathonId === hackathonId);
    if (existing) {
      setAlreadySubmitted(true);
      setExistingSubmissionId(existing.id);
      setTitle(existing.projectTitle || "");
      setDesc(existing.description || "");
      setMembers(existing.teamMembers || "");
      setCategory(existing.category || "AI");
      setFileName(existing.fileName || "");
      setFileUrl(existing.fileUrl || "");
    } else {
      setAlreadySubmitted(false);
      setExistingSubmissionId(null);
      setTitle("");
      setDesc("");
      setMembers("");
      setCategory("AI");
      setFileName("");
      setFileUrl("");
    }

    const hack = available.find(h => h.id === hackathonId);
    if (hack?.endDate) {
      setDeadlinePassed(Date.now() > new Date(hack.endDate).getTime());
    } else {
      setDeadlinePassed(false);
    }
  }, [hackathonId, available]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!hackathonId)
      return setError("⚠️ Please select a hackathon (you must join one first).");
    if (!title.trim() || !desc.trim())
      return setError("⚠️ Title and description are required.");

    setError("");

    const payload = {
      hackathonId,
      projectTitle: title.trim(),
      description: desc.trim(),
      teamMembers: members.trim(),
      category,
      fileName,
      fileUrl,
    };

    if (alreadySubmitted && existingSubmissionId) {
      updateSubmission(existingSubmissionId, payload);
    } else {
      submitProject(payload);
    }

    navigate("/confirmation");
  };

  const inputClass = "w-full p-2.5 rounded-md border border-gray-300 bg-gray-50 text-sm";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="dashboard" />

      <header className="bg-[#5B8FCF] py-6 text-center">
        <h1 className="text-2xl font-bold text-[#1f3a68]">Submit your Project</h1>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        {available.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg font-semibold mb-2">You haven't joined any hackathon yet.</p>
            <p className="text-sm">Browse hackathons and join one before submitting a project.</p>
            <button
              onClick={() => navigate("/hackathons")}
              className="mt-5 bg-[#5B8FCF] text-white font-semibold px-6 py-2 rounded hover:opacity-90"
            >
              Browse Hackathons
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-8">
            {/* LEFT SIDE */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Select Hackathon</label>
                <select
                  className={inputClass}
                  value={hackathonId}
                  onChange={(e) => setHackathonId(e.target.value)}
                >
                  {available.map(h => (
                    <option key={h.id} value={h.id}>{h.title}</option>
                  ))}
                </select>
              </div>

              <input
                className={inputClass}
                placeholder="Project Name *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={deadlinePassed}
              />

              <textarea
                className={inputClass}
                rows={4}
                placeholder="Description *"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={deadlinePassed}
              />

              <input
                className={inputClass}
                placeholder="Team Members"
                value={members}
                onChange={(e) => setMembers(e.target.value)}
                disabled={deadlinePassed}
              />

              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <select
                  className={inputClass}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={deadlinePassed}
                >
                  <option>AI</option>
                  <option>Web</option>
                  <option>Mobile</option>
                  <option>Data Science</option>
                  <option>Cybersecurity</option>
                  <option>Game Development</option>
                </select>
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div>
              <label className="block font-semibold text-sm mb-2">Upload file</label>
              <input
                type="file"
                className="border p-2 w-full rounded"
                disabled={deadlinePassed}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setFileName(file.name);
                  setFileUrl(URL.createObjectURL(file));
                }}
              />
              {fileName && (
                <p className="text-sm mt-2 text-gray-600">Selected: {fileName}</p>
              )}

              {error && (
                <p className="text-red-500 text-sm mt-3">{error}</p>
              )}

              {alreadySubmitted && !deadlinePassed && (
                <p className="text-blue-600 font-semibold text-sm mt-3 bg-blue-100 p-3 rounded border border-blue-300">
                  You have already submitted a project. You can update it until the deadline.
                </p>
              )}

              {alreadySubmitted && deadlinePassed && (
                <p className="text-red-600 font-semibold text-sm mt-3 bg-red-100 p-3 rounded border border-red-300">
                  The deadline for this hackathon has passed. You can no longer edit your submission.
                </p>
              )}

              {!deadlinePassed && (
                <button
                  type="submit"
                  className="mt-5 px-6 py-2 rounded text-white bg-[#5B8FCF] hover:opacity-90 font-semibold"
                >
                  {alreadySubmitted ? "Update Project" : "Submit"}
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

export default SubmitProjectPage;
