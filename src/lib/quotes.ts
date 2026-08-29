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
  "Great work gathers its strength quietly, one small act at a time.",
  "Let the next clear action be enough for this moment.",
  "A patient rhythm can carry you farther than a hurried burst of effort.",
  "Begin with what is close, and let the larger path reveal itself.",
  "The ordinary repetition of care is how lasting change takes root.",
  "There is wisdom in leaving room for the day to answer back.",
  "A calm beginning gives difficult work somewhere steady to stand.",
  "Return to the work gently whenever attention wanders.",
  "What seems small today may be building the shape of a much larger life.",
  "Measure progress by the honesty of the effort, not only by its size.",
  "The quietest habits often become the strongest companions.",
  "Make the useful thing easier to begin, and begin before you feel ready.",
  "A little attention, offered consistently, is a form of respect.",
  "When the path is unclear, take care of the step directly in front of you.",
  "The work becomes lighter when it is allowed to unfold in its proper order.",
  "Keep enough stillness to notice what the moment is asking for.",
  "A thoughtful pause is not lost time; it is part of good judgment.",
  "Practice turns an intention into something the hands remember.",
  "Let today be a place to practice, not a test you must perfectly pass.",
  "Small acts of preparation make generous space for later possibilities.",
  "Attention is a quiet resource; spend it where it can do the most good.",
  "The best pace is one that allows both care and continuation.",
  "A finished small task can restore trust in the larger undertaking.",
  "Do not confuse movement with progress; look for the work that truly matters.",
  "The shape of a day is often changed by one deliberate choice.",
  "Leave the door open for surprise, even while keeping your purpose clear.",
  "The mind settles when it has one honest thing to attend to.",
  "Good work is often less about force than about returning faithfully.",
  "A steady practice gives freedom to the parts of life that need invention.",
  "Notice what is already working, then build from there.",
  "The day does not need to be conquered; it needs to be met.",
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
