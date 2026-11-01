# Padel Connect

De mobiele webapp voor het eendaagse **Padel Connect**-event: *meet · play · party*.
Spelers maken een profiel aan, worden elke ronde geloot in nieuwe viertallen op basis van
hun speelmomenten, en kunnen na afloop van hun match connecteren met de mensen waarmee
ze nog eens willen spelen. De crew stuurt alles aan vanaf een eigen dashboard.

Nuxt 4 · Vue 3 · Tailwind v4 · Firebase (Firestore + Auth) · Vercel.

---

## Snel starten

```bash
npm install
npm run dev          # http://localhost:3000
```

Zonder Firebase-config start de app in **demomodus**: alles draait op het toestel zelf
(localStorage), synchroon over alle tabbladen van dezelfde browser. Perfect om de dag
eens droog te draaien.

1. Open `/manage`, log in met pincode **2468**
2. Tab *Instellingen* → **Vul met 50 testspelers**
3. **Start event** → **Start ronde 1**
4. Open `/` in een tweede tab en schrijf jezelf in als speler

---

## Hoe de dag verloopt

| Fase | Speler ziet | Crew doet |
| --- | --- | --- |
| Vooraf | Onboarding op `/register`, pincode kiezen | Inschrijvingen openhouden |
| Start | "Het event moet nog starten" | **Start event** |
| Loting | Springt automatisch naar het matchscherm | **Start ronde** |
| Spelen | Veldnummer, team, live scorebord, "wij zijn klaar" | Live veldbord volgen, spelers wisselen |
| Connecteren | Connectieknop naast elke speelpartner | **Stop ronde** (of wacht tot alle velden klaar zijn) |
| Opnieuw | Nieuwe loting, nieuwe ploegen | **Volgende ronde** |
| Einde | Connectielijst met nummers en speeluren | **Stop event** |

### Loting

`shared/logic/matchmaking.ts` bevat het hele algoritme.

- **Capaciteit.** Met 8 velden spelen er maximaal 32 mensen tegelijk. Bij 50 spelers zit
  de rest dus op de bank. Wie gerust heeft, staat de volgende ronde vooraan in de rij
  (`roundsBenched` eerst, dan `roundsPlayed`), zodat niemand twee keer na elkaar wacht.
- **Affiniteit.** Per paar spelers: 50 % overlap in speelmomenten, 22 % niveau,
  10 % uren per week, 18 % nieuwheid (hoe vaker je al samen speelde, hoe lager).
- **Groepjes.** Elke groep start bij de speler die het moeilijkst te plaatsen is
  (langst op de bank, kleinste agenda) en vult aan met de drie best scorende partners,
  met een vleugje willekeur zodat twee identieke rondes nooit hetzelfde viertal geven.
- **Teams.** Van de drie mogelijke 2-tegen-2-splitsingen wint die met de minste herhaalde
  partners.

---

## Architectuur

```
shared/logic/        domeinlogica — één keer geschreven, overal gebruikt
  actions.ts         registreren, connecteren, rondes starten/stoppen, …
  dispatch.ts        de router waar élke mutatie doorheen gaat
  matchmaking.ts     loting, teams, bankrotatie
  store.ts           de interface die beide backends implementeren
server/              Nitro API — firebase-admin, custom tokens, rate limiting
app/lib/backend/     clientdrivers: firestore (echt) en demo (localStorage)
app/stores/          Pinia: padel (speler) en crew (dashboard)
```

Eén `Store`-interface, twee implementaties: `server/utils/firestore-store.ts` en
`app/lib/demo/store.ts`. Daardoor draait exact dezelfde businesslogica in de cloud én in
demomodus, en kan de hele dag getest worden zonder backend.

**Alle schrijfacties lopen via de server.** De client leest realtime mee via Firestore
`onSnapshot`, maar schrijft nooit rechtstreeks. Zo blijven de security rules simpel
(`firestore.rules`: lezen met beperkingen, schrijven overal `false`) en kan niemand via
de console zijn eigen matches herschrijven.

---

## Firebase opzetten

De app heeft **twee** stukken Firebase-config nodig.

### 1. Web-config (client)

Firebase console → *Project settings* → *Your apps* → web-app. Zet in `.env`:

```
NUXT_PUBLIC_FIREBASE_API_KEY=…
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=…
NUXT_PUBLIC_FIREBASE_PROJECT_ID=…
NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET=…
NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=…
NUXT_PUBLIC_FIREBASE_APP_ID=…
```

### 2. Service account (server) — verplicht

Zonder dit kan niemand inschrijven of inloggen; de app toont dan een rode waarschuwing.

Firebase console → *Project settings* → *Service accounts* → **Generate new private key**.
Plak de JSON op één regel, of base64-encodeer het bestand:

```
NUXT_FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"…"}
```

### 3. Verder in de console

- **Authentication** → één keer *Get started* aanklikken. Een specifieke provider is niet nodig:
  de app logt spelers in met custom tokens.
- **Firestore Database** → aanmaken in regio `eur3` of `europe-west1`.
- Rules uitrollen: `firebase deploy --only firestore:rules`

### 4. Crew-pincode

```
NUXT_ADMIN_PIN=2468
NUXT_SESSION_SECRET=<iets willekeurigs>
```

Kies iets anders dan `2468` voor het echte event.

---

## Deployen op Vercel

1. Repo koppelen; Vercel herkent Nuxt automatisch.
2. Alle variabelen uit `.env` toevoegen onder *Settings → Environment Variables*.
   Let op: `NUXT_FIREBASE_SERVICE_ACCOUNT` moet er ook staan.
3. Regio staat op `fra1` (`vercel.json`) — zet die bij je Firestore-regio in de buurt.

`/app/**` en `/manage/**` draaien client-side (`routeRules`), de publieke pagina's worden
server-side gerenderd.

---

## Datamodel (Firestore)

| Collectie | Inhoud | Wie leest |
| --- | --- | --- |
| `event/state` | status, instellingen, huidige ronde | iedereen die ingelogd is |
| `players/{id}` | publiek profiel: naam, foto, niveau, hobby's, speelmomenten | iedereen die ingelogd is |
| `players/{id}/private/contact` | telefoonnummer | **niemand** rechtstreeks — enkel de server |
| `rounds/{id}` | ronde + banklijst | iedereen die ingelogd is |
| `rounds/{id}/matches/{id}` | veld, teams, score, wie klaar is | iedereen die ingelogd is |
| `connections/{to}__{from}` | wie voegde wie toe | de twee betrokkenen + crew |
| `pins/{pincode}` | pincode → speler | enkel de server |
| `pairs/{a}__{b}` | hoe vaak twee mensen al samen speelden | enkel de crew |

Telefoonnummers worden nooit via een listener uitgestuurd. De app vraagt ze op met
`player.contacts`, die alleen de nummers teruggeeft van mensen die jíj hebt toegevoegd.

Profielfoto's worden client-side bijgesneden tot 320 px en als JPEG-dataURL opgeslagen
(±25 kB). Geen Storage-bucket, geen CORS, geen uploadlogica. Bij veel meer dan ~100
spelers is het wel het overwegen waard om ze naar Firebase Storage te verhuizen.

---

## Beveiliging — eerlijk gezegd

Een pincode van vier cijfers is geen wachtwoord. Dat is een bewuste afweging voor een
eendagsevenement waar mensen met natte handen op een telefoon staan te tikken, maar het
betekent wel iets:

- Pincodes zijn uniek binnen het event; `register` weigert een dubbele.
- De meest voorspelbare codes (`0000`, `1234`, …) worden geweigerd.
- Inlogpogingen zijn gelimiteerd per IP (`server/utils/auth.ts`). Op Vercel is dat
  per instance, dus het vertraagt een aanvaller eerder dan dat het hem tegenhoudt.
- Een geslaagde login levert een Firebase custom token op; vanaf dan gelden de
  Firestore rules.
- Wie een pincode raadt, ziet het profiel van die persoon en kan in zijn naam
  connecteren. Er staat geen betaalinformatie of iets gevoeligers in de app, en na
  30 dagen is alles gewist.

Voor een event met meer op het spel: vervang de pincode door een magic link per sms.

---

## Privacy

`/privacy` bevat de volledige verklaring (AVG/GDPR). **Voor het event aanpassen:**
bovenaan `app/pages/privacy.vue` staat een `ORGANISER`-blok met de naam, het
e-mailadres en de bewaartermijn — vul daar de echte gegevens van de organisatie in.

Kort: naam, foto, leeftijd, niveau, hobby's en speelmomenten zijn zichtbaar voor alle
deelnemers; het telefoonnummer alleen voor wie jij zelf toevoegt; de crew ziet de
volledige lijst; alles wordt na 30 dagen gewist en spelers kunnen zichzelf op elk moment
verwijderen via *Jij → Mijn gegevens wissen*.

---

## Scripts

```bash
npm run dev         # dev server
npm run build       # productie build
npm run preview     # build lokaal draaien
npm run typecheck   # vue-tsc
```
