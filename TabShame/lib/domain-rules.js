/*
 * domain-rules.js
 *
 * Data definitions for all 24 archetypes. The archetype engine reads this file
 * and evaluates rules generically — adding a 25th archetype is a single entry
 * here, not a code change.
 *
 * Rule types supported (see archetype-engine.js for evaluation):
 *   - domainCount:    { type, domain, min }                  e.g. 5+ tabs on linkedin.com
 *   - domainsAnyCount:{ type, domains: [...], min }          e.g. 6+ tabs across dribbble/behance/mobbin
 *   - duplicateUrl:   { type, min }                          e.g. same URL appears 4+ times
 *   - localhostCount: { type, min }                          e.g. 8+ localhost:* tabs
 *   - titleContains:  { type, domain, needle, min }          e.g. Figma tabs whose title contains "FINAL"
 *   - oldestAgeDays:  { type, min }                          e.g. oldest tab is 30+ days old
 *   - tabCount:       { type, min }                          e.g. 250+ total tabs
 *   - timeOfDayHours: { type, between: [startH, endH] }      e.g. between 1am and 5am, used as a modifier
 *
 * priority: higher numbers win when multiple archetypes match. Use sparingly —
 * rarer / more specific archetypes get higher priority so they don't get
 * drowned out by catch-alls like Tab Maximalist.
 *
 * vars: each rule can declare named exports that the template engine can
 * interpolate (e.g. linkedinCount → ${linkedinCount}). Variables are computed
 * automatically from rule matches; see archetype-engine.js → computeVars().
 *
 * Roast tone: warm, friendly teasing. Re-read CORE TONE in the brief before
 * editing templates. Never mean. Factual observation + soft punchline.
 */

(function () {
  const ARCHETYPES = [
    // ─────────────────────────────────────────────────────────────────────
    // DEV / TECH
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "phantom_researcher",
      name: "The Phantom Researcher",
      emoji: "👻",
      category: "dev",
      description: "You open productivity tabs the way some people light candles. Symbolically.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "notion.so", "todoist.com", "asana.com", "linear.app",
            "trello.com", "clickup.com", "monday.com", "obsidian.md",
            "evernote.com", "things.com"
          ],
          min: 5,
          var: "productivityCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${productivityCount} productivity tabs open. Tasks completed today: probably the one where you opened these tabs. We see you, bestie.",
        "You have ${productivityCount} productivity apps fighting for your attention. That's not a system — that's a support group.",
        "${productivityCount} tabs about getting things done. Things actually done: TBD. We're rooting for you."
      ]
    },
    {
      archetypeId: "stack_overflow_necromancer",
      name: "The Stack Overflow Necromancer",
      emoji: "🪦",
      category: "dev",
      description: "You keep summoning the same answers from the dead, hoping they'll be different this time.",
      rules: [
        { type: "duplicateUrl", min: 5, scopeDomain: "stackoverflow.com", var: "soDuplicates" }
      ],
      priority: 8,
      roastTemplates: [
        "The same Stack Overflow question is open ${soDuplicates} times. The answer hasn't changed, friend.",
        "${soDuplicates} duplicate Stack Overflow tabs. The accepted answer is still the accepted answer. We promise.",
        "You opened the same SO thread ${soDuplicates} times today. The undead can sense your pain."
      ]
    },
    {
      archetypeId: "localhost_shrine",
      name: "The localhost Shrine",
      emoji: "🛕",
      category: "dev",
      description: "An altar to dev servers, most of which haven't been running since Tuesday.",
      rules: [
        { type: "localhostCount", min: 5, var: "localhostCount" }
      ],
      priority: 7,
      roastTemplates: [
        "${localhostCount} localhost ports open. How many servers are actually running? Bold of you to ask.",
        "${localhostCount} localhost tabs. This is what archaeologists will find: little dev-server monuments to forgotten side projects.",
        "${localhostCount} localhost shrines, lit. Half of them 502'd before lunch. The other half you forgot about."
      ]
    },
    {
      archetypeId: "github_pr_spectator",
      name: "The GitHub PR Spectator",
      emoji: "👀",
      category: "dev",
      description: "Watching pull requests is your full-time job. Reviewing them is not.",
      rules: [
        { type: "domainCount", domain: "github.com", min: 5, urlIncludes: "/pull/", var: "prCount" }
      ],
      priority: 7,
      roastTemplates: [
        "${prCount} GitHub PRs open. Reviewed: 0. Approved with 'LGTM 🚀': 0. The team thanks you for your attention to detail.",
        "${prCount} PR tabs and not a single comment. You're not reviewing — you're spectating.",
        "${prCount} pull requests on display. This is a museum, not a code review."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // DESIGN
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "figma_multiverse",
      name: "The Figma Multiverse",
      emoji: "🌌",
      category: "design",
      description: "Every variant of every design lives in its own tab. None of them are final.",
      rules: [
        { type: "domainCount", domain: "figma.com", min: 5, var: "figmaCount" },
        { type: "titleContains", domain: "figma.com", needle: "FINAL", min: 1, var: "finalCount" }
      ],
      priority: 7,
      roastTemplates: [
        "${figmaCount} Figma tabs. ${finalCount} of them say 'FINAL'. We both know how this ends.",
        "${figmaCount} Figma files open, ${finalCount} named some flavour of 'FINAL'. Babe. Pick one.",
        "Across the Figma multiverse: ${figmaCount} tabs, ${finalCount} marked FINAL. Schrödinger's design system."
      ]
    },
    {
      archetypeId: "inspiration_hoarder",
      name: "The Inspiration Hoarder",
      emoji: "🎨",
      category: "design",
      description: "You have 23 tabs of inspiration and 0 actual designs. The vibe is 'soon'.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "dribbble.com", "behance.net", "mobbin.com", "awwwards.com",
            "siteinspire.com", "designspiration.com", "savee.it", "are.na"
          ],
          min: 5,
          var: "inspoCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${inspoCount} inspiration tabs. Mood-boarded into oblivion. You'll start the actual work… soon.",
        "${inspoCount} tabs of pure aesthetic, zero pixels pushed. The vision is so clear it's blinding you.",
        "${inspoCount} reference tabs. At this point you're not inspired, you're hostage."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // WORK / CAREER
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "linkedin_lurker",
      name: "The LinkedIn Lurker",
      emoji: "💼",
      category: "work",
      description: "You open profiles like books and refresh your own like it's a slot machine.",
      rules: [
        { type: "domainCount", domain: "linkedin.com", min: 5, var: "linkedinCount" }
      ],
      priority: 6,
      roastTemplates: [
        "${linkedinCount} LinkedIn profiles open. We checked — none of them viewed yours back. Sorry, queen.",
        "${linkedinCount} LinkedIn tabs. You have more profiles open than connections you'll make this quarter.",
        "${linkedinCount} LinkedIn tabs. The recruiter ghosted, but you're still here. We respect the persistence."
      ]
    },
    {
      archetypeId: "glassdoor_spiral",
      name: "The Glassdoor Spiral",
      emoji: "🌀",
      category: "work",
      description: "You're researching the company so hard you forgot to apply.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: ["glassdoor.com", "levels.fyi", "blind.com", "teamblind.com", "comparably.com"],
          min: 5,
          var: "glassdoorCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${glassdoorCount} Glassdoor/Blind/Levels tabs. You know their median TC. You haven't applied.",
        "${glassdoorCount} salary-research tabs. You're a forensic accountant for a job you'll never take.",
        "${glassdoorCount} review-site tabs. The vibe is 'should I leave my job?' The answer is always 'soon'."
      ]
    },
    {
      archetypeId: "meeting_multiverse",
      name: "The Meeting Multiverse",
      emoji: "📞",
      category: "work",
      description: "Meet, Zoom, Notion, Slack, Linear — all open simultaneously, none making you happy.",
      rules: [
        {
          type: "domainsAllCount",
          domainGroups: [
            ["meet.google.com", "zoom.us"],
            ["notion.so"],
            ["slack.com"],
            ["linear.app", "asana.com", "jira.com", "atlassian.net"]
          ],
          min: 1,
          var: "meetingMultiverseCount"
        }
      ],
      priority: 8,
      roastTemplates: [
        "Meet + Zoom + Notion + Slack + Linear, all open. This isn't multitasking — this is grief.",
        "You have ${meetingMultiverseCount} meeting-stack tabs open at once. Friend. There is only one of you.",
        "Zoom, Slack, Notion, Linear all live. The synergy is loud. The output is quiet."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // FINANCE
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "bagholder_in_denial",
      name: "The Bagholder in Denial",
      emoji: "📉",
      category: "finance",
      description: "Every tab is a different angle on the same chart. The angle does not help.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "robinhood.com", "wealthsimple.com", "etrade.com", "fidelity.com",
            "schwab.com", "tradingview.com", "finance.yahoo.com",
            "marketwatch.com", "seekingalpha.com", "coinbase.com", "binance.com"
          ],
          min: 5,
          var: "financeCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${financeCount} finance tabs. Refreshing won't change the chart. We promise. Diamond hands optional.",
        "${financeCount} portfolio tabs open. The market is closed. The denial is not.",
        "${financeCount} ticker tabs. You're not investing — you're grieving in real time."
      ]
    },
    {
      archetypeId: "insurance_cross_referencer",
      name: "The Insurance Cross-Referencer",
      emoji: "📋",
      category: "finance",
      description: "Eleven insurance tabs. Eleven nearly identical quotes. One vibe: existential.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "geico.com", "progressive.com", "statefarm.com", "allstate.com",
            "libertymutual.com", "policygenius.com", "thezebra.com",
            "comparethemarket.com", "moneysupermarket.com"
          ],
          min: 5,
          var: "insuranceCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${insuranceCount} insurance tabs. The quotes are within $4 of each other. You will pick the worst one anyway.",
        "${insuranceCount} insurance comparison tabs. The premium is your sanity.",
        "${insuranceCount} insurer tabs cross-referenced. Adulthood is a spreadsheet you didn't ask for."
      ]
    },
    {
      archetypeId: "mortgage_calculator_masochist",
      name: "The Mortgage Calculator Masochist",
      emoji: "🏚️",
      category: "finance",
      description: "Plug in any rate, the answer is still 'no'.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "nerdwallet.com", "bankrate.com", "rocketmortgage.com",
            "zillow.com", "redfin.com", "realtor.com", "mortgagecalculator.org"
          ],
          min: 5,
          urlIncludes: "mortgage",
          var: "mortgageCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${mortgageCount} mortgage calculator tabs. We've run the numbers. You can't afford it. Neither can we.",
        "${mortgageCount} mortgage tabs. The interest rate is the toxic ex you keep texting.",
        "${mortgageCount} calculators. They all say the same thing. Maybe try a smaller dream?"
      ]
    },
    {
      archetypeId: "yield_optimizer",
      name: "The Yield Optimizer",
      emoji: "🏦",
      category: "finance",
      description: "You'll move your $4,200 across HYSAs for 0.05% extra. Respect.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "ally.com", "marcus.com", "discover.com", "sofi.com",
            "wealthfront.com", "bask.com", "americanexpress.com",
            "doctorofcredit.com", "savings.com"
          ],
          min: 5,
          var: "hysaCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${hysaCount} HYSA tabs. Optimizing 0.07% APY on a balance you could fit in a wallet. We love it for you.",
        "${hysaCount} savings comparison tabs. You're going to make $11 more this year. Worth.",
        "${hysaCount} HYSA tabs open. The grind is real, the gains are spiritual."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // SHOPPING
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "comparison_shopper",
      name: "The Comparison Shopper",
      emoji: "🛍️",
      category: "shopping",
      description: "Same item. Six colors. Nine days. Still nothing in the cart.",
      rules: [
        {
          type: "duplicateHostnameWithVariations",
          domains: [
            "amazon.com", "ebay.com", "etsy.com", "uniqlo.com",
            "zara.com", "hm.com", "asos.com", "shopbop.com", "ssense.com"
          ],
          min: 5,
          var: "comparisonCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${comparisonCount} tabs of the same hoodie in different colors. The decision fatigue is the real purchase.",
        "${comparisonCount} variations of the same product open. Just buy the black one. You always do.",
        "${comparisonCount} side-by-sides, zero checkouts. This is research, not shopping. Allegedly."
      ]
    },
    {
      archetypeId: "cart_cemetery",
      name: "The Cart Cemetery",
      emoji: "🛒",
      category: "shopping",
      description: "Nine carts. Eight hundred dollars in items. Zero check-outs. The graveyard is full.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "amazon.com", "etsy.com", "shopify.com", "ebay.com", "ebay.co.uk",
            "asos.com", "shein.com", "uniqlo.com", "ssense.com"
          ],
          min: 5,
          urlIncludes: "cart",
          var: "cartCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${cartCount} active shopping carts. The items have started writing letters home.",
        "${cartCount} carts open across the internet. You're not shopping — you're collecting.",
        "${cartCount} carts. None checked out. They've formed a small civilization without you."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // TRAVEL
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "flight_refresh_addict",
      name: "The Flight Refresh Addict",
      emoji: "✈️",
      category: "travel",
      description: "The price will not drop. We are begging you to stop refreshing.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "google.com/flights", "kayak.com", "skyscanner.com",
            "expedia.com", "momondo.com", "hopper.com", "aa.com",
            "delta.com", "united.com", "ba.com"
          ],
          min: 5,
          urlIncludes: "flight",
          var: "flightCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${flightCount} flight search tabs. The fare is not getting cheaper, friend. The fare has feelings.",
        "${flightCount} flight tabs. Refreshing harder won't summon a deal. (We've tried.)",
        "${flightCount} flight comparison tabs. You will book the first one anyway. We all do."
      ]
    },
    {
      archetypeId: "booking_detective",
      name: "The Booking.com Detective",
      emoji: "🔍",
      category: "travel",
      description: "23 hotels. 412 reviews read. One certainty: you are exhausted.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "booking.com", "hotels.com", "expedia.com", "agoda.com",
            "trivago.com", "airbnb.com", "vrbo.com"
          ],
          min: 5,
          var: "bookingCount"
        }
      ],
      priority: 8,
      roastTemplates: [
        "${bookingCount} hotel tabs. You've read more reviews than the hotel has rooms. Sherlock who?",
        "${bookingCount} Booking.com tabs. You've seen every bathroom in this city. Pick one, detective.",
        "${bookingCount} accommodations open. The trip is in 3 days. The decision is in your dreams."
      ]
    },
    {
      archetypeId: "itinerary_hoarder",
      name: "The Itinerary Hoarder",
      emoji: "🗺️",
      category: "travel",
      description: "Eighteen 'things to do in [city]' tabs. You'll do three of them.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "tripadvisor.com", "lonelyplanet.com", "timeout.com",
            "atlasobscura.com", "culturetrip.com", "thrillist.com",
            "eater.com", "reddit.com"
          ],
          min: 5,
          urlIncludes: "things-to-do",
          var: "itineraryCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${itineraryCount} 'things to do' tabs. You will end up at the cafe near the hotel. Twice.",
        "${itineraryCount} itinerary tabs. The trip is going to be 'I'll figure it out when I get there'. Honest hours.",
        "${itineraryCount} guides open. You're going to do three things and call the rest 'next time'."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // LIFESTYLE CHAOS
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "youtube_rabbit_holer",
      name: "The YouTube Rabbit-Holer",
      emoji: "🐇",
      category: "lifestyle",
      description: "From a pasta recipe to WWII tank treads in 34 tabs. Not even the algorithm understands.",
      rules: [
        { type: "domainCount", domain: "youtube.com", min: 5, var: "youtubeCount" }
      ],
      priority: 7,
      roastTemplates: [
        "${youtubeCount} YouTube tabs. You started with pasta and ended with WWII tank treads. The algorithm is scared.",
        "${youtubeCount} YouTube tabs in a single descent. This isn't watching videos — it's an ethnographic study of yourself.",
        "${youtubeCount} YouTube tabs. None of them have been watched all the way through. You contain multitudes."
      ]
    },
    {
      archetypeId: "eternal_read_later",
      name: "The Eternal Read-Later",
      emoji: "📚",
      category: "lifestyle",
      description: "44 articles waiting. The oldest one is now historical fiction.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "medium.com", "substack.com", "nytimes.com", "newyorker.com",
            "theatlantic.com", "wired.com", "theverge.com", "theguardian.com",
            "longform.org", "longreads.com", "ft.com", "wsj.com"
          ],
          min: 5,
          var: "articleCount"
        },
        { type: "oldestAgeDays", min: 14, var: "oldestDays" }
      ],
      priority: 7,
      roastTemplates: [
        "${articleCount} articles waiting. Oldest tab: ${oldestDays} days old. That article is now a memoir.",
        "${articleCount} 'I'll read this later' tabs. Later was ${oldestDays} days ago. Later isn't coming.",
        "${articleCount} longreads, ${oldestDays}-day-old champion among them. We respect the optimism."
      ]
    },
    {
      archetypeId: "recipe_manifestor",
      name: "The Recipe Manifestor",
      emoji: "🍳",
      category: "lifestyle",
      description: "Twelve recipes, zero cooked, DoorDash on speed dial. The fantasy is the meal.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "allrecipes.com", "bonappetit.com", "seriouseats.com",
            "smittenkitchen.com", "nytimes.com/cooking", "epicurious.com",
            "food52.com", "kingarthurbaking.com", "thekitchn.com",
            "halfbakedharvest.com"
          ],
          min: 5,
          var: "recipeCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${recipeCount} recipe tabs. Meals cooked: probably toast. We support the manifesting.",
        "${recipeCount} recipes open, DoorDash app probably also open. The dream is the dish.",
        "${recipeCount} recipes saved. Ingredients bought: zero. The vision board is the meal."
      ]
    },
    {
      archetypeId: "three_am_webmd",
      name: "The 3am WebMD Patient",
      emoji: "🩺",
      category: "lifestyle",
      description: "Symptoms googled at 3am. Doctor not consulted. We beg you to sleep.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "webmd.com", "mayoclinic.org", "healthline.com", "nih.gov",
            "medlineplus.gov", "drugs.com", "patient.info", "nhs.uk"
          ],
          min: 5,
          var: "medicalCount"
        },
        { type: "timeOfDayHours", between: [1, 5], var: "isLateNight" }
      ],
      priority: 9,
      roastTemplates: [
        "${medicalCount} medical tabs at this hour. It's 3am. You're fine. Probably. Please sleep, friend.",
        "${medicalCount} symptom-checker tabs in the small hours. The diagnosis is anxiety. The cure is bedtime.",
        "${medicalCount} medical tabs. You will not see a doctor. You will, however, finish reading WebMD's entire 'when to worry' page."
      ]
    },
    {
      archetypeId: "zillow_daydreamer",
      name: "The Zillow Daydreamer",
      emoji: "🏡",
      category: "lifestyle",
      description: "Houses in 14 cities you don't live in. The relocation is emotional.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: ["zillow.com", "redfin.com", "realtor.com", "rightmove.co.uk", "zoopla.co.uk", "trulia.com"],
          min: 5,
          var: "zillowCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${zillowCount} Zillow tabs across cities you don't live in. The dream barn in Vermont is calling.",
        "${zillowCount} property tabs. Not moving. Just imagining. We love this for you.",
        "${zillowCount} houses bookmarked emotionally. The mortgage is hypothetical. The longing is not."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // BACKLOG TIER 1 — promoted from the strategy backlog (May 2026)
    // High priority where time-of-day or rare-domain combos drive specificity.
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "three_am_new_parent",
      name: "The 3am New Parent",
      emoji: "👶",
      category: "lifestyle",
      description: "It's 3am. The baby is fine. The rash is normal. We see you, friend.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "babycenter.com", "whattoexpect.com", "thebump.com", "parents.com",
            "healthychildren.org", "kellymom.com", "pampers.com", "huggies.com",
            "mamasource.com", "cafemom.com", "lalecheleague.org", "nct.org.uk"
          ],
          min: 5,
          var: "parentTabs"
        },
        { type: "timeOfDayHours", between: [1, 5], var: "isLateNight" }
      ],
      priority: 9,
      roastTemplates: [
        "${parentTabs} parenting tabs at this hour. The baby is fine. The rash is normal. Close the tabs. Sleep. We beg you.",
        "${parentTabs} baby tabs after midnight. You've out-researched the pediatrician. Now please rest, friend.",
        "${parentTabs} tabs of conflicting baby advice at 3am. Six forums, six answers, one exhausted parent. You're doing great."
      ]
    },
    {
      archetypeId: "midnight_student",
      name: "The 11:47 PM Student",
      emoji: "📝",
      category: "study",
      description: "12 minutes till the deadline. 174 words written. Future you has notes.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "chatgpt.com", "claude.ai", "quillbot.com", "easybib.com",
            "scholar.google.com", "jstor.org", "scribbr.com", "citationmachine.net",
            "grammarly.com", "wikipedia.org", "sparknotes.com", "coursehero.com",
            "chegg.com", "studocu.com", "docs.google.com"
          ],
          min: 5,
          var: "studyTabs"
        },
        { type: "timeOfDayHours", between: [22, 2], var: "isLateNight" }
      ],
      priority: 8,
      roastTemplates: [
        "${studyTabs} research tabs at this hour. The paper is due. The vibes are not. We're rooting for you.",
        "${studyTabs} citation/research/AI tabs after 10pm. 12 minutes left. 174 words written. Future you has thoughts.",
        "${studyTabs} study tabs at midnight. ChatGPT, Quillbot, and EasyBib walk into a deadline. They are losing."
      ]
    },
    {
      archetypeId: "recruiter_black_hole",
      name: "The Recruiter Black Hole",
      emoji: "🕳️",
      category: "work",
      description: "47 LinkedIn profiles. Zero remembered. The candidates blur. The InMails are gone.",
      rules: [
        { type: "domainCount", domain: "linkedin.com", min: 5, var: "linkedinCount" },
        {
          type: "domainsAnyCount",
          domains: [
            "greenhouse.io", "lever.co", "workable.com", "ashbyhq.com",
            "recruiterflow.com", "hireez.com", "calendly.com", "gem.com",
            "myworkdayjobs.com", "smartrecruiters.com", "icims.com"
          ],
          min: 1,
          var: "atsCount"
        }
      ],
      priority: 9,
      roastTemplates: [
        "${linkedinCount} LinkedIn profiles + ${atsCount} ATS tab(s). You've messaged the same person twice this week. They screenshotted both.",
        "${linkedinCount} candidate profiles open. They blur together. You're searching for a 'rockstar ninja unicorn' with 12 years of a 10-year-old framework. Iconic.",
        "${linkedinCount} LinkedIn tabs. The InMail credits hit zero in March. The pipeline is vibes now."
      ]
    },
    {
      archetypeId: "pre_date_detective",
      name: "The Pre-Date Detective",
      emoji: "🕵️",
      category: "lifestyle",
      description: "You know their college roommate's ex's name. The date doesn't know yours.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "whitepages.com", "beenverified.com", "spokeo.com", "peoplefinders.com",
            "truepeoplesearch.com", "fastpeoplesearch.com", "intelius.com",
            "thatsthem.com", "radaris.com"
          ],
          min: 1,
          var: "peopleSearchCount"
        },
        {
          type: "domainsAnyCount",
          domains: ["linkedin.com", "instagram.com", "x.com", "twitter.com", "facebook.com"],
          min: 2,
          var: "socialCount"
        }
      ],
      priority: 9,
      roastTemplates: [
        "${peopleSearchCount} background-check tab(s) + ${socialCount} social profiles. The date is in 2 hours. They don't know you exist yet.",
        "${socialCount} social tabs and a people-search bookmark. We hope they're worth the FBI-grade prep, friend.",
        "${peopleSearchCount} people-search tab(s). You know their birth city, their cousin's wedding hashtag, and their LinkedIn 'About'. Be cool tonight."
      ]
    },
    {
      archetypeId: "phd_lit_review_avoider",
      name: "The PhD Lit Review Avoider",
      emoji: "📚",
      category: "study",
      description: "47 PDFs open. 3 read. Cited all 47. The committee will not hear it from us.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "jstor.org", "scholar.google.com", "semanticscholar.org", "zotero.org",
            "academia.edu", "researchgate.net", "arxiv.org", "ssrn.com",
            "sci-hub.se", "mendeley.com", "philpapers.org", "ncbi.nlm.nih.gov"
          ],
          min: 5,
          var: "phdTabs"
        }
      ],
      priority: 8,
      roastTemplates: [
        "${phdTabs} academic tabs. Read: probably 3. Cited: definitely all of them. Your committee will not hear it from us. (Yes they will.)",
        "${phdTabs} JSTOR/Scholar/arXiv tabs. The lit review has been 'almost done' for 11 months. We believe in you.",
        "${phdTabs} PDFs queued, zero highlights made. The thesis writes itself when you stare at it long enough. Allegedly."
      ]
    },
    {
      archetypeId: "wedding_spreadsheet",
      name: "The Wedding Spreadsheet",
      emoji: "💍",
      category: "lifestyle",
      description: "31 tabs, 14 months out. The fiancé's tab count is 0. Notice the math.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "theknot.com", "zola.com", "weddingwire.com", "brides.com",
            "davidsbridal.com", "bhldn.com", "partyslate.com", "junebugweddings.com",
            "herecomesguide.com", "weddingchicks.com", "stylemepretty.com",
            "minted.com", "minted.com/wedding", "hitched.co.uk"
          ],
          min: 5,
          var: "weddingTabs"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${weddingTabs} wedding tabs. 14 months out. Your fiancé is fine. Your fiancé's tab count is 0. Notice the math.",
        "${weddingTabs} venue/dress/registry tabs. Pinterest has nominated you for sainthood. Sleep is for after the honeymoon.",
        "${weddingTabs} wedding tabs and a spreadsheet that scrolls. The day is going to be perfect. The stress until then? Optional, allegedly."
      ]
    },
    {
      archetypeId: "mech_keyboard_hoarder",
      name: "The Mech Keyboard Hoarder",
      emoji: "⌨️",
      category: "hobby",
      description: "4 keyboards owned, MacBook keyboard used. The others are exhibits.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "drop.com", "novelkeys.com", "keychron.com", "kbdfans.com",
            "mechanicalkeyboards.com", "keebio.com", "omnitype.com",
            "ergodox-ez.com", "zsa.io", "glove80.com", "mode-designs.com",
            "candykeys.com", "ashkeebs.com"
          ],
          min: 5,
          var: "keyboardTabs"
        }
      ],
      priority: 8,
      roastTemplates: [
        "${keyboardTabs} keyboard tabs. The group buy closes in 6 hours. You own 4 already. You type on the MacBook one. The others are exhibits.",
        "${keyboardTabs} switch/keycap/keeb tabs. Your desk is a museum. Your wallet is the gift shop.",
        "${keyboardTabs} mech-keeb tabs open. Friend, the next one will not finally feel right. (You'll buy it anyway. We get it.)"
      ]
    },
    {
      archetypeId: "worldbuilder_not_writing",
      name: "The Worldbuilder (Not Writing)",
      emoji: "🗡️",
      category: "creative",
      description: "12th-century Bavarian salt taxes: known. Protagonist's name: unnamed.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "worldanvil.com", "kanka.io", "campfirewriting.com", "fantasynamegen.com",
            "donjon.bin.sh", "inkarnate.com", "watabou.itch.io",
            "worldbuilding.stackexchange.com"
          ],
          min: 1,
          var: "worldbuildTabs"
        },
        { type: "domainCount", domain: "wikipedia.org", min: 5, var: "wikiTabs" }
      ],
      priority: 8,
      roastTemplates: [
        "${wikiTabs} Wikipedia tabs + ${worldbuildTabs} worldbuilding tab(s). You know how 12th-century Bavarian salt taxes worked. Your protagonist still has no name.",
        "${wikiTabs} wiki rabbit holes about medieval armor and falconry. Chapter 1 is at 1,243 words. Has been since 2022. The world is rich, friend.",
        "${wikiTabs} historical Wikipedia tabs in service of a novel. The setting is canonical. The plot is a vibe."
      ]
    },
    {
      archetypeId: "ai_chat_hoarder",
      name: "The AI Chat Hoarder",
      emoji: "🤖",
      category: "modern",
      description: "Five chat tabs across three models. The same question, three opinions.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "chatgpt.com", "chat.openai.com", "claude.ai", "gemini.google.com",
            "perplexity.ai", "copilot.microsoft.com", "you.com", "character.ai",
            "poe.com", "mistral.ai", "deepseek.com", "huggingface.co/chat"
          ],
          min: 5,
          var: "aiChatTabs"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${aiChatTabs} AI chat tabs across multiple models. The question is the same. The answers are different. You'll average them and call it research.",
        "${aiChatTabs} AI tabs open. ChatGPT, Claude, and Gemini all weighed in. None of them know what you actually want. Honestly? Same.",
        "${aiChatTabs} chat tabs. You're not asking — you're crowdsourcing your decisions from a small council of polite robots."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // ELITE / CATCH-ALL
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "tab_maximalist",
      name: "The Tab Maximalist",
      emoji: "👑",
      category: "elite",
      description: "Tabs across windows, windows across screens. Your laptop fan wrote a song about you.",
      rules: [
        { type: "tabCount", min: 200, var: "tabCount" }
      ],
      priority: 4,
      roastTemplates: [
        "${tabCount} tabs. Across multiple windows. Your RAM is filing for divorce.",
        "${tabCount} tabs open. You're not browsing — you're an archive. A wet, glowing archive.",
        "${tabCount} tabs. Your laptop fan has its own LinkedIn now. It's looking for work."
      ]
    },
    {
      archetypeId: "casual_hoarder",
      name: "The Casual Hoarder",
      emoji: "🐌",
      category: "elite",
      description: "No specific obsession, just a steady, gentle inability to close anything. Honestly? Same.",
      rules: [
        { type: "tabCount", min: 0, var: "tabCount" }
      ],
      priority: 1,
      roastTemplates: [
        "${tabCount} tabs. No theme, no focus, just vibes. We see you. We are you.",
        "${tabCount} tabs of casual chaos. Not a hoarder, not not a hoarder. The middle path.",
        "${tabCount} tabs in gentle drift. Cozy. Quietly out of hand."
      ]
    }
  ];

  // Attach to global namespace so both the service worker (importScripts) and
  // popup/report (<script> tags) can read it.
  globalThis.TabShame = globalThis.TabShame || {};
  globalThis.TabShame.ARCHETYPES = ARCHETYPES;
})();
