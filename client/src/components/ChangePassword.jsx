import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import lockCloud from "@/assets/lock-cloud.png";
import { currentUser, changePassword, resetPassword } from "@/lib/auth";

function ChangePasswordPage() {
  const navigate = useNavigate();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = async (e) => {
    e.preventDefault();
    const isResetFlow = !!localStorage.getItem("smarthack_reset_code");

    if (!newPassword || !confirmPassword || (!isResetFlow && !oldPassword)) {
      return setError("⚠️ All required fields must be filled.");
    }
    if (newPassword.length < 6) return setError("⚠️ New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setError("⚠️ Passwords do not match.");

    try {
      if (isResetFlow) {
        const email = localStorage.getItem("smarthack_recover_email");
        const code = localStorage.getItem("smarthack_reset_code");
        await resetPassword(email, newPassword, code);
        localStorage.removeItem("smarthack_recover_email");
        localStorage.removeItem("smarthack_reset_code");
        alert("Password reset successfully! Please log in.");
        navigate("/login");
      } else {
        const me = currentUser();
        if (!me) return setError("⚠️ You must be logged in.");
        await changePassword(me.email, oldPassword, newPassword);
        alert("Password changed successfully!");
        navigate("/settings");
      }
    } catch (err) {
      setError("⚠️ " + (err.message || "Could not update password."));
    }
  };

  const isResetFlow = !!localStorage.getItem("smarthack_reset_code");

  const inputClass = "w-full mb-3 px-4 py-3 rounded-full bg-[#1f3a68] text-white placeholder-white/60 outline-none";

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="settings" />
      <div className="bg-[#5B8FCF] min-h-[calc(100vh-72px)] grid md:grid-cols-2 items-center px-6 py-10 gap-8 relative">
        <button onClick={() => navigate("/settings")} className="absolute right-6 top-6 text-white text-2xl">←</button>

        <div className="hidden md:flex justify-center">
          <img src={lockCloud} alt="Yellow padlock on cloud" loading="lazy" width={360} height={360} className="w-72 h-auto" />
        </div>

        <form onSubmit={handleConfirm} className="w-full max-w-md mx-auto">
          <h1 className="text-white text-3xl font-bold text-center mb-8">
            {isResetFlow ? "Set New Password" : "Change Password"}
          </h1>
          {!isResetFlow && (
            <input type="password" className={inputClass} placeholder="Old Password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
          )}
          <input type="password" className={inputClass} placeholder="New Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <input type="password" className={inputClass} placeholder="Confirm Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          {error && <p className="text-red-100 text-sm text-center mb-3">{error}</p>}
          <div className="flex justify-center mt-2">
            <button type="submit" className="bg-[#cfe0f3] text-[#1f3a68] font-bold rounded-full px-10 py-2.5 hover:opacity-90">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}


export default ChangePasswordPage;
