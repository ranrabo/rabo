const quoteSeeds = [
  { text: "The tree which fills the arms grew from the tiniest sprout; the tower of nine storeys rose from a small heap of earth.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "The journey of a thousand li commenced with a single step.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "To win a hundred victories in a hundred battles is not the highest excellence; to subdue the enemy without fighting is.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "The skilled person studies the shape of a situation before trying to force it.", source: "Sunzi · The Art of War, ch. 5" },
  { text: "The things in our control are free, unrestrained, and unhindered; those beyond our control are weak and uncertain.", source: "Epictetus · Enchiridion, 1" },
  { text: "We are adapted by nature to receive virtue, and are made perfect by habit.", source: "Aristotle · Nicomachean Ethics, II" },
  { text: "The most important part of education is right training in the nursery.", source: "Plato · Laws, VII" },
  { text: "No man is free who is not master of himself.", source: "Epictetus · Discourses" },
  { text: "The beginning is more than half of the whole.", source: "Aristotle · Nicomachean Ethics, I" },
  { text: "Nature does not hurry, yet everything is accomplished.", source: "Laozi · Dao De Jing" },
  { text: "He who knows others is wise; he who knows himself is enlightened.", source: "Laozi · Dao De Jing, ch. 33" },
  { text: "The opportunity of defeating the enemy is provided by the enemy himself.", source: "Sunzi · The Art of War, ch. 5" },
] as const;

const reflections = [
  "Great work gathers its strength quietly, one small act at a time. No single afternoon in the lab will feel decisive, and that is exactly how it should be. Trust the accumulation, and let the record of steady hours speak for itself.",
  "When the whole project feels too large to hold, let the next clear action be enough for this moment. Name it, start it, and finish it before you reach for the one after. The larger structure will still be there, and it will be a little closer than before.",
  "A patient rhythm can carry you farther than a hurried burst of effort. The person who arrives most days and works with care will pass the one who waits for perfect conditions. Consistency is a slow kind of talent, and it compounds.",
  "Begin with what is close, and let the larger path reveal itself as you move. You rarely need the full map to take the first honest step. Clarity tends to arrive in the middle of the work, not before it.",
  "The ordinary repetition of care is how lasting change takes root. Cleaning the bench, labeling the sample, writing the note you will thank yourself for later. These small courtesies to your future self are the quiet infrastructure of good research.",
  "There is wisdom in leaving room for the day to answer back. Plans are a starting position, not a contract, and the work will teach you things your schedule could not predict. Hold the intention firmly and the method loosely.",
  "A calm beginning gives difficult work somewhere steady to stand. Take the first few minutes to set up well rather than lunging at the hardest part. The effort you spend on a clear start is repaid with interest.",
  "Attention wanders; this is not a failure, only a fact. The skill is not in never drifting but in returning gently, again and again, without the tax of self-reproach. Each return is a small act of practice in its own right.",
  "What seems small today may be building the shape of a much larger life. The habits you keep this month are quietly deciding what will feel possible next year. Choose them as if they matter, because they do.",
  "Measure progress by the honesty of the effort, not only by its size. Some days the work is a single careful paragraph or one clean run of an experiment. Recorded faithfully, those days still move the whole thing forward.",
  "The quietest habits often become the strongest companions. A fixed hour, a familiar chair, a ritual that tells your mind it is time to begin. Build a few of these and you will need less willpower to start.",
  "Make the useful thing easier to begin, and begin before you feel ready. Readiness is usually a feeling that follows action rather than preceding it. Lower the friction, take the first step, and let momentum do the rest.",
  "A little attention, offered consistently, is a form of respect. Toward the work, toward the people who will read it, and toward the version of you who has to continue it tomorrow. Small, regular care adds up to something that looks like devotion.",
  "When the path is unclear, take care of the step directly in front of you. Over-planning in fog is just anxiety with a to-do list. Do the next real thing, then look up and see what the landscape shows you.",
  "The work becomes lighter when it is allowed to unfold in its proper order. Forcing a later stage before the earlier one is ready only creates work to undo. Respect the sequence, and each part will support the next.",
  "Keep enough stillness to notice what the moment is actually asking for. Not every hour wants the same kind of effort; some want push, others want patience or rest. Listening well is part of working well.",
  "A thoughtful pause is not lost time; it is part of good judgment. The minute you spend deciding whether a task matters can save an afternoon of precise, pointless motion. Stop often enough to stay aimed at the right thing.",
  "Practice turns an intention into something the hands remember. What is effortful and deliberate now will, with repetition, become quiet and automatic. Then your attention is freed for the parts that genuinely need it.",
  "Let today be a place to practice, not a test you must perfectly pass. The point of a single session is to show up, do the work honestly, and leave notes for next time. Perfection is a story told across many ordinary days.",
  "Small acts of preparation make generous space for later possibilities. Order the reagent now, draft the outline now, ask the question now. Future opportunities tend to favor the person who cleared the way in advance.",
  "Attention is a quiet resource; spend it where it can do the most good. Guard the first clear hours for the work that is hard and important. The shallow tasks will still be waiting, and they cost less when your mind is tired.",
  "The best pace is one that allows both care and continuation. Fast enough to keep faith that it is moving, slow enough that you are not breaking things you will have to mend. Sustainable is a synonym for effective.",
  "A finished small task can restore trust in the larger undertaking. When the big goal feels abstract and far away, completion is a tonic. Close one loop cleanly and the next one looks a little more possible.",
  "Do not confuse movement with progress; look for the work that truly matters. A busy day can leave the central question exactly where it was this morning. Ask what would actually change if this task were done, and start there.",
  "The shape of a day is often changed by one deliberate choice made early. Protect a block of time, decline a distraction, decide the first task before you sit down. That single act of intent tends to organize everything after it.",
  "Leave the door open for surprise, even while keeping your purpose clear. The result you did not expect is often the one worth following. Rigor and curiosity are not opponents; they take turns leading.",
  "The mind settles when it has one honest thing to attend to. Divided attention feels productive and rarely is. Choose the single task that deserves this hour, and let the others wait their turn.",
  "Good work is often less about force than about returning faithfully. Miss a day and the practice is not broken, only paused; the next session repairs it. What matters is the long pattern, not any single gap in it.",
  "A steady practice gives freedom to the parts of life that need invention. When the routine holds itself up, you have energy left for the genuinely creative problems. Structure is what makes room for play.",
  "Notice what is already working, then build from there. Before redesigning everything, protect the small systems that quietly keep you going. Improvement is often addition at the edges, not demolition at the center.",
  "The day does not need to be conquered; it needs to be met. Arrive, look honestly at what it contains, and do the next worthy thing with care. That is the whole method, repeated until the work is done.",
] as const;

export const dailyQuotes = Array.from({ length: 366 }, (_, index) => {
  const seed = quoteSeeds[index % quoteSeeds.length];
  const reflection = reflections[Math.floor(index / quoteSeeds.length)];
  return { text: `${seed.text} ${reflection}`, source: seed.source };
});

export const quoteForDate = (date: Date) => {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return dailyQuotes[((dayNumber % dailyQuotes.length) + dailyQuotes.length) % dailyQuotes.length];
};
