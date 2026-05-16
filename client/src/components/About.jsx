import { Link } from "react-router-dom";
import { SiteHeader } from "@/components/SiteHeader";
import socialKickoff from "@/assets/social-kickoff.jpg";
import socialJudges from "@/assets/social-judges.jpg";
import socialThanks from "@/assets/social-thanks.jpg";

const announcements = [
  { id: 1, platform: "Instagram", platformColor: "#E1306C", time: "2 hours ago", title: "SmartHack Kickoff!", desc: "Build your teams and submit projects this Friday at Sultan Qaboos University.", link: "View on Instagram", img: socialKickoff },
  { id: 2, platform: "X (Twitter)", platformColor: "#000", time: "Yesterday", title: "Judges Needed!", desc: "Help evaluate projects at the upcoming SmartHack event.", link: "View on X (Twitter)", img: socialJudges },
  { id: 3, platform: "Facebook", platformColor: "#1877F2", time: "2 days ago", title: "Thanks Participants!", desc: "Over 50 innovative projects submitted — congrats to all!", link: "View on Facebook", img: socialThanks },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <SiteHeader active="about" />

      <section className="bg-white max-w-5xl mx-auto px-10 py-8 relative">
        <Link to="/" className="absolute right-6 top-6 text-gray-700 text-2xl">←</Link>
        <h2 className="text-2xl font-bold text-gray-800 mb-3">About</h2>
        <p className="text-gray-700 leading-relaxed mb-3">
          Our goal is to make hackathon management easier by providing a centralized platform for organizers,
          participants, judges, and mentors, while supporting innovation and collaboration in Oman.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Through SmartHack, we aim to provide a simple and efficient system where users can register, form teams,
          submit projects, and evaluate ideas—all in one place. Our platform encourages creativity, teamwork, and fair
          evaluation, helping hackathons reach their full potential.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-10 py-8">
        <h3 className="text-lg font-bold text-gray-800">Social Media · Announcements</h3>
        <p className="text-sm text-gray-500 mb-6">Highlights from our official social media accounts and hackathon updates.</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
              <img src={a.img} alt={a.title} loading="lazy" width={768} height={512} className="w-full h-40 object-cover" />
              <div className="px-4 pt-3 flex justify-between items-center">
                <span className="text-white text-xs px-2 py-0.5 rounded font-semibold" style={{ background: a.platformColor }}>
                  {a.platform}
                </span>
                {a.time && <span className="text-xs text-gray-500">{a.time}</span>}
              </div>
              <div className="px-4 py-3 flex-1 flex flex-col">
                <h4 className="font-bold text-gray-800 mb-1">{a.title}</h4>
                <p className="text-sm text-gray-600 flex-1">{a.desc}</p>
                <a href="#" onClick={(e) => e.preventDefault()} className="mt-3 text-sm font-semibold" style={{ color: a.platformColor }}>
                  {a.link} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}


export default AboutPage;
