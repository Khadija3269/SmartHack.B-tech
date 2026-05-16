import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { dashboardPathFor, login } from "@/lib/auth";
import authSide from "@/assets/auth-side.png";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) return setError("⚠️ Email and password are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) return setError("⚠️ Please enter a valid email address.");
    try {
      const user = await login(trimmedEmail, password);
      navigate(dashboardPathFor(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-full bg-[#1f3a68] text-white placeholder-white/60 outline-none";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <div className="grid md:grid-cols-2 min-h-[calc(100vh-72px)]">
        <div className="hidden md:flex items-center justify-center bg-white p-10">
          <img src={authSide} alt="People with laptops" loading="lazy" width={420} height={420} className="max-w-[420px] w-full h-auto" />
        </div>

        <div className="bg-[#5B8FCF] flex items-center justify-center p-8 md:rounded-l-[40%] relative">
          <Link to="/" className="absolute right-6 top-6 text-white text-2xl">←</Link>
          <form onSubmit={handleSubmit} className="w-full max-w-sm">
            <h1 className="text-4xl font-bold text-white text-center mb-8">Login</h1>

            <label className="block text-white mb-1.5">Email</label>
            <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass + " mb-4"} />

            <label className="block text-white mb-1.5">Password</label>
            <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />

            <div className="text-right mt-2">
              <Link to="/recover-password" className="text-white text-sm underline">Forget Password?</Link>
            </div>

            {error && <p className="text-red-100 text-sm text-center mt-3">⚠️ {error}</p>}

            <div className="flex justify-center mt-6">
              <button type="submit" className="bg-[#cfe0f3] text-[#1f3a68] font-bold rounded-full px-12 py-2.5 hover:opacity-90 text-lg">
                Login
              </button>
            </div>

            <div className="text-white text-sm text-center mt-6">
              Already have an account?{" "}
              <Link to="/register" className="underline font-semibold">Register now</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


export default LoginPage;
