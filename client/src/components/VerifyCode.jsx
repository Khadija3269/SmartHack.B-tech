import { useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import lockCloud from "@/assets/lock-cloud.png";

const DEMO_CODE = "12345";

function VerifyCodePage() {
  const navigate = useNavigate();

  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(""); // ✅ NEW

  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const next = [...code];
    next[index] = value.slice(-1);
    setCode(next);
    setError("");
    setMessage("");

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSend = async () => {
    if (code.some((d) => d === "")) {
      return setError("⚠️ Please enter the full 6-digit code.");
    }

    const email = localStorage.getItem("smarthack_recover_email");
    if (!email) return setError("⚠️ Missing email. Go back.");

    const codeStr = code.join("");
    try {
      const res = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: codeStr })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      
      localStorage.setItem("smarthack_reset_code", codeStr);
      navigate("/change-password");
    } catch (err) {
      setError("⚠️ " + err.message);
    }
  };

  const [resending, setResending] = useState(false);
  const handleResend = async () => {
    const email = localStorage.getItem("smarthack_recover_email");
    if (!email) return setError("⚠️ Missing email. Go back.");
    setResending(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resend code.");
      setCode(["", "", "", "", "", ""]);
      setMessage("✅ A new code has been sent to your email.");
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError("⚠️ " + err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <div className="bg-[#5B8FCF] min-h-[calc(100vh-72px)] grid md:grid-cols-2 items-center px-6 py-10 gap-8 relative">

        {/* BACK */}
        <button
          onClick={() => navigate("/recover-password")}
          className="absolute right-6 top-6 text-white text-2xl"
        >
          ←
        </button>

        {/* IMAGE */}
        <div className="hidden md:flex justify-center">
          <img src={lockCloud} alt="lock" className="w-72 h-auto" />
        </div>

        {/* FORM */}
        <div className="w-full max-w-md mx-auto">
          <h1 className="text-white text-3xl font-bold text-center mb-8">
            Verify Code
          </h1>

          {/* INPUTS */}
          <div className="flex justify-center gap-2.5 mb-4">
            {code.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-14 h-14 bg-[#1f3a68] text-white text-2xl font-bold text-center rounded-lg outline-none"
              />
            ))}
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-100 text-sm text-center mb-2">
              {error}
            </p>
          )}

          {/* SUCCESS MESSAGE */}
          {message && (
            <p className="text-green-200 text-sm text-center mb-2">
              {message}
            </p>
          )}

          {/* RESEND */}
          <div className="text-center mb-4">
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-white underline font-semibold text-sm disabled:opacity-60"
            >
              {resending ? "Resending…" : "Resend Code"}
            </button>
          </div>

          {/* SUBMIT */}
          <div className="flex justify-center">
            <button
              onClick={handleSend}
              className="bg-[#cfe0f3] text-[#1f3a68] font-bold rounded-full px-12 py-2.5 hover:opacity-90"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyCodePage;
