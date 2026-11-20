# Atelierul Umanismului

Prototip multiplayer pentru un joc de petrecere în limba română, construit cu Vite și Supabase Realtime.

## Ce include prototipul

- Camere cu cod și până la 20 de jucători (limită de aplicație, nu o garanție de capacitate a planului Supabase).
- Gazdă care pornește jocul.
- Rotație aleatorie: fiecare participant este creator o dată într-o partidă.
- Alegere aleatorie a Modulului A sau B la fiecare rundă.
- 3 minute pentru creație/reproducere.
- Modul A: prompt, categorie secretă individuală, canvas sau text.
- Modul B: model text individual, reproducere, vot pentru categorie și alegerea modelului original dintre 6 variante.
- Votare de 45 de secunde și clasament.

## Configurare locală

1. Instalează Node.js LTS: https://nodejs.org/
2. Deschide proiectul într-un terminal.
3. Rulează `npm install`.
4. Copiază `.env.example` în `.env`.
5. Înlocuiește valorile cu Project URL și Publishable key din Supabase:

   ```env
   VITE_SUPABASE_URL=https://PROJECT_ID.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

6. Rulează `npm run dev` și deschide adresa locală afișată de Vite.

Nu folosi cheia `sb_secret_` sau cheia `service_role` în aplicația din browser.

## Supabase

Acest prototip folosește Supabase Realtime Presence și Broadcast și nu necesită tabele sau SQL pentru prima versiune. Canalele sunt publice și camera este accesibilă oricui cunoaște codul. Nu introduce date personale sau sensibile.

**Limitare importantă:** starea jocului este păstrată în memoria browserului gazdei. Dacă gazda închide pagina sau își pierde conexiunea, jocul poate fi întrerupt. Pentru o versiune robustă, următorul pas este mutarea stării autoritative în baza de date și adăugarea autentificării/politicilor de acces.

## Publicare

Poți publica pe Vercel:

1. Încarcă proiectul într-un repository GitHub.
2. Importă repository-ul în https://vercel.com/.
3. Adaugă variabilele `VITE_SUPABASE_URL` și `VITE_SUPABASE_PUBLISHABLE_KEY` în Project Settings → Environment Variables.
4. Deploy.

Nu încărca fișierul `.env` în GitHub.
