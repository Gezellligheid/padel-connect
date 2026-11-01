<script setup lang="ts">
useHead({ title: 'Privacyverklaring — Padel Connect' })

/** TODO voor de organisatie: vul de echte entiteit en contactgegevens in. */
const ORGANISER = {
  name: 'Padel Connect',
  email: 'gilles.cousaert@outlook.com',
  retentionDays: 30,
}

const SECTIONS = [
  {
    icon: 'info',
    title: 'Wie verwerkt je gegevens?',
    body: [
      `${ORGANISER.name} organiseert dit evenement en is verantwoordelijk voor de verwerking van je gegevens in deze app. Vragen of klachten? Mail naar ${ORGANISER.email}.`,
    ],
  },
  {
    icon: 'user',
    title: 'Welke gegevens vragen we?',
    list: [
      ['Je naam', 'zodat medespelers weten wie je bent op het veld.'],
      ['Je profielfoto', 'optioneel — enkel om je te herkennen tussen 50 anderen.'],
      ['Je leeftijd', 'optioneel, je mag deze stap overslaan.'],
      ['Je telefoonnummer', 'zodat mensen die jij toevoegt achteraf contact kunnen opnemen.'],
      ['Je pincode', 'je enige inlogmiddel voor deze app.'],
      ['Je niveau, hobby\'s en speelmomenten', 'de basis waarop we je aan andere spelers koppelen.'],
      ['Je matchgeschiedenis en connecties', 'om elke ronde nieuwe combinaties te kunnen maken.'],
    ],
  },
  {
    icon: 'eye',
    title: 'Wie ziet wat?',
    list: [
      ['Alle deelnemers', 'zien je naam, foto, leeftijd, niveau, hobby\'s en speelmomenten.'],
      ['Enkel wie jij toevoegt', 'ziet je telefoonnummer. Niemand anders — ook niet de mensen die jou toevoegen zonder dat jij hen terug toevoegt.'],
      ['De crew van het evenement', 'ziet de volledige deelnemerslijst inclusief telefoonnummers, om de dag praktisch te organiseren.'],
      ['Niemand', 'ziet je pincode. Die wordt nooit aan andere deelnemers getoond.'],
    ],
  },
  {
    icon: 'bolt',
    title: 'Waarom mogen we dit doen?',
    body: [
      'We verwerken deze gegevens op basis van jouw toestemming (artikel 6.1.a AVG), die je geeft op het einde van de inschrijving. Je kan die toestemming op elk moment intrekken door je gegevens te wissen in de app of door ons te mailen.',
      'Zonder naam, pincode en speelmomenten kunnen we je niet indelen in een match — die drie zijn dus noodzakelijk om mee te spelen. Foto, leeftijd, hobby\'s en een bio zijn volledig optioneel.',
    ],
  },
  {
    icon: 'clock',
    title: 'Hoe lang houden we het bij?',
    body: [
      `Alle persoonsgegevens worden uiterlijk ${ORGANISER.retentionDays} dagen na het evenement definitief verwijderd. Wil je eerder weg? Ga naar Jij → Mijn gegevens wissen. Dat is onmiddellijk en onomkeerbaar.`,
      'Na afloop kan de organisatie wel geanonimiseerde statistieken bijhouden (bijvoorbeeld "er werden 180 connecties gelegd"). Daar staat geen enkel persoonsgegeven meer in.',
    ],
  },
  {
    icon: 'lock',
    title: 'Hoe veilig is dit?',
    body: [
      'Je gegevens staan bij Google Firebase (Firestore), binnen de Europese Economische Ruimte, en worden versleuteld verstuurd en opgeslagen. Telefoonnummers staan apart van de publieke profielen en worden enkel vrijgegeven aan mensen die jij hebt toegevoegd.',
      'Wees je er wel van bewust: een pincode van vier cijfers is bewust laagdrempelig gekozen voor een eendagsevenement, en is dus géén sterk wachtwoord. Gebruik hem nergens anders, en deel hem met niemand.',
    ],
  },
  {
    icon: 'shield',
    title: 'Jouw rechten',
    body: [
      'Je hebt het recht om je gegevens in te kijken, te verbeteren, te laten wissen of over te laten dragen, en om bezwaar te maken tegen de verwerking. Inkijken en verbeteren kan rechtstreeks in de app onder "Jij". Voor de rest volstaat een mail.',
      `Ben je niet tevreden met hoe we het aanpakken? Je kan altijd klacht indienen bij de Gegevensbeschermingsautoriteit (gegevensbeschermingsautoriteit.be) of via ${ORGANISER.email}.`,
    ],
  },
  {
    icon: 'x',
    title: 'Wat we níet doen',
    list: [
      ['Geen reclame', 'we verkopen of verhuren je gegevens aan niemand.'],
      ['Geen tracking', 'er staan geen analytics- of advertentiecookies in deze app.'],
      ['Geen profilering', 'de matchmaking gebruikt enkel wat je zelf invulde, en neemt geen beslissingen met rechtsgevolgen.'],
    ],
  },
]
</script>

<template>
  <main class="mx-auto max-w-2xl px-5 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
    <header class="flex items-center justify-between">
      <button type="button" class="flex items-center gap-1.5 text-sm font-semibold text-cream/55 transition-colors hover:text-cream" @click="$router.back()">
        <PcIcon name="arrowLeft" :size="17" />Terug
      </button>
      <BrandMark variant="word" size="sm" />
    </header>

    <section class="mt-10">
      <span class="pc-label">Laatst bijgewerkt op 1 november 2026</span>
      <h1 class="mt-2 font-display text-[2.6rem] leading-[0.95] text-cream sm:text-5xl">
        Privacy&shy;verklaring
      </h1>
      <p class="mt-4 text-[0.98rem] leading-relaxed text-cream/70">
        Deze app bestaat om mensen aan elkaar te koppelen, en dat lukt niet zonder een paar gegevens van jou.
        Hieronder staat precies welke, waarom, wie ze ziet en hoe je ze weer weg krijgt. Kort en zonder juridisch gewauwel.
      </p>
    </section>

    <section class="pc-stagger mt-10 space-y-4">
      <article v-for="section in SECTIONS" :key="section.title" class="pc-card p-5">
        <div class="flex items-center gap-2.5">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-lime-400/12 text-lime-300">
            <PcIcon :name="section.icon" :size="18" />
          </span>
          <h2 class="font-display text-xl text-cream">
            {{ section.title }}
          </h2>
        </div>

        <div v-if="section.body" class="mt-3 space-y-2.5">
          <p v-for="(paragraph, i) in section.body" :key="i" class="text-[0.9rem] leading-relaxed text-cream/70">
            {{ paragraph }}
          </p>
        </div>

        <ul v-if="section.list" class="mt-3 space-y-2.5">
          <li v-for="([term, explanation]) in section.list" :key="term" class="flex gap-2.5 text-[0.9rem] leading-relaxed">
            <PcIcon name="check" :size="16" class="mt-1 shrink-0 text-lime-400" />
            <span class="text-cream/70"><strong class="font-semibold text-cream">{{ term }}</strong> — {{ explanation }}</span>
          </li>
        </ul>
      </article>
    </section>

    <footer class="mt-10 rounded-2xl border border-cream/12 bg-cream/[0.04] p-5 text-center">
      <p class="text-[0.88rem] text-cream/65">
        Nog een vraag over je gegevens?
      </p>
      <a :href="`mailto:${ORGANISER.email}`" class="mt-1 inline-block font-display text-lg text-lime-300 underline-offset-4 hover:underline">
        {{ ORGANISER.email }}
      </a>
    </footer>
  </main>
</template>
