export const dailyQuotes = [
  { text: "The tree which fills the arms grew from the tiniest sprout; the tower of nine storeys rose from a small heap of earth. Great work gathers its strength quietly, one small act at a time.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "The journey of a thousand li commenced with a single step. Keep returning your attention to the next step, and the long road will begin to carry you forward.", source: "Laozi · Dao De Jing, ch. 64" },
  { text: "To win a hundred victories in a hundred battles is not the highest excellence; to subdue the enemy without fighting is. The finest strength is often the strength that leaves no wound behind.", source: "Sunzi · The Art of War, ch. 3" },
  { text: "The skilled person studies the shape of a situation before trying to force it. When the right moment arrives, a small movement can accomplish what great effort could not.", source: "Sunzi · The Art of War, ch. 5" },
  { text: "The things in our control are free, unrestrained, and unhindered; those beyond our control are weak and uncertain. Begin the day by telling these two kinds of things apart, and peace has somewhere to begin.", source: "Epictetus · Enchiridion, 1" },
  { text: "We are adapted by nature to receive virtue, and are made perfect by habit. What we practice in ordinary moments slowly becomes the character we bring to difficult ones.", source: "Aristotle · Nicomachean Ethics, II" },
  { text: "The most important part of education is right training in the nursery. A good practice, repeated with care, takes root until it becomes a quiet kind of wisdom.", source: "Plato · Laws, VII" },
] as const;

export const quoteForDate = (date: Date) => dailyQuotes[(date.getDate() + date.getMonth()) % dailyQuotes.length];
