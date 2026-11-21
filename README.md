# Kasička – spořicí cíle

Jednoduchá aplikace na spořicí cíle. Založíš si cíl (třeba „Dovolená 30 000 Kč do července“), zapisuješ vklady
a Kasička ukáže, jak ti to jde a kolik odkládat, aby to vyšlo včas.

- **PWA:** jde nainstalovat do mobilu i do PC a funguje bez internetu.
- **Bez backendu:** data jsou jen v prohlížeči (localStorage), zálohu si stáhneš jako soubor JSON.
- **Vite + React + TypeScript.** Graf je čisté SVG bez knihovny, fonty jsou přibalené (fungují i offline).
- Celé česky, částky a data podle `cs-CZ`, světlý i tmavý režim podle systému, od 360 px šířky po desktop.

## Spuštění na počítači

Potřebuješ Node.js 22.12 nebo novější (verze LTS z [nodejs.org](https://nodejs.org)).

```powershell
npm install        # jednou, stáhne balíčky
npm run dev        # vývojový server na http://localhost:5173
npm test           # unit testy výpočtů a načítání dat (Vitest)
npm run build      # produkční build do složky dist/
npm run preview    # spustí build na http://localhost:4173, včetně offline režimu
```

## Nasazení zdarma

Na mobil se PWA instaluje jen z adresy s HTTPS, proto je potřeba aplikaci někam nahrát. Obě varianty níž jsou zdarma.

### A) GitHub Pages jedním skriptem (doporučeno)

Dvojklik na **`Nasadit na GitHub.cmd`** (nebo v PowerShellu `powershell -ExecutionPolicy Bypass -File .\nasadit.ps1`).
Skript:

1. doinstaluje GitHub CLI, pokud chybí (Windows se zeptá na oprávnění),
2. otevře přihlášení na GitHub (účet je zdarma),
3. založí veřejný repozitář `kasicka` a nahraje do něj kód,
4. zapne GitHub Pages a počká, až GitHub Actions aplikaci otestuje, sestaví a nasadí,
5. vypíše adresu (`https://<tvoje-jmeno>.github.io/kasicka/`) a otevře ji.

Další spuštění skriptu jen nahraje změny a web se sám aktualizuje.

### B) GitHub Pages ručně

1. Na GitHubu založ veřejný repozitář (třeba `kasicka`) a nahraj do něj projekt:
   `git remote add origin https://github.com/<jmeno>/kasicka.git` a `git push -u origin main`.
2. V repozitáři otevři **Settings → Pages** a jako **Source** vyber **GitHub Actions**.
3. Workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) při každém pushi na `main` spustí testy,
   sestaví aplikaci se správnou cestou (`/kasicka/`) a nasadí ji.

### C) Netlify

- **Bez gitu:** `npm run build` a pak na <https://app.netlify.com/drop> přetáhni složku `dist`.
- **S gitem:** Netlify → *Add new site* → *Import an existing project* → vyber repozitář.
  Nastavení si Netlify načte z [`netlify.toml`](netlify.toml).

## Instalace do mobilu a do PC

- **PC (Edge, Chrome):** otevři adresu aplikace a v adresním řádku klikni na ikonu *Nainstalovat aplikaci*.
  Kasička se pak spouští z nabídky Start jako samostatné okno.
- **Android (Chrome):** menu ⋮ → *Přidat na plochu* / *Instalovat aplikaci*.
- **iPhone (Safari):** tlačítko *Sdílet* → *Přidat na plochu*.
- Adresu dostaneš do mobilu nejsnáz přes QR kód: v PC klikni pravým tlačítkem na stránku → *Vytvořit QR kód pro tuto stránku*.

Každé zařízení i každý prohlížeč má svoje vlastní data. Cíle mezi nimi přeneseš přes **Záloha → Kopírovat / Stáhnout**
a na druhém zařízení **Záloha → Obnovit ze zálohy**.

## Data a zálohy

- Data leží v `localStorage` pod klíčem `kasicka:v1` ve tvaru `{ "version": 1, "goals": Goal[] }`.
- Záloha je JSON `{ "app": "kasicka", "version": 1, "exportedAt": "…", "goals": [ … ] }`. Import přijme i holé pole cílů.
- Import cíle přidá; cíl se stejným `id` přepíše verzí ze zálohy. Neplatné cíle a pohyby přeskočí a řekne, kolik jich bylo.
- Poškozená data v úložišti aplikaci neshodí: při načtení se opraví, co jde (oříznutí textů, neplatná barva, chybějící id),
  zbytek se přeskočí a původní text se schová pod klíčem `kasicka:v1:poskozena-data`.
- Aplikace po prvním cíli požádá prohlížeč o trvalé úložiště, aby data nemazal při nedostatku místa.
- Změny se synchronizují mezi otevřenými záložkami stejného prohlížeče.

## Jak se počítá

Pro každý cíl (viz [`src/lib/stats.ts`](src/lib/stats.ts), testy v [`src/lib/stats.test.ts`](src/lib/stats.test.ts)):

| Veličina | Výpočet |
|---|---|
| naspořeno | součet všech pohybů, nikdy méně než 0 |
| zbývá | max(0, cíl − naspořeno) |
| procenta | naspořeno / cíl, oříznuto na 0–100 % (zobrazení zaokrouhluje dolů, nesplněný cíl nikdy neukáže 100 %) |
| start | dřívější z data založení a prvního pohybu |
| tempo | naspořeno / max(30, dní od startu do dneška) Kč za den |
| odhad splnění | dnes + zbývá / tempo (dny zaokrouhlené nahoru), jen když je tempo > 0; přes 100 let se neukazuje |
| měsíčně / týdně | zbývá / (dní do termínu / 30,4375), resp. / (dní / 7) |

Stavy: **Splněno** → **Po termínu** → **Nový** (bez pohybu) → **Bez termínu** → **Stíháš** (odhad ≤ termín) → **Zrychli**.

## Kde se aplikace drobně liší od zadání (a proč)

- **Méně než měsíc do termínu:** „měsíčně“ se počítá jako by zbýval celý měsíc (stejně „týdně“ pod týden). Jinak by aplikace
  při 10 dnech do termínu radila „odkládej 9 131 Kč měsíčně“, i když chybí jen 3 000 Kč.
- **„Odkládej aspoň“ zaokrouhluje nahoru** na celé koruny, aby doporučená částka opravdu stačila. Ostatní částky se zaokrouhlují normálně.
- **Věta u nového cíle** je neutrální vůči rodu: „Aby to vyšlo do X, odkládej Y měsíčně.“ místo „Abys to stihl…“.
- **Výběr nemůže být větší, než je naspořeno**, a datum pohybu nemůže být v budoucnosti.
- **„Odloženo tento měsíc“ nepočítá „Počáteční stav“**, protože to jsou peníze naspořené dřív.
- **Ideální čára v grafu** začíná zůstatkem v den startu (typicky „Počáteční stav“), ne nulou, aby ukazovala cestu od místa, kde jsi začal.
- **Termín při úpravě:** nový termín musí být v budoucnosti, ale už uplynulý termín jde při úpravě nechat beze změny
  (cíl pak zůstane „Po termínu“, formulář na to upozorní).
- **Smazání pohybu i cíle jde vrátit** tlačítkem „Vrátit“ v hlášce. Smazání cíle se navíc potvrzuje druhým kliknutím.
- **Barva cíle** se ukládá jako jedna ze 6 barev (hex); v tmavém režimu se kreslí její světlejší odstín.

## Struktura projektu

```
src/
  lib/          typy, výpočty (stats), věty s radou, formátování, normalizace dat, záloha, úložiště, ukázková data
  hooks/        useGoals (stav + ukládání), useToday, useElementWidth
  components/   karty, souhrn, formuláře, detail s grafem, historie, záloha, modální okna, hlášky
public/         ikony aplikace (favicon.svg je zdroj, PNG se generují příkazem npm run icons)
nasadit.ps1     nasazení na GitHub Pages jedním skriptem
```

## Nápady na později

- Opakovaný vklad (např. každý měsíc 2 000 Kč) s připomínkou
- Synchronizace mezi zařízeními (účet / cloud)
- Sdílený cíl pro víc lidí
- QR platba pro vklad na spořicí účet (formát SPD)
- Oslava (konfety) při splnění cíle
