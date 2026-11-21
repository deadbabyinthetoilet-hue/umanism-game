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

## Modificări incluse
- Gazda alege după fiecare rundă între „Începe o rundă nouă” și „Încheie jocul”.
- La modul de reproducere, cele 6 variante sunt întotdeauna de același tip cu modelul original: text sau desen.
- Biblioteca conține 100 de modele text și 100 de modele desenate. Fiecare tip are propria coadă amestecată; un model nu se repetă până nu sunt epuizate toate modelele acelui tip.
- Ordinea creatorilor se repetă ciclic, astfel încât fiecare jucător primește din nou rândul după ce toți au creat.

## Limitări
- Starea partidei este păstrată în memoria browserului gazdei și transmisă prin Supabase Realtime. Dacă gazda închide pagina sau pierde sesiunea, partida nu poate fi restaurată complet.
- Limita de 32 de participanți este verificată prin Presence; verificarea nu este atomică.
- Modelele desenate sunt ilustrații SVG originale generate pentru joc; pot fi extinse sau înlocuite ulterior.
