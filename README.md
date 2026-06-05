# Fanpage PAF Płońsk

Aplikacja webowa do zarządzania statystykami piłkarskimi drużyny PAF Płońsk.

## Funkcje

- 📅 Terminarz meczów (liga + puchar)
- ⚽ Statystyki meczowe (skład, gole, kartki, minuty)
- 👥 Zarządzanie zawodnikami
- 📊 Podsumowanie sezonu z rankingami
- 🔐 Panel admina z logowaniem

## Setup

### 1. Sklonuj repo

```bash
git clone https://github.com/Bangmaster/paf-plonsk-fanpage.git
cd paf-plonsk-fanpage
npm install
```

### 2. Skonfiguruj zmienne środowiskowe

Skopiuj `.env.example` do `.env` i uzupełnij:

```
VITE_SUPABASE_URL=https://twoj-projekt.supabase.co
VITE_SUPABASE_ANON_KEY=twoj-anon-key
```

### 3. Uruchom lokalnie

```bash
npm run dev
```

### 4. Logo

Umieść plik `logo.png` w folderze `public/`.

## Deploy na Vercel

1. Połącz repo z Vercel
2. W ustawieniach projektu dodaj zmienne środowiskowe:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automatyczny przy każdym push do main

## Logowanie admina

- Login: `Joker`
- Hasło domyślne: `Twojastara`
- Hasło można zmienić w panelu admina
