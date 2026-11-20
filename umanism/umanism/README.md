# Atelierul Umanismului

## Configurare
Proiect Vite + Supabase Realtime. Nu include chei sau secrete reale.

Variabilele necesare în Cloudflare Pages:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Setări Cloudflare Pages:
- Root directory: `umanism`
- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: `None`

## Moduri
- Modul A: creatorul primește o provocare și categoria secretă; poate scrie sau desena.
- Modul B: creatorul reproduce un model original; modelele includ texte și desene; jucătorii ghicesc categoria și modelul.
- Maximum 32 de jucători, inclusiv gazda.
- Timp de creație: 3 minute; votare: 45 de secunde.

## Punctaj
- +100 pentru fiecare votant numai dacă există o categorie câștigătoare unică și aceasta este categoria secretă.
- Creatorul primește +300 numai în aceeași situație.
- Modul B: +150 pentru identificarea modelului original; creatorul primește +50 dacă modelul original este alegerea unică cea mai votată.
- Egalitate la categorie: se afișează „Egalitate” și nu se acordă puncte pentru categorie. Punctele pentru modelul original din Modul B rămân independente.

## Sincronizare și limitări
Starea este transmisă prin Supabase Realtime Presence/Broadcast. Cererea de stare ajută jucătorii care intră sau se reconectează cât timp gazda este online. Dacă gazda închide pagina sau pierde definitiv conexiunea, partida nu poate fi restaurată: această versiune nu persistă starea jocului într-un tabel Supabase. Limita de 32 este verificată prin Presence și nu este o rezervare atomică a locurilor.

## Înlocuire pe GitHub
Încarcă folderul `umanism` în repository, înlocuind folderul existent. Păstrează valorile reale ale variabilelor de mediu în Cloudflare; nu încărca un fișier `.env` cu chei private în GitHub.
