import { useState } from "react";

// There is no API-free way to auto-post to these platforms — Twitter/X,
// Facebook, and Instagram all require the organizer to authorize an app
// via that platform's own OAuth flow (and, for Instagram, a Business
// account plus Meta app review) before anything could post automatically.
// What these buttons do instead — and what virtually every "Share on X"
// button on the web actually does — is open a pre-filled post for the
// organizer to review and confirm themselves:
//   - X (Twitter): opens their official web intent with the text/link filled in.
//   - Facebook: opens their official sharer with the link (and a suggested quote).
//   - Instagram: has no web posting intent at all (true for every site, not
//     just this one), so we copy a ready-made caption and open Instagram
//     for the organizer to paste it into a new post themselves.
export function ShareButtons({ text, url }) {
  const [copied, setCopied] = useState(false);

  const shareX = () => {
    const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareFacebook = () => {
    const href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const shareInstagram = async () => {
    const caption = `${text}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // clipboard API unavailable (e.g. insecure context) — still open Instagram
    }
    window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={shareX}
        className="text-xs font-semibold bg-black text-white rounded-full px-3 py-1 hover:opacity-90"
        title="Opens a pre-filled post on X for you to review and send"
      >
        𝕏 Share
      </button>
      <button
        onClick={shareFacebook}
        className="text-xs font-semibold bg-[#1877F2] text-white rounded-full px-3 py-1 hover:opacity-90"
        title="Opens Facebook's share dialog for you to review and post"
      >
        f Share
      </button>
      <button
        onClick={shareInstagram}
        className="text-xs font-semibold bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white rounded-full px-3 py-1 hover:opacity-90"
        title="Copies a caption and opens Instagram — paste it into a new post"
      >
        📸 {copied ? "Caption copied!" : "Share"}
      </button>
    </div>
  );
}
