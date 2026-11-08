import { Link } from "react-router-dom";
import { adHasLink, getHackathon, isAdLive, promotableHackathons } from "@/lib/store";

// Reader-facing card for an announcement. When the announcement carries a link
// (to another HackHub hackathon or an external page) it is styled as an ad with
// a call-to-action button; plain announcements keep the simple green look.
export function AdCard({ ad }) {
  if (!adHasLink(ad)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-md px-3 py-2">
        <div className="font-semibold">{ad.title}</div>
        <div>{ad.message}</div>
      </div>
    );
  }

  const target = ad.linkedHackathonId ? getHackathon(ad.linkedHackathonId) : null;
  const label = ad.linkLabel || (target ? "View hackathon" : "Learn more");
  const ctaClass = "inline-block bg-[#1f3a68] text-white text-sm font-semibold px-4 py-1.5 rounded-full hover:opacity-90";

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="bg-amber-400 text-amber-950 text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5">Ad</span>
        <span className="font-semibold">{ad.title}</span>
      </div>
      <div className="mb-2">{ad.message}</div>
      {target && (
        <div className="text-xs text-gray-700 mb-2">
          {target.category ? `${target.category} • ` : ""}{target.title} • {target.startDate} → {target.endDate}
        </div>
      )}
      {target ? (
        <Link to={`/hackathon-details/${target.id}`} className={ctaClass}>{label} →</Link>
      ) : /^https?:\/\//i.test(ad.linkUrl || "") ? (
        // Only ever render http(s) links (the server enforces this too).
        <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer nofollow" className={ctaClass}>{label} ↗</a>
      ) : null}
    </div>
  );
}

// Compact preview used in the organizer's list so they can see what an ad points at.
export function AdLinkSummary({ ad }) {
  if (!adHasLink(ad)) return null;
  const target = ad.linkedHackathonId ? getHackathon(ad.linkedHackathonId) : null;
  const stale = !isAdLive(ad);
  return (
    <div className="text-[11px] mt-0.5">
      <span className="bg-amber-400 text-amber-950 font-bold uppercase rounded px-1 py-px mr-1">Ad</span>
      {ad.linkedHackathonId ? (
        stale ? (
          <span className="text-gray-500 italic">links to a hackathon that is archived — hidden from readers</span>
        ) : (
          <span>→ {target?.title || "hackathon"}</span>
        )
      ) : (
        <span className="break-all">→ {ad.linkUrl}</span>
      )}
      {ad.linkLabel && <span className="text-gray-600"> · button: “{ad.linkLabel}”</span>}
    </div>
  );
}

// Form fields for the optional link. `value` is
// { mode: "none" | "hackathon" | "url", linkedHackathonId, linkUrl, linkLabel }.
export const EMPTY_AD_LINK = { mode: "none", linkedHackathonId: "", linkUrl: "", linkLabel: "" };

// Returns an error message if the chosen link mode is missing its target, else "".
export function adLinkError(v) {
  if (v?.mode === "hackathon" && !v.linkedHackathonId) return "Choose the hackathon you want to promote (or switch to “No link”).";
  if (v?.mode === "url" && !(v.linkUrl || "").trim()) return "Enter the link for your ad (or switch to “No link”).";
  return "";
}

export function AdLinkFields({ value, onChange, excludeId, size = "sm" }) {
  const v = value || EMPTY_AD_LINK;
  const cls = `border rounded px-2 py-1 ${size === "xs" ? "text-xs" : "text-sm"} w-full`;
  const setMode = (mode) => onChange({ mode, linkedHackathonId: "", linkUrl: "", linkLabel: mode === "none" ? "" : v.linkLabel });
  const options = promotableHackathons(excludeId);

  return (
    <div className="border border-dashed border-amber-400 rounded-md p-2 space-y-1.5 bg-amber-50/50">
      <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
        <span>Turn this into an ad (optional):</span>
        {[["none", "No link"], ["hackathon", "Another hackathon"], ["url", "External link"]].map(([k, label]) => (
          <label key={k} className="inline-flex items-center gap-1 font-normal">
            <input type="radio" checked={v.mode === k} onChange={() => setMode(k)} /> {label}
          </label>
        ))}
      </div>
      {v.mode === "hackathon" && (
        <select className={cls} value={v.linkedHackathonId}
          onChange={(e) => onChange({ ...v, linkedHackathonId: e.target.value, linkUrl: "" })}>
          <option value="">— choose a hackathon to promote —</option>
          {options.map((h) => <option key={h.id} value={h.id}>{h.title}{h.category ? ` (${h.category})` : ""}</option>)}
        </select>
      )}
      {v.mode === "url" && (
        <input className={cls} placeholder="https://example.com/other-hackathon" value={v.linkUrl}
          onChange={(e) => onChange({ ...v, linkUrl: e.target.value, linkedHackathonId: "" })} />
      )}
      {v.mode !== "none" && (
        <input className={cls} placeholder="Button text (optional, e.g. Register now)" maxLength={40} value={v.linkLabel}
          onChange={(e) => onChange({ ...v, linkLabel: e.target.value })} />
      )}
    </div>
  );
}
