// SmartHack AI — rule-based mentor that works with zero API keys.
// Gives genuinely useful, context-aware hackathon advice.

const tips = {
  idea: [
    "Focus on a real problem you or someone you know has faced — authentic problems lead to compelling solutions.",
    "Narrow your scope aggressively. A polished solution to one specific problem beats a half-built solution to many.",
    "Look for intersections between the hackathon theme and everyday pain points — that's where winning ideas live.",
    "Validate your idea in the first hour: ask 3 people if they'd use it. Pivot early if the answer is no.",
  ],
  team: [
    "Assign clear roles immediately: one person owns the demo, one owns the backend, one owns the pitch.",
    "Sync every 2 hours with a 5-minute standup — what did you do, what's next, any blockers?",
    "Disagreements? Use a 5-minute timer rule: debate for 5 minutes, then the tech lead decides and you move on.",
    "Play to each person's strengths. Don't spend 3 hours teaching someone a new tool during a hackathon.",
  ],
  technical: [
    "Pick the stack everyone already knows. A hackathon is not the time to learn a new framework.",
    "Use existing APIs and services aggressively — Stripe, Firebase, OpenAI, Maps. Don't rebuild what exists.",
    "Get a working end-to-end prototype first, even if it's ugly. Polish only after the core flow works.",
    "Use version control from minute one. A lost 3-hour coding session will end your hackathon.",
  ],
  demo: [
    "Your demo should tell a story: here's the problem → here's who has it → here's our solution in action.",
    "Practice the demo at least 3 times before presenting. Know exactly which buttons to click.",
    "Have a backup plan: screenshots or a video recording in case live demos break under pressure.",
    "Lead with the user benefit, not the tech. Judges care about impact, not implementation details.",
  ],
  pitch: [
    "Start with a one-sentence problem statement that anyone can understand immediately.",
    "State your target user clearly. 'Everyone' is not a target user.",
    "Mention what makes your solution unique — even one thing that differentiates you matters.",
    "End with traction or validation: even 2 people who said they'd use it is worth mentioning.",
  ],
  time: [
    "Spend the first 20% of time planning, 60% building, 20% polishing and rehearsing.",
    "Cut features ruthlessly. A working MVP with 2 features beats a broken app with 10.",
    "Set hard deadlines: 'we stop coding at X hours before the end and only do demo prep.'",
    "Sleep matters. A 6-hour sleep will make you more productive than coding through the night.",
  ],
  general: [
    "The best hackathon projects solve a real problem clearly and demo smoothly. Focus on those two things above all else.",
    "Judges look for: clear problem, working solution, good presentation. Hit all three and you're in the top 10%.",
    "Don't wait until your solution is perfect to test it. Get user feedback early and iterate.",
    "Document as you go — a quick README written during the hackathon saves hours at submission time.",
  ],
};

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function detectTopics(question) {
  const q = question.toLowerCase();
  const topics = [];
  if (/idea|topic|theme|problem|choose|pick|what (to|should)|brainstorm/i.test(q)) topics.push("idea");
  if (/team|member|role|collaborat|conflict|disagree|split|assign/i.test(q)) topics.push("team");
  if (/code|tech|stack|framework|language|api|build|implement|architect/i.test(q)) topics.push("technical");
  if (/demo|show|present|showcase|display|video/i.test(q)) topics.push("demo");
  if (/pitch|judge|present|speak|slide|convince|sell/i.test(q)) topics.push("pitch");
  if (/time|deadline|schedule|plan|hours|manage|priorit/i.test(q)) topics.push("time");
  return topics.length > 0 ? topics : ["general"];
}

export function getSmartAnswer(question, hackathonTitle, hackathonTheme) {
  const topics = detectTopics(question);

  // Build a 3-4 tip response covering detected topics
  const lines = [];
  const used = new Set();

  for (const topic of topics.slice(0, 2)) {
    const pool = tips[topic] || tips.general;
    let tip;
    let attempts = 0;
    do {
      tip = pickRandom(pool);
      attempts++;
    } while (used.has(tip) && attempts < 10);
    used.add(tip);
    lines.push(`• ${tip}`);
  }

  // Always add one general tip
  const generalTip = tips.general.find(t => !used.has(t)) || pickRandom(tips.general);
  lines.push(`• ${generalTip}`);

  const context = hackathonTitle
    ? `For the **${hackathonTitle}** hackathon${hackathonTheme ? ` (theme: ${hackathonTheme})` : ""}:\n\n`
    : "";

  return `${context}${lines.join("\n\n")}`;
}
