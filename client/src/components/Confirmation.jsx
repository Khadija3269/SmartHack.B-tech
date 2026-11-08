import { Link } from "react-router-dom";
import winner from "@/assets/winner.png";

function ConfirmationPage() {
  return (<main className="min-h-screen flex items-center justify-center bg-white px-4 relative">
      <Link
        to="/participant-dashboard"
        className="absolute top-6 right-6 text-3xl text-gray-700 hover:text-gray-900"
        aria-label="Back"
      >
        ←
      </Link>

      <div className="w-full max-w-2xl bg-[#5B8FCF] rounded-3xl shadow-xl p-10 text-center">
        <h1 className="text-white text-2xl md:text-3xl font-bold">
          Your project has been successfully submitted!
        </h1>
        <p className="text-white/95 mt-3 text-base">
          Good luck — we can't wait to see your results!
        </p>
        <div className="flex justify-center mt-6">
          <img src={winner} alt="Winner with medal" loading="lazy" width={280} height={280} className="w-64 h-auto" />
        </div>
        <Link
          to="/participant-dashboard"
          className="inline-block mt-6 bg-white text-[#1f3a68] font-bold rounded-full px-8 py-2.5 hover:opacity-90"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>);
}


export default ConfirmationPage;
