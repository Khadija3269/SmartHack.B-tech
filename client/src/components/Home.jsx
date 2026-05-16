import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import heroLightbulb from "@/assets/hero-lightbulb.png";

function HomePage() {
  return (<div className="min-h-screen bg-white">
      <SiteHeader active="home" />

      <section className="bg-[#9CB8DC]">
        <div className="container mx-auto px-6 py-12 grid md:grid-cols-2 gap-8 items-center">
          <div className="max-w-md">
            <div className="h-px w-full bg-gray-800/40 mb-5" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
              Manage Hackathons<br />With Ease
            </h1>
            <p className="mt-5 text-gray-800 leading-relaxed">
              Explore hackathons, build teams, submit solutions, and compete with innovators — all in one place.
            </p>
            <div className="mt-7 flex gap-3">
              <Link to="/login" className="rounded-full bg-white px-6 py-2.5 text-gray-800 font-semibold shadow hover:opacity-90">
                Admin Login
              </Link>
              <Link to="/register" className="rounded-full border border-gray-900 px-6 py-2.5 text-gray-900 font-semibold hover:bg-white/30">
                Register
              </Link>
            </div>
            <p className="mt-3 text-sm text-gray-800">
              Already have an account?{" "}
              <Link to="/login" className="underline font-medium">Log in</Link>
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src={heroLightbulb}
              alt="Team collaborating inside a giant lightbulb"
              width={420}
              height={420}
              className="max-w-[420px] w-full h-auto"
            />
          </div>
        </div>
      </section>
    </div>);
}


export default HomePage;
