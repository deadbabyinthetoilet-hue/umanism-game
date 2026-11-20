export const CATEGORIES = ["Civic", "Literar", "Creștin", "Științific", "Filosofic", "Impostor"];

export const PROMPTS = [
  { category: "Civic", type: "desen", text: "Desenează un cetățean care ajută comunitatea." },
  { category: "Civic", type: "text", text: "Scrie un motto scurt despre responsabilitatea față de ceilalți." },
  { category: "Civic", type: "schemă", text: "Creează o schemă despre cum poate fi îmbunătățit un oraș." },
  { category: "Literar", type: "literatură", text: "Scrie începutul unei povești inspirate de lumea antică." },
  { category: "Literar", type: "text", text: "Scrie un citat scurt despre puterea cărților și a educației." },
  { category: "Literar", type: "desen", text: "Desenează o scenă inspirată de o poveste sau de un mit antic." },
  { category: "Creștin", type: "desen", text: "Desenează un simbol al credinței sau al iubirii aproapelui." },
  { category: "Creștin", type: "text", text: "Scrie un îndemn scurt despre bunătate și iertare." },
  { category: "Creștin", type: "schemă", text: "Realizează o schemă despre valorile care îl apropie pe om de Dumnezeu." },
  { category: "Științific", type: "schemă", text: "Reprezintă pașii unei cercetări: observație, întrebare, experiment, concluzie." },
  { category: "Științific", type: "desen", text: "Desenează un savant care observă sau cercetează natura." },
  { category: "Științific", type: "text", text: "Scrie o propoziție despre importanța experimentului și a dovezilor." },
  { category: "Filosofic", type: "text", text: "Scrie o idee despre libertatea de gândire și rațiune." },
  { category: "Filosofic", type: "desen", text: "Desenează un simbol al cunoașterii de sine." },
  { category: "Filosofic", type: "schemă", text: "Creează o hartă de idei despre ce înseamnă să fii om." },
  { category: "Impostor", type: "desen", text: "Desenează un animal fantastic care trăiește pe o planetă îndepărtată." },
  { category: "Impostor", type: "text", text: "Scrie o reclamă amuzantă pentru o pizza imaginară." },
  { category: "Impostor", type: "schemă", text: "Realizează o schemă despre cum se construiește un castel din cuburi." }
];

// Mode B templates. Each item is a source model; distractors are drawn from the same pool.
export const TEMPLATES = [
  { id: "b1", category: "Civic", kind: "text", title: "Modelul original", content: "Un cetățean adevărat nu se gândește numai la binele său, ci și la binele comunității." },
  { id: "b2", category: "Civic", kind: "text", title: "Modelul original", content: "Orașul devine mai bun atunci când oamenii participă și își îndeplinesc responsabilitățile." },
  { id: "b3", category: "Literar", kind: "text", title: "Modelul original", content: "Cărțile vechilor autori sunt izvoare din care mintea învață să gândească și să creeze." },
  { id: "b4", category: "Literar", kind: "text", title: "Modelul original", content: "Cuvintele bine alese pot păstra peste veacuri ideile și frumusețea unei culturi." },
  { id: "b5", category: "Creștin", kind: "text", title: "Modelul original", content: "Credința și iubirea aproapelui îl îndeamnă pe om să trăiască în bunătate." },
  { id: "b6", category: "Creștin", kind: "text", title: "Modelul original", content: "Omul își găsește împlinirea atunci când își folosește libertatea pentru a face binele." },
  { id: "b7", category: "Științific", kind: "text", title: "Modelul original", content: "Observă, pune întrebări, cercetează și verifică înainte de a trage o concluzie." },
  { id: "b8", category: "Științific", kind: "text", title: "Modelul original", content: "Natura își dezvăluie secretele celui care măsoară, compară și experimentează." },
  { id: "b9", category: "Filosofic", kind: "text", title: "Modelul original", content: "Omul se cunoaște pe sine atunci când îndrăznește să-și cerceteze propriile idei." },
  { id: "b10", category: "Filosofic", kind: "text", title: "Modelul original", content: "Rațiunea îl ajută pe om să pună la îndoială aparențele și să caute adevărul." },
  { id: "b11", category: "Impostor", kind: "text", title: "Modelul original", content: "Un dragon albastru a zburat peste munți și a ascuns o comoară într-un castel." },
  { id: "b12", category: "Impostor", kind: "text", title: "Modelul original", content: "Rețeta pentru o limonadă perfectă începe cu trei lămâi și multă gheață." }
];

export function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function shuffle(arr) { return [...arr].map(v => [Math.random(), v]).sort((a,b) => a[0]-b[0]).map(x => x[1]); }

export function makeRound(players, index) {
  const mode = Math.random() < 0.5 ? "A" : "B";
  const creator = players[index % players.length];
  if (mode === "A") {
    const category = pick(CATEGORIES);
    const prompt = pick(PROMPTS.filter(p => p.category === category));
    return { number: index + 1, mode, creatorId: creator.id, creatorName: creator.name, category, prompt, phase: "creating", createdAt: Date.now(), artwork: null, votes: {}, templateVotes: {} };
  }
  const template = pick(TEMPLATES);
  const distractors = shuffle(TEMPLATES.filter(t => t.id !== template.id)).slice(0, 5);
  return { number: index + 1, mode, creatorId: creator.id, creatorName: creator.name, category: template.category, template, choices: shuffle([template, ...distractors]), prompt: { type: template.kind === "text" ? "text" : "desen", text: "Reprodu această creație cât mai fidel posibil." }, phase: "creating", createdAt: Date.now(), artwork: null, votes: {}, templateVotes: {} };
}
