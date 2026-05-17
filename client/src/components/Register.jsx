import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { saveUser } from "@/lib/auth";
import authSide from "@/assets/auth-side.png";

const PRO_ROLES = ["judge", "mentor", "organizer", "admin"];

function validateStrongPassword(pw) {
  if (!pw || pw.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include a symbol.";
  return null;
}
function suggestStrongPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%&*?";
  const all = upper + lower + nums + syms;
  const pick = (s) => s[Math.floor(Math.random() * s.length)];
  let pw = [pick(upper), pick(lower), pick(nums), pick(syms)];
  for (let i = 0; i < 8; i++) pw.push(pick(all));
  return pw.sort(() => Math.random() - 0.5).join("");
}

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("participant");
  const [organization, setOrganization] = useState("SQU");
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [reason, setReason] = useState("");
  const [cvName, setCvName] = useState("");
  const [cvData, setCvData] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPro = PRO_ROLES.includes(role);

  const handleCv = (file) => {
    if (!file) { setCvName(""); setCvData(""); return; }
    if (file.size > 5 * 1024 * 1024) { setError("CV must be under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { setCvName(file.name); setCvData(String(reader.result || "")); };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim() || !email.trim() || !password)
      return setError("Please fill in all required fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("⚠️ Please enter a valid email address.");
    const pwErr = validateStrongPassword(password);
    if (pwErr) return setError(pwErr);
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    if (isPro) {
      if (!bio.trim() || !experience.trim() || !reason.trim())
        return setError("Please fill in your bio, experience and reason.");
      if (!cvData) return setError("Please upload your CV (PDF / DOC).");
    }

    setSubmitting(true);
    try {
      await saveUser({
        fullName, email, password, role, organization,
        bio: isPro ? bio : "", experience: isPro ? experience : "",
        reason: isPro ? reason : "", cvName: isPro ? cvName : "",
        cvData: isPro ? cvData : "",
      });
      if (isPro) {
        const reviewer = role === "admin" ? "an existing admin" : "an admin";
        alert(`Application submitted! Your account will be reviewed by ${reviewer} before you can sign in.`);
      }
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };
  
  const inputClass =
    "w-full px-4 py-2.5 rounded-full bg-[#1f3a68] text-white outline-none";
  const textareaClass =
    "w-full px-4 py-2.5 rounded-2xl bg-[#1f3a68] text-white outline-none";
  const labelClass = "block text-white mb-1.5 text-sm";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="grid md:grid-cols-2 min-h-[calc(100vh-72px)]">
        <div className="hidden md:flex items-center justify-center bg-white p-10">
          <img src={authSide} alt="People with laptops" loading="lazy" width={420} height={420} className="max-w-[420px] w-full h-auto" />
        </div>

        <div className="bg-[#5B8FCF] flex items-center justify-center p-8 md:rounded-l-[40%] relative">
          <Link to="/" className="absolute right-6 top-6 text-white text-2xl">←</Link>

          <form onSubmit={handleSubmit} className="w-full max-w-md py-6">
            <h1 className="text-3xl font-bold text-white text-center mb-6">Registration</h1>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Full Name</label>
                <input className={inputClass} value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelClass + " mb-0"}>Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const sp = suggestStrongPassword();
                      setPassword(sp);
                      setConfirmPassword(sp);
                    }}
                    className="text-white/90 text-[11px] underline"
                  >
                    Suggest
                  </button>
                </div>
                <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
                <p className="text-white/70 text-[10px] mt-1">Min 8 chars, with upper, lower, number & symbol.</p>
              </div>
              <div>
                <label className={labelClass}>Confirm Password</label>
                <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Role</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                  <option value="participant">Participant</option>
                  <option value="judge">Judge</option>
                  <option value="organizer">Organizer</option>
                  <option value="mentor">Mentor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Organization</label>
                <select value={organization} onChange={(e) => setOrganization(e.target.value)} className={inputClass}>
                  <option value="SQU">Sultan Qaboos University</option>
                  <option value="GUtech">GUtech</option>
                  <option value="UTAS">UTAS</option>
                  <option value="MiddleEastCollege">Middle East College</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {isPro && (
              <div className="mt-4 space-y-3 bg-[#1f3a68]/30 rounded-2xl p-4">
                <p className="text-white text-sm font-semibold">
                  As a {role}, please tell us about yourself.
                  {role === "admin"
                    ? " Your request will be reviewed by an existing admin before you can access the platform."
                    : " Your account will be reviewed by an admin."}
                </p>
                <div>
                  <label className={labelClass}>Short Bio</label>
                  <textarea rows={2} className={textareaClass} value={bio} onChange={(e) => setBio(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Experience</label>
                  <textarea rows={3} className={textareaClass} value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="Past hackathons, relevant work, expertise…" />
                </div>
                <div>
                  <label className={labelClass}>
                    {role === "admin"
                      ? "Why do you want to become an admin?"
                      : `Why do you want to join as a ${role}?`}
                  </label>
                  <textarea rows={2} className={textareaClass} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Upload CV (PDF / DOC, max 5 MB)</label>
                  <input type="file" accept=".pdf,.doc,.docx,application/pdf"
                    onChange={(e) => handleCv(e.target.files?.[0])}
                    className="block w-full text-white text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-[#cfe0f3] file:text-[#1f3a68] file:font-semibold" />
                  {cvName && <p className="text-white text-xs mt-1">✓ {cvName}</p>}
                </div>
              </div>
            )}

            {error && <p className="text-red-100 text-sm text-center mt-3">⚠️ {error}</p>}

            <div className="flex justify-center mt-6">
              <button type="submit" disabled={submitting} className="bg-[#cfe0f3] text-[#1f3a68] font-bold rounded-full px-12 py-2.5 hover:opacity-90 text-lg disabled:opacity-60">
                {submitting ? "Submitting…" : "Register"}
              </button>
            </div>

            <div className="text-white text-sm text-center mt-4">
              Already have an account?{" "}
              <Link to="/login" className="underline font-semibold">Log In</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
