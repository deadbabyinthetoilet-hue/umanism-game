# Atelierul Umanismului

Joc multiplayer în browser, construit cu Vite și Supabase Realtime (Presence + Broadcast).

## Cloudflare Pages
- Framework preset: None
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: folderul în care se află acest `package.json`

## Variabile de mediu
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Folosește cheia publicabilă Supabase (`sb_publishable_...`). Nu introduce niciodată cheia secretă (`sb_secret_...`) în aplicația din browser.

## Modul A
Creatorul primește aleatoriu o categorie secretă (Civic, Literar, Creștin, Științific sau Filosofic) și o sarcină: desen sau text. Textul nu trebuie să conțină explicit numele categoriei. Ceilalți ghicesc categoria.

## Modul B
Creatorul primește un desen original și categoria lui secretă. Jocul îi atribuie aleatoriu o sarcină: să reproducă desenul sau să îl descrie în text. Textul nu trebuie să dezvăluie explicit categoria. Ceilalți ghicesc categoria și aleg desenul original dintre variante.

## Cum adaugi desene pentru Modul B
În GitHub, încarcă imaginile în:
- `src/models/mode-b/civic/`
- `src/models/mode-b/literar/`
- `src/models/mode-b/crestin/`
- `src/models/mode-b/stiintific/`
- `src/models/mode-b/filosofic/`

Formate acceptate: PNG, JPG, JPEG, WEBP și SVG. Numele fișierelor pot fi alese liber. Categoria este determinată de folder. După commit, Cloudflare reconstruiește site-ul și desenele noi intră automat în colecție. Pentru fiecare rundă B, jocul folosește un desen o singură dată până se epuizează coada comună; apoi ciclul se amestecă din nou. Dacă nu există încă imagini încărcate, jocul folosește desenele demonstrative incluse.

## Alte reguli
- Gazda poate începe o rundă nouă sau poate încheia jocul după rezultate.
- Votarea durează 45 de secunde; creația durează 3 minute.
- Ordinea creatorilor se reia după ce fiecare jucător a creat.
- Limita este de 32 de participanți.

## Limitări
- Starea partidei este păstrată în memoria browserului gazdei și transmisă prin Supabase Realtime. Dacă gazda închide pagina sau pierde sesiunea, partida nu poate fi restaurată complet.
- Limita de 32 de participanți este verificată prin Presence; verificarea nu este atomică.

## Îmbunătățiri incluse
- Textele scrise de participanți trebuie să aibă minimum 10 cuvinte; verificarea se face în interfață și din partea gazdei.
- Gazda poate elimina participanți din lobby, din timpul creației, din votare sau din ecranul rezultatelor. Dacă este eliminat creatorul rundei, jocul trece la următoarea rundă.
- Categoria secretă este evidențiată vizual în ecranul creatorului.
- În lobby apare un cod QR și un link de invitație. Scanarea deschide jocul cu codul camerei completat automat; participantul își introduce numele și apasă „Intră în cameră”.
- În lobby nu este afișată nicio galerie de desene. Imaginile din cele cinci foldere sunt păstrate în proiect și folosite de Modul B în timpul rundelor.

Dependență suplimentară: `qrcode`, folosită pentru generarea locală a codului QR în browser.
