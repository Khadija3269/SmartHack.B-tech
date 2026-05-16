import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import lockCloud from "@/assets/lock-cloud.png";

function RecoverPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Same email rule as Login and Register
    if (!trimmedUsername) return setError("⚠️ Username is required.");
    if (!trimmedEmail) return setError("⚠️ Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return setError("⚠️ Please enter a valid email address.");

    setError("");
    // Send both username and email to server for validation
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, username: trimmedUsername }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code.");
      localStorage.setItem("smarthack_recover_email", trimmedEmail);
      alert("OTP sent successfully! Please check your inbox and Spam folder.");
      navigate("/verify-code");
    } catch (err) {
      setError("⚠️ " + err.message);
    }
  };

  const inputClass =
    "w-full mb-3 px-4 py-3 rounded-full bg-[#1f3a68] text-white placeholder-white/60 outline-none";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="bg-[#5B8FCF] min-h-[calc(100vh-72px)] grid md:grid-cols-2 items-center px-6 py-10 gap-8 relative">
        <button
          onClick={() => navigate("/login")}
          className="absolute right-6 top-6 text-white text-2xl"
        >
          ←
        </button>

        <div className="hidden md:flex justify-center">
          <img
            src={lockCloud}
            alt="Yellow padlock on cloud"
            loading="lazy"
            width={360}
            height={360}
            className="w-72 h-auto"
          />
        </div>

        <form onSubmit={handleSend} className="w-full max-w-md mx-auto">
          <h1 className="text-white text-3xl font-bold text-center mb-8">
            Recover Password
          </h1>
          <input
            className={inputClass}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            className={inputClass}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          {error && (
            <p className="text-red-100 text-sm text-center mb-3">{error}</p>
          )}
          <div className="flex justify-center mt-2">
            <button
              type="submit"
              className="bg-[#cfe0f3] text-[#1f3a68] font-bold rounded-full px-10 py-2.5 hover:opacity-90"
            >
              Send Code
            </button>
          </div>
          <p className="text-white/70 text-xs text-center mt-4">
            Your username is the part before @ in your email, unless you changed it in Settings.
          </p>
        </form>
      </div>
    </div>
  );
}

export default RecoverPasswordPage;
