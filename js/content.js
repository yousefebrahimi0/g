/* =====================================================================
   GreenRah pitch: ALL EDITABLE COPY LIVES IN THIS FILE
   ---------------------------------------------------------------------
   Edit text here. You never need to touch app.js or styles.css to change
   words, numbers, placeholders, or speaker notes.

   Formatting inside strings:
     {ph:key}     inserts GR_CONTENT.placeholders[key]
                  A value that starts with "[" renders as a highlighted
                  placeholder (hot colour). Replace it with real text and
                  it renders as normal copy.
     [[words]]    highlights words in the cool brand colour.

   Voice rules: plain, short sentences, no em dashes, no hype words,
   no invented numbers.
   ===================================================================== */
window.GR_CONTENT = {

  /* ------------------------------------------------------------------
     1. PLACEHOLDERS: fill these in one place.
     ------------------------------------------------------------------ */
  placeholders: {
    investmentAsk: 'We need investment to grow and improve.',
    useOfFunds: 'Marketing and hiring, so the team can grow.',
    contactEmail: 'contact@greenrah.com',
    dateIphone: 'Dec 2026',
    dateLanguages: 'Jan 2027',
    dateCities: 'Feb 2027'
  },

  /* ------------------------------------------------------------------
     2. WHY NOW STATS (slide 3)
     A stat only counts up on screen when BOTH value and source are set.
     Until then the placeholder text shows. Figures come from
     "Verified GreenRah Climate and User-Need Statistics" (Sept 2026).
     Keep the geography in the label exactly as the source states it.
     ------------------------------------------------------------------ */
  stats: {
    heat: {
      value: 66, prefix: '', suffix: '', label: 'days of strong heat stress, summer 2024. Usual: 29.',
      source: 'Copernicus, SOTC 2024',
      placeholder: '[ADD: heatwave stat + source]'
    },
    deaths: {
      value: 62775, prefix: '', suffix: '', label: 'estimated heat-related deaths in Europe in 2024, 32 countries',
      source: 'Peer-reviewed estimate',
      placeholder: '[ADD: heat deaths stat + source]'
    },
    ageing: {
      value: 22, prefix: '', suffix: '%', label: 'of EU residents are 65 or older. More than 1 in 5.',
      source: 'Eurostat, 1 January 2025',
      placeholder: '[ADD: 65+ population stat + source]'
    },
    tourism: {
      value: 31, prefix: '', suffix: '%', label: 'of EU tourism nights were in July and August 2024',
      source: 'Eurostat',
      placeholder: '[ADD: tourism stat + source]'
    }
  },

  /* ------------------------------------------------------------------
     3. GLOBAL COPY
     ------------------------------------------------------------------ */
  meta: {
    brand: 'GreenRah',
    tagline: 'The cooler way',
    legal: 'Greenrah OÜ',
    registry: 'Registry code 17586990',
    country: 'Tallinn, Estonia',
    website: 'greenrah.com',
    appUrl: 'https://greenrah.app',
    appUrlLabel: 'greenrah.app',
    qrUrl: 'https://greenrah.com/?utm_source=file&utm_medium=pitch&utm_campaign=barcode',
    illustration: 'Illustration',
    deckTitle: 'GreenRah: The cooler way. Pitch'
  },

  /* ------------------------------------------------------------------
     4. SLIDES (order = presentation order)
     Each slide: id (do not change), copy fields, notes (speaker notes).
     ------------------------------------------------------------------ */
  slides: [

    /* 1 --------------------------------------------------------------- */
    {
      id: 'title',
      title: 'The cooler way',
      body: 'A free walking app for hot cities. It finds the street that stays in the shade.',
      footer: 'Live on the web and Android · greenrah.com',
      sunLabel: 'Lisbon, July',
      notes: 'Hello, I am Yousef, founder of GreenRah. GreenRah is a free walking app for hot cities. In a European summer, the shortest street is often the one that bakes you in the sun. GreenRah finds the street that stays in the shade. It is live today on the web at greenrah.com/app and on Android. The shadows behind me move with the real sun over Lisbon in July. That is the whole idea: shade moves, so your route should move with it. Our tagline says it simply: The cooler way.'
    },

    /* 2 --------------------------------------------------------------- */
    {
      id: 'problem',
      kicker: 'The problem',
      title: 'The shortest walk is often the hottest.',
      body: 'Maps send you the shortest way. On a hot European street at 14:00, that can mean full sun, steep hills, and no relief.',
      routeLabel: 'Usual map route: main roads',
      clockLabel: 'Lisbon, July',
      heatLabel: 'Heating up',
      notes: 'Think about the last time you crossed a city at two in the afternoon in July. Your map gave you the shortest route. It did not ask whether that street had any shade, or whether it climbed a hill in full sun. On screen, the same route heats up as the morning turns into early afternoon. Nothing about the route changed. The heat did. Maps optimise for minutes. People feel degrees. For seniors, parents with strollers, and visitors who do not know the streets, that gap is more than discomfort.'
    },

    /* 3 --------------------------------------------------------------- */
    {
      id: 'whynow',
      kicker: 'Why now',
      title: 'Four pressures, one street.',
      cards: [
        { icon: 'temperature', title: 'Hotter summers', text: 'Strong heat stress days more than doubled.', stat: 'heat' },
        { icon: 'heartbeat', title: 'Heat costs lives', text: 'Heat is a health risk, not only discomfort.', stat: 'deaths' },
        { icon: 'old', title: 'An older Europe', text: 'Heat-aware, lower effort walks matter more.', stat: 'ageing' },
        { icon: 'luggage', title: 'Summer tourism', text: 'Almost a third of EU tourist nights fall in July and August.', stat: 'tourism' }
      ],
      notes: 'Four things are happening at once. In summer 2024, southeastern Europe had 66 days of strong heat stress, more than twice the usual 29, according to Copernicus. Heat costs lives: a peer-reviewed estimate puts heat-related deaths in Europe in 2024 at 62,775 across 32 countries. Europe is ageing: 22 percent of EU residents are 65 or older. And summer is when people walk: 31 percent of EU tourist nights fall in July and August, and 89.1 percent of surveyed Lisbon tourists walked. Lisbon is projected to see almost 10 days a year above 35 degrees this century.'
    },

    /* 4 --------------------------------------------------------------- */
    {
      id: 'solution',
      kicker: 'The solution',
      title: 'GreenRah picks the cooler street.',
      body: 'Same start, same end. GreenRah compares walks and recommends the one with the [[lowest predicted heat stress]].',
      legendFast: 'Fastest: main roads, in the sun',
      legendCool: 'Cooler: shaded side streets',
      start: 'Start',
      end: 'End',
      time: 16.5,
      notes: 'Here is the core idea in one picture. Same start, same end. The amber line is the fastest walk. It takes the wide main roads: direct, but in full sun. The green line is the cooler walk. It follows narrow side streets where buildings cast shade at this hour. GreenRah compares the options and recommends the one with the lowest predicted heat stress. We still show the fastest walk, so you can see the trade-off. If asked about the science: MIT Senseable City Lab found a shaded route about 1.3 percent longer with 8.8 percent less direct sun.'
    },

    /* 5 --------------------------------------------------------------- */
    {
      id: 'engine',
      kicker: 'How it works',
      title: 'The Thermal Comfort Engine',
      body: 'Six live signals. One comfort score. One route.',
      signals: [
        { icon: 'temperature', title: 'Live weather', text: 'Temperature, humidity, wind, UV' },
        { icon: 'sun', title: 'Solar position', text: 'Sun angle and time of day' },
        { icon: 'building', title: 'Building shadows', text: '3D shade on the street' },
        { icon: 'mountain', title: 'Elevation and slope', text: 'Hills and walking effort' },
        { icon: 'route', title: 'Walkable network', text: 'Paths, crossings, streets' }
      ],
      engine: { title: 'Thermal Comfort Engine', text: 'Signal 6: turns it all into one score' },
      outputs: [
        { icon: 'gauge', title: 'Comfort score' },
        { icon: 'walk', title: 'Your cooler route' }
      ],
      footer: 'Shade, heat, and hills, [[planned together]].',
      notes: 'Under the hood is the Thermal Comfort Engine. It combines six signals. Live weather: temperature, humidity, wind, and UV. The position of the sun for your date and time. Building shadows from 3D shapes, so we know which side of a street is shaded. Elevation and slope, because a hill in the sun is harder than a flat street. The walkable network: paths, crossings, and streets. And the engine itself, which turns all of that into one comfort score and a route. Google Maps plans for time. We plan shade, heat, and hills together.'
    },

    /* 6 --------------------------------------------------------------- */
    {
      id: 'heatsmart',
      kicker: 'Heat Smart',
      title: 'Shade moves. So does your route.',
      body: 'The cooler street at 09:00 is not the cooler street at 16:30. GreenRah plans for the hour you walk.',
      sliderLabel: 'Time of day',
      presets: [
        { time: 9, label: 'Morning' },
        { time: 13, label: 'Midday' },
        { time: 16.5, label: 'Afternoon' }
      ],
      sunPhrases: { morning: 'Sun in the east', midday: 'Sun high, short shadows', afternoon: 'Sun in the west', evening: 'Low evening sun' },
      legendCool: 'Recommended cooler walk',
      legendFast: 'Fastest walk',
      legendShade: 'Shade',
      caption: 'Illustration. Simplified streets, real sun angles for Lisbon in July.',
      notes: 'This is the part people remember: shade moves. The map uses simplified streets but real sun angles for Lisbon in July. At nine, the sun is in the east and one set of side streets is shaded. At one, shadows are short and there is little shade anywhere. By half past four, the sun is in the west and a different street becomes the cooler one. The main roads stay in the sun almost all day. GreenRah plans for the hour you will walk, not the hour you open the app. You can drag the slider live if someone asks. No percentages here, on purpose.'
    },

    /* 7 --------------------------------------------------------------- */
    {
      id: 'accessible',
      kicker: 'Accessible',
      title: 'A gentler way, still in the shade.',
      body: 'Stairs and steep hills drop out. A milder path appears, still with shade. For seniors, strollers, and tired legs.',
      tabHeat: 'Heat Smart',
      tabAccess: 'Accessible',
      legendStairs: 'Stairs',
      legendSteep: 'Steep hill',
      legendAccess: 'Gentler path',
      caption: 'Illustration. Simplified streets.',
      notes: 'Heat is not the only problem. For a senior, a parent with a stroller, or someone using a wheelchair, stairs and steep hills can make a route impossible. Switch to Accessible, and GreenRah avoids stairs and prefers milder slopes, while still looking for shade. On screen, the stairs and the steep block drop out, and a gentler path appears in blue. It may not be the shortest, but it is a walk people can actually take. Accessible works across EU countries and Great Britain, the same as Heat Smart.'
    },

    /* 8 --------------------------------------------------------------- */
    {
      id: 'planning',
      kicker: 'Planning',
      title: 'Plan a cooler walk in seconds.',
      features: [
        { icon: 'map-pin', title: 'Plan', text: 'Search, locate, or tap the map' },
        { icon: 'calendar', title: 'Now or later', text: 'Shade moves, so pick the hour' },
        { icon: 'gauge', title: 'Walk score', text: 'One simple comfort read' },
        { icon: 'droplet', title: 'Water and toilets', text: 'Drinking water and toilets on the map' },
        { icon: 'share', title: 'Share', text: 'Trip links, not indexed in search' },
        { icon: 'user', title: 'Accounts', text: 'A week as guest, longer signed in' },
        { icon: 'language', title: 'Two languages', text: 'English and European Portuguese' },
        { icon: 'map-2', title: 'Open maps', text: 'Open map and satellite sources' }
      ],
      notes: 'Planning is simple. Search a place, use your location, or tap the map, and swap start and end in one tap. Pick now or later, because shade at nine is not shade at five. Each route gets a walk score: one simple comfort read, not a pile of weather numbers. The map shows drinking water and public toilets, which matter in summer. You can share a trip link, and those links are not indexed in search. Guests plan about a week ahead; signed in accounts get a longer window. English and European Portuguese today.'
    },

    /* 9 --------------------------------------------------------------- */
    {
      id: 'platforms',
      kicker: 'Web and Android',
      title: 'Live on the web and Android.',
      body: 'The same Heat Smart and Accessible walks, on a laptop or in your pocket.',
      screenWeb: 'assets/screen-web.webp',
      screenWebAlt: 'GreenRah web app: a Heat Smart walk from Jardim da Estrela to Praça do Comércio in Lisbon',
      screenPhone: 'assets/screen-android.webp',
      screenPhoneAlt: 'GreenRah on a phone: route options with walk score, share, and a public toilet on the path',
      chips: [
        { icon: 'world', label: 'Web', status: 'Live now', note: 'greenrah.com/app', live: true },
        { icon: 'brand-android', label: 'Android', status: 'Live now', note: 'Google Play', live: true },
        { icon: 'brand-apple', label: 'iPhone', status: 'Planned', note: '', live: false }
      ],
      caption: 'Screens from the live product. Lisbon, 14:00.',
      notes: 'GreenRah is live, not a concept. On a laptop, the map is at greenrah.com/app. In your pocket, the Android app is on Google Play, with the same Heat Smart and Accessible modes. An iPhone app is planned. The screens are from the live product: walks from Jardim da Estrela in Lisbon at two in the afternoon, with a walk score, a share button, and a public toilet along the path. Everything is free. There is no paywall on the walk.'
    },

    /* 10 -------------------------------------------------------------- */
    {
      id: 'audience',
      kicker: 'Who it is for',
      title: 'Built for people who walk in the heat.',
      personas: [
        { icon: 'walk', title: 'Walkers', text: 'Daily trips in the heat' },
        { icon: 'luggage', title: 'Tourists', text: 'Unfamiliar streets in summer' },
        { icon: 'old', title: 'Seniors', text: 'Shade and milder slopes' },
        { icon: 'baby-carriage', title: 'Parents', text: 'Strollers, no stairs' }
      ],
      mapTitle: 'Lisbon first. Europe next.',
      mapLegend: 'Works in EU countries and Great Britain',
      lisbonLabel: 'Lisbon',
      notes: 'Who is this for? Walkers doing daily trips in the heat. Tourists on unfamiliar streets in summer. Seniors, who need shade and milder slopes. Parents with strollers, who need a path without stairs. Lisbon is the first city our story is built around: hilly, sunny, and full of visitors. The product already works across EU countries and Great Britain, highlighted on the map. The app works only inside that area today. Europe is the aim.'
    },

    /* 11 -------------------------------------------------------------- */
    {
      id: 'different',
      kicker: 'Why GreenRah',
      title: 'Why GreenRah is different',
      columns: ['GreenRah', 'Google Maps', 'ShadeMap', 'Weather apps'],
      // values: 'yes' | 'no' | any other text (shown as a small grey chip)
      rows: [
        { label: 'Gives you a walking route', values: ['yes', 'yes', 'no', 'no'] },
        { label: 'Chooses streets by shade at your hour', values: ['yes', 'no', 'Shade map only', 'no'] },
        { label: 'Uses heat stress in the route choice', values: ['yes', 'no', 'no', 'Heat info only'] },
        { label: 'Gentler path: no stairs, milder slopes, with shade', values: ['yes', 'no', 'no', 'no'] },
        { label: 'Free to use', values: ['yes', 'yes', 'yes', 'yes'] }
      ],
      footnote: 'Based on public features, September 2026.',
      notes: 'How is this different? Google Maps is excellent at getting you somewhere fast, but it does not choose streets by shade at your hour, or weigh heat stress. ShadeMap is a lovely tool that shows where shadows fall at any hour, but it does not plan a walk for you. Weather apps tell you it is hot, but give no route. GreenRah combines the route, the shade, and the heat, and adds a gentler path without stairs. This table is based on public features as of September 2026.'
    },

    /* 12 -------------------------------------------------------------- */
    {
      id: 'traction',
      kicker: 'Traction and coverage',
      title: 'Where we are today',
      facts: [
        { icon: 'circle-check', value: 'Live', label: 'Web and Android' },
        { icon: 'world', value: 'EU + GB', label: 'Heat Smart and Accessible coverage' },
        { icon: 'language', count: 2, label: 'Languages: English, European Portuguese' },
        { icon: 'device-mobile', count: 2, label: 'Platforms. iPhone planned' }
      ],
      coverageTitle: 'Coverage today',
      coverage: [
        { icon: 'map-2', count: 28, label: 'countries: the 27 EU countries and Great Britain' },
        { icon: 'building-community', count: 2000, suffix: '+', label: 'cities with walking maps' }
      ],
      event: 'Web Summit 2026, Lisbon: ALPHA startup, 10 to 12 November',
      notes: 'Where are we today? GreenRah is live on the web and on Android. Heat Smart and Accessible routing cover EU countries and Great Britain: that is 28 countries and more than 2,000 cities with walking maps. Shade detail is richest in Lisbon and Coimbra, and we keep rebuilding it city by city with open building data. Two languages, English and European Portuguese. Two platforms, with iPhone planned. In November we are at Web Summit in Lisbon as an ALPHA startup, from the tenth to the twelfth. Come and find us.'
    },

    /* 13 -------------------------------------------------------------- */
    {
      id: 'cities',
      kicker: 'For cities and partners',
      title: 'See where shade is missing.',
      body: 'A separate city view, already running for Lisbon. It turns anonymous walks into street level evidence.',
      insights: [
        { icon: 'route', text: 'Cool-path share, and how it shifts on heatwave days' },
        { icon: 'sun', text: 'Shade and heat stress on the streets people walk' },
        { icon: 'clock', text: 'Walks by parish and hour of the day' },
        { icon: 'droplet', text: 'Walks far from water, green space, or bike share' },
        { icon: 'shield-check', text: 'Aggregates only: groups of 15 or more, no raw traces' }
      ],
      useCases: [
        { icon: 'trees', label: 'Tree planting priorities' },
        { icon: 'temperature', label: 'Heat action plans' },
        { icon: 'wheelchair', label: 'Accessible routes' },
        { icon: 'luggage', label: 'Tourism' }
      ],
      legendLow: 'Enough shade',
      legendHigh: 'Shade missing',
      caption: 'Illustration over Lisbon parishes. Not real city data.',
      notes: 'The same technology helps cities. The city view already runs for Lisbon, separate from the public app. From consented, anonymous walks it shows how often people pick the cooler path, and whether that rises on heatwave days. It shows shade and heat stress on the corridors people use, walks by parish and hour, and trips far from drinking water, green space, or bike share. That tells teams where to plant trees, add water, or fix a route first. Data is aggregated in groups of at least 15 people, and we never sell raw traces. The grid here is an illustration.'
    },

    /* 14 -------------------------------------------------------------- */
    {
      id: 'model',
      kicker: 'Business model and roadmap',
      title: 'Free to walk. Paid for insight.',
      plans: [
        { icon: 'walk', price: 'Free', name: 'Every walk', text: 'For everyone. No paywall on routes.', status: 'Live', live: true },
        { icon: 'heartbeat', price: '€1.99 / month', name: 'Premium', text: 'Optional health features for walkers.', status: 'Planned', live: false },
        { icon: 'building-bank', price: '€6,000 / year', name: 'City licence', text: 'Per city. The city view for municipalities and public decision makers.', status: 'Pilot ready', live: false }
      ],
      timeline: [
        { label: 'Now', title: 'Web and Android live', when: 'EU + GB' },
        { label: 'Next', title: 'iPhone app', when: '{ph:dateIphone}' },
        { label: 'Then', title: 'More languages', when: 'Spanish, Italian, more · {ph:dateLanguages}' },
        { label: 'Then', title: 'More city launches', when: '{ph:dateCities}' }
      ],
      notes: 'How does GreenRah make money? The walk stays free for everyone. That is the promise, and it is how we grow. On top of that come two paid layers. Premium, at 1.99 euros a month, adds optional health features for walkers who want them. A city licence, at 6,000 euros per year per city, gives municipalities the city view. It is built and running for Lisbon, and it grows more useful as walk volume grows. Next: the iPhone app in December 2026, Spanish and Italian in January 2027, and more city launches in February 2027.'
    },

    /* 15 -------------------------------------------------------------- */
    {
      id: 'contact',
      kicker: 'Team, ask, contact',
      title: 'Walk with us.',
      team: [
        { name: 'Yousef Ebrahimi', role: 'Founder and Product Lead', initials: 'YE', photo: 'assets/yousef-320.jpg' }
      ],
      askTitle: 'The ask',
      ask: '{ph:investmentAsk}',
      useOfFunds: '{ph:useOfFunds}',
      partnersTitle: 'Partners',
      partners: 'Cities, tourism and health partners: let us run a pilot together.',
      contactTitle: 'Contact',
      email: '{ph:contactEmail}',
      
      closing: 'The best path is not the fastest. It is the coolest.',
      notes: 'I am Yousef Ebrahimi, founder and product lead of GreenRah. We are raising investment to grow: to improve the product, to fund marketing, and to hire so the team can grow. We are looking for three kinds of partners. Investors who see heat adaptation as everyday infrastructure. Cities and public bodies who want to pilot the city view. And tourism and health partners who want their visitors and patients to walk safer in summer. Scan the code to open GreenRah on your phone right now. GreenRah is built by Greenrah OÜ in Estonia. Thank you. The best path is not the fastest. It is the coolest.'
    }
  ],

  /* ------------------------------------------------------------------
     5. UI STRINGS (help overlay, presenter view, toasts)
     ------------------------------------------------------------------ */
  ui: {
    helpTitle: 'Keyboard shortcuts',
    shortcuts: [
      ['Next', 'Right, Down, Space, Page Down, Enter, click right side'],
      ['Previous', 'Left, Up, Page Up, click left side'],
      ['First / last slide', 'Home / End'],
      ['Jump to slide', 'Type a number, then Enter'],
      ['Overview', 'O'],
      ['Fullscreen', 'F'],
      ['Dark / light theme', 'T'],
      ['Reduce motion', 'M'],
      ['Presenter view', 'S'],
      ['Black screen', 'B or .'],
      ['This help', 'H or ?'],
      ['Close overlays', 'Esc']
    ],
    presenterTitle: 'Presenter view',
    presenterNext: 'Next slide',
    presenterNotes: 'Speaker notes',
    presenterStepsLeft: 'more reveals on this slide',
    presenterEnd: 'End of deck',
    popupBlocked: 'Allow pop-ups to open the presenter view',
    themeDark: 'Dark theme',
    themeLight: 'Light theme',
    motionOn: 'Reduced motion on',
    motionOff: 'Reduced motion off'
  }
};
