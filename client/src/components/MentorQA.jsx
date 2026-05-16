import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { currentUser } from "@/lib/auth";
import { notifyDirect } from "@/lib/notifications";
import {
  answerQuestion,
  askQuestion,
  getQuestions,
  isJoined,
  mentorForHackathon,
  refreshQuestions,
} from "@/lib/store";
import { api } from "@/lib/api";

async function fetchAIAnswer(question, hackathonTitle, hackathonTheme) {
  const system = `You are SmartHack AI, a friendly and knowledgeable hackathon mentor. Answer the participant's question directly and helpfully. Give practical, specific advice. Use bullet points when listing steps or options. Be encouraging but concise (aim for 3-6 sentences or bullet points).

Hackathon: "${hackathonTitle || "this hackathon"}"
Theme: "${hackathonTheme || "general"}"`;

  try {
    const res = await fetch("/anthropic/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: question }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.content?.map((b) => b.text || "").join("").trim();
      if (text) return text;
    }
  } catch {}

  // Fallback to Express /api/ask-ai
  const data = await api.post("/api/ask-ai", {
    question,
    hackathonTitle,
    hackathonTheme,
  });
  return data?.answer || "Sorry, I couldn't generate an answer right now.";
}

export function MentorQA({ hackathon }) {
  const user = currentUser();
  const isMentor =
    user?.role === "mentor" &&
    mentorForHackathon(hackathon.id) === user?.email?.toLowerCase();
  const canAsk =
    user &&
    user.role === "participant" &&
    isJoined(hackathon.id);

  const [questions, setQuestions] = useState([]);
  const [draft, setDraft] = useState("");
  const [mentorDraft, setMentorDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState({});
  const [aiLoadingId, setAiLoadingId] = useState(null);
  const [aiError, setAiError] = useState("");

  const refresh = () => {
    setQuestions(getQuestions(hackathon.id));
  };

  useEffect(() => {
    refreshQuestions().finally(refresh);
  }, [hackathon.id]);

  const handleAsk = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const assignedMentorEmail = mentorForHackathon(hackathon.id);
      askQuestion(hackathon.id, draft.trim());
      if (assignedMentorEmail) {
        notifyDirect(
          assignedMentorEmail,
          "New Question from Participant ❓",
          `${user?.fullName || user?.email || "A participant"} asked a question in "${hackathon.title}".`,
          `/hackathon-details/${hackathon.id}`,
          "question"
        );
      }
      setDraft("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to post question.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnswer = (qid) => {
    const text = (answerDrafts[qid] || "").trim();
    if (!text) return;
    answerQuestion(qid, text, "mentor");
    setAnswerDrafts((p) => ({ ...p, [qid]: "" }));
    refresh();
  };

  // Mentor posts an unprompted message (no existing question needed)
  const handleMentorPost = async () => {
    const text = mentorDraft.trim();
    if (!text || !user) return;
    setSubmitting(true);
    try {
      await api.post("/api/questions", {
        hackathonId: hackathon.id,
        answer: text,
        answererEmail: user.email,
        answererName: user.fullName || user.name,
        answererRole: "mentor",
      });
      await refreshQuestions();
      setMentorDraft("");
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to post message.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAi = async (q) => {
    setAiLoadingId(q.id);
    setAiError("");
    try {
      const answer = await fetchAIAnswer(q.question, hackathon.title, hackathon.theme);
      answerQuestion(q.id, answer, "ai", { email: "ai@smarthack", name: "SmartHack AI" });
      refresh();
    } catch (e) {
      setAiError(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setAiLoadingId(null);
    }
  };

  return (
    <div className="rounded-xl border bg-white shadow-sm p-5 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-[#1f3a68]">💬 Mentor Q&A</h2>
        <span className="text-xs text-gray-500">
          {questions.filter((q) => q.type !== "mentor_message").length}{" "}
          {questions.filter((q) => q.type !== "mentor_message").length === 1 ? "question" : "questions"}
        </span>
      </div>

      {/* Participant question box */}
      {canAsk && (
        <div className="bg-[#cfe0f3]/40 rounded-md p-3 mb-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Ask the mentor anything about this hackathon…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm bg-white"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{draft.length}/500</span>
            <button
              onClick={handleAsk}
              disabled={submitting || !draft.trim()}
              className="bg-[#5B8FCF] text-white text-sm font-semibold rounded-md px-4 py-1.5 disabled:opacity-50"
            >
              Post question
            </button>
          </div>
        </div>
      )}

      {/* Mentor broadcast message box */}
      {isMentor && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
          <p className="text-xs font-semibold text-yellow-700 mb-1">📢 Post a message to all participants</p>
          <textarea
            value={mentorDraft}
            onChange={(e) => setMentorDraft(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Share an update, tip, or announcement…"
            className="w-full rounded border border-yellow-300 px-3 py-2 text-sm bg-white"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">{mentorDraft.length}/500</span>
            <button
              onClick={handleMentorPost}
              disabled={submitting || !mentorDraft.trim()}
              className="bg-yellow-500 text-white text-sm font-semibold rounded-md px-4 py-1.5 disabled:opacity-50"
            >
              Post message
            </button>
          </div>
        </div>
      )}

      {!canAsk && !isMentor && !user && (
        <p className="text-sm text-gray-600 mb-4">
          <Link to="/login" className="text-[#5B8FCF] hover:underline font-semibold">Log in</Link>{" "}
          and join this hackathon to ask the mentor questions.
        </p>
      )}

      {!canAsk && !isMentor && user?.role === "participant" && !isJoined(hackathon.id) && (
        <p className="text-sm text-gray-600 mb-4">Join this hackathon to ask questions.</p>
      )}

      {aiError && (
        <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {aiError}
        </div>
      )}

      {questions.length === 0 ? (
        <p className="text-sm text-gray-500 italic text-center py-4">
          No messages yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {questions.map((q) => {
            // Mentor-initiated broadcast message
            if (q.type === "mentor_message") {
              return (
                <li key={q.id} className="border border-yellow-200 rounded-md p-3 bg-yellow-50">
                  <p className="text-xs font-semibold text-yellow-700 flex items-center gap-1 mb-1">
                    🎓 {q.answererName}
                    <span className="text-yellow-600 font-normal">(Mentor)</span>
                  </p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.answer}</p>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </p>
                </li>
              );
            }

            // Normal participant question
            const isMine = user?.email?.toLowerCase() === (q.askerEmail || "").toLowerCase();
            return (
              <li key={q.id} className="border rounded-md p-3 bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1f3a68]">
                      {q.askerName || q.askerEmail || "Participant"}{" "}
                      <span className="text-gray-400 font-normal text-xs">asked</span>
                    </p>
                    <p className="text-sm text-gray-800 mt-0.5">{q.question}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {q.answer ? (
                  <div className="mt-2 bg-green-50 border border-green-200 rounded p-2.5">
                    <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
                      {q.answererRole === "ai" ? "🤖" : "🎓"} {q.answererName}
                      <span className="text-green-600 font-normal">
                        ({q.answererRole === "ai" ? "AI" : "Mentor"})
                      </span>
                    </p>
                    <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{q.answer}</p>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-col gap-2">
                    {isMentor && (
                      <div className="flex gap-2">
                        <input
                          value={answerDrafts[q.id] || ""}
                          onChange={(e) =>
                            setAnswerDrafts((p) => ({ ...p, [q.id]: e.target.value }))
                          }
                          placeholder="Write your answer…"
                          className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => handleAnswer(q.id)}
                          className="bg-[#5B8FCF] text-white text-xs font-semibold rounded px-3 py-1"
                        >
                          Reply
                        </button>
                      </div>
                    )}
                    {(isMine || isMentor) && (
                      <button
                        onClick={() => handleAskAi(q)}
                        disabled={aiLoadingId === q.id}
                        className="self-start text-xs bg-purple-600 text-white font-semibold rounded px-3 py-1 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {aiLoadingId === q.id ? (
                          <>
                            <span className="inline-block w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Thinking…
                          </>
                        ) : (
                          "🤖 Ask AI"
                        )}
                      </button>
                    )}
                    {!isMentor && !isMine && (
                      <p className="text-xs text-gray-500 italic">Awaiting mentor answer…</p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
