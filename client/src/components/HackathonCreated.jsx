import { Link } from "react-router-dom";
import highfive from "@/assets/highfive.png";

function HackathonCreatedPage() {
  return (<div className="min-h-screen bg-white flex flex-col">
      <div className="flex justify-end p-6">
        <Link to="/organizer-dashboard" className="text-2xl text-gray-700">←</Link>
      </div>
      <main className="flex-1 flex justify-center items-start px-8">
        <div className="bg-[#5B8FCF] rounded-2xl w-full max-w-2xl p-10 text-center text-white shadow-md">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide leading-tight">
            HACKATHON CREATED<br />SUCCESSFULLY
          </h1>
          <img src={highfive} alt="High five" loading="lazy" width={260} height={260} className="mx-auto mt-6 w-56 h-auto" />
          <Link
            to="/organizer-dashboard"
            className="inline-block mt-6 bg-white text-[#1f3a68] font-bold rounded-full px-8 py-2.5 hover:opacity-90"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    </div>);
}


export default HackathonCreatedPage;
