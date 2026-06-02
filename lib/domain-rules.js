/*
 * domain-rules.js
 *
 * Data definitions for all archetypes. The archetype engine reads this file
 * and evaluates rules generically — adding an archetype is a single entry
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
 *
 * Domain coverage philosophy (Jun 2026 audit):
 *   • domainMatches() compares the literal hostname after stripping `www.`,
 *     and treats subdomain matches as positive. So "amazon.com" matches
 *     "smile.amazon.com" but NOT "amazon.co.uk" — every regional TLD has
 *     to be listed explicitly. Lists below intentionally enumerate the
 *     major regional variants (amazon.com/.co.uk/.de/.fr/.it/.es/.ca/
 *     .com.au/.co.jp/.in/.sg/.ae, shopee.sg/.com.my/.co.id/.co.th/.vn/
 *     .ph/.tw/.com.br, etc.) so a user in any major market triggers the
 *     same persona as a US user.
 *   • Most rules deliberately have NO urlIncludes filter. The earlier
 *     `urlIncludes: "flight"` / `urlIncludes: "things-to-do"` filters
 *     blocked many legitimate matches (aa.com doesn't have "flight" in
 *     its URL, most reddit travel threads don't have the literal slug
 *     "things-to-do"). When intent needs scoping, prefer narrowing the
 *     domain list over filtering URL substrings.
 */

(function () {
  const ARCHETYPES = [
    // ─────────────────────────────────────────────────────────────────────
    // DEV / TECH
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "phantom_researcher",
      name: "The Phantom Researcher",
      shortName: "Phantom",
      emoji: "👻",
      category: "dev",
      description: "You open productivity tabs the way some people light candles. Symbolically.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // PKM / notes / outliners
            "notion.so", "obsidian.md", "roamresearch.com", "logseq.com",
            "bear.app", "anytype.io", "capacities.io", "mem.ai",
            "reflect.app", "tana.inc", "coda.io", "craft.do",
            "noteplan.co", "amplenote.com", "remnote.com", "supernotes.app",
            "evernote.com", "onenote.com",
            // task managers / project mgmt
            "todoist.com", "ticktick.com", "things.com", "omnifocus.com",
            "asana.com", "linear.app", "trello.com", "clickup.com",
            "monday.com", "wrike.com", "basecamp.com", "height.app",
            "shortcut.com", "smartsheet.com", "airtable.com",
            // calendar / planning
            "fantastical.app", "cron.com", "amie.so", "motion.app",
            "sunsama.com", "akiflow.com"
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
      shortName: "SO Necromancer",
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
      shortName: "localhost",
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
      shortName: "PR Spectator",
      emoji: "👀",
      category: "dev",
      description: "Watching pull requests is your full-time job. Reviewing them is not.",
      rules: [
        {
          // GitHub PRs are the dominant pattern, but GitLab/Bitbucket users
          // exist too — their MR/PR URLs follow the same "watch don't review"
          // ritual. urlIncludes scopes to the actual review surface (not the
          // repo home page or issues).
          type: "domainsAnyCount",
          domains: ["github.com", "gitlab.com", "bitbucket.org"],
          min: 5,
          urlIncludes: "pull",
          var: "prCount"
        }
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
      shortName: "Figma",
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
      shortName: "Inspiration",
      emoji: "🎨",
      category: "design",
      description: "You have 23 tabs of inspiration and 0 actual designs. The vibe is 'soon'.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Portfolio / showcase
            "dribbble.com", "behance.net", "awwwards.com", "siteinspire.com",
            "designspiration.com", "savee.it", "are.na", "land-book.com",
            "lookbook.nu", "thefwa.com", "godly.website", "minimal.gallery",
            "designsystems.com", "csswinner.com", "css-design-awards.com",
            "thebestdesigns.com", "onepagelove.com", "muz.li", "calltoidea.com",
            // Mobile / product
            "mobbin.com", "mobile-patterns.com", "pageflows.com",
            "uimovement.com", "shots.so", "screensdesign.com",
            "growth.design", "userinyerface.com",
            // Type / brand
            "fonts.in", "fontshare.com", "typewolf.com", "fontsinuse.com",
            "brandnew.underconsideration.com", "logoed.co.uk", "logobook.com",
            "logoinspirations.net",
            // Colour / illustration
            "coolors.co", "colorhunt.co", "happyhues.co", "colours.cafe",
            "illustrations.co", "blush.design"
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
      shortName: "LinkedIn",
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
      shortName: "Glassdoor",
      emoji: "🌀",
      category: "work",
      description: "You're researching the company so hard you forgot to apply.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Reviews + salary
            "glassdoor.com", "glassdoor.co.uk", "glassdoor.ca", "glassdoor.de",
            "levels.fyi", "blind.com", "teamblind.com", "comparably.com",
            "indeed.com/cmp", "kununu.com", "fishbowlapp.com",
            "vault.com", "ratemyemployer.ca",
            // Layoff trackers + culture context
            "layoffs.fyi", "trueup.io", "builtin.com", "thelayoff.com",
            "elephantintheroom.io"
          ],
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
      shortName: "Meetings",
      emoji: "📞",
      category: "work",
      description: "Meet, Zoom, Notion, Slack, Linear — all open simultaneously, none making you happy.",
      rules: [
        {
          type: "domainsAllCount",
          domainGroups: [
            ["meet.google.com", "zoom.us", "teams.microsoft.com", "webex.com"],
            ["notion.so", "coda.io", "confluence.atlassian.net"],
            ["slack.com", "discord.com", "rocket.chat"],
            ["linear.app", "asana.com", "jira.com", "atlassian.net", "monday.com", "clickup.com", "shortcut.com"]
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
    {
      archetypeId: "inbox_avoidance",
      name: "The Inbox Avoidance",
      shortName: "Inbox",
      emoji: "📧",
      category: "work",
      description: "Five Gmails open, zero replies sent. The unread count is its own personality.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Consumer + workspace mail UIs
            "mail.google.com", "gmail.com",
            "outlook.live.com", "outlook.office.com", "outlook.office365.com",
            "outlook.com",
            "mail.yahoo.com", "yahoo.co.uk/mail",
            "icloud.com",
            // Privacy-focused mail clients
            "mail.proton.me", "protonmail.com", "proton.me",
            "tutanota.com", "tuta.com", "mail.tutanota.com",
            "fastmail.com",
            // Power-user mail clients
            "hey.com", "spike.com", "superhuman.com",
            // International / regional
            "mail.aol.com", "mail.gmx.com", "mail.gmx.net",
            "mail.yandex.com", "mail.tutamail.com",
            "qq.com", "163.com", "126.com"
          ],
          min: 5,
          var: "inboxCount"
        }
      ],
      priority: 7,
      roastTemplates: [
        "${inboxCount} mail tabs. The reply you're drafting in your head? It will not survive the day.",
        "${inboxCount} inboxes open across accounts. The unread number is bigger than your hopes. We're with you.",
        "${inboxCount} Gmails/Outlooks open. You're not checking email — you're surveilling it from a safe distance."
      ]
    },

    // ─────────────────────────────────────────────────────────────────────
    // FINANCE
    // ─────────────────────────────────────────────────────────────────────
    {
      archetypeId: "bagholder_in_denial",
      name: "The Bagholder in Denial",
      shortName: "Bagholder",
      emoji: "📉",
      category: "finance",
      description: "Every tab is a different angle on the same chart. The angle does not help.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // US retail brokers
            "robinhood.com", "etrade.com", "fidelity.com", "schwab.com",
            "vanguard.com", "merrilledge.com", "tdameritrade.com",
            "webull.com", "publicapp.com", "moomoo.com",
            // Intl brokers
            "wealthsimple.com", "questrade.com", "interactivebrokers.com",
            "ig.com", "etoro.com", "saxobank.com", "tradestation.com",
            "hl.co.uk", "freetrade.io", "tradingrepublic.com",
            // Data / charting / news
            "tradingview.com", "finance.yahoo.com", "marketwatch.com",
            "seekingalpha.com", "barchart.com", "investing.com",
            "finviz.com", "simplywall.st", "koyfin.com", "stockanalysis.com",
            "bloomberg.com/markets", "ft.com/markets", "reuters.com/markets",
            "wsj.com/market-data", "morningstar.com",
            // Crypto exchanges + tooling
            "coinbase.com", "binance.com", "binance.us", "kraken.com",
            "gemini.com", "kucoin.com", "okx.com", "bybit.com", "bitstamp.net",
            "crypto.com", "coingecko.com", "coinmarketcap.com",
            "etherscan.io", "dexscreener.com", "dextools.io", "defillama.com"
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
      shortName: "Insurance",
      emoji: "📋",
      category: "finance",
      description: "Eleven insurance tabs. Eleven nearly identical quotes. One vibe: existential.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // US carriers
            "geico.com", "progressive.com", "statefarm.com", "allstate.com",
            "libertymutual.com", "farmers.com", "nationwide.com", "travelers.com",
            "esurance.com", "amfam.com", "thegeneral.com", "metlife.com",
            "americanfamilyinsurance.com",
            // US aggregators
            "policygenius.com", "thezebra.com", "insurify.com", "gabi.com",
            "savvy.insure", "lemonade.com",
            // UK + EU aggregators
            "comparethemarket.com", "moneysupermarket.com", "gocompare.com",
            "confused.com", "uswitch.com", "moneyhelper.org.uk",
            "check24.de", "verivox.de", "lesfurets.com", "assurland.com",
            // AU + IN aggregators
            "iselect.com.au", "compare.com.au", "canstar.com.au",
            "policybazaar.com", "coverfox.com"
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
      shortName: "Mortgage",
      emoji: "🏚️",
      category: "finance",
      description: "Plug in any rate, the answer is still 'no'.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Calculator + rate sites
            "nerdwallet.com", "bankrate.com", "mortgagecalculator.org",
            "thesimpledollar.com", "mortgagenewsdaily.com",
            // US lenders
            "rocketmortgage.com", "bettermortgage.com", "sofi.com",
            "quickenloans.com", "chase.com", "wellsfargo.com", "usbank.com",
            "lendingtree.com", "lenda.com", "guaranteedrate.com",
            // Property listings (mortgage tooling embedded)
            "zillow.com", "redfin.com", "realtor.com", "trulia.com",
            // UK + AU
            "moneysavingexpert.com", "habito.com", "mortgageadvicebureau.com",
            "loan.com.au", "ratecity.com.au"
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
      shortName: "Yield",
      emoji: "🏦",
      category: "finance",
      description: "You'll move your $4,200 across HYSAs for 0.05% extra. Respect.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // HYSAs + savings comparison
            "ally.com", "marcus.com", "discover.com", "sofi.com",
            "wealthfront.com", "betterment.com", "axos.com", "synchrony.com",
            "americanexpress.com/savings", "capitalone.com",
            "citi.com", "hmbradley.com", "raisin.com", "save.com",
            "brio.com", "bask.com",
            // Comparison + community
            "doctorofcredit.com", "savings.com", "depositaccounts.com",
            "bogleheads.org", "fatwallet.com",
            // UK / EU savings comparison
            "moneyfactscompare.co.uk", "raisin.co.uk", "raisin.de",
            "monzo.com", "starlingbank.com", "revolut.com"
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
      shortName: "Comparing",
      emoji: "🛍️",
      category: "shopping",
      description: "Same item. Six colors. Nine days. Still nothing in the cart.",
      rules: [
        {
          // Switched from duplicateHostnameWithVariations → domainsAnyCount
          // in Jun 2026. The variation requirement (5+ distinct URLs on one
          // host) meant 5 tabs of amazon.com homepage didn't fire — which
          // doesn't match how users actually experience "comparison shopping"
          // (open the same site five times, get distracted, never buy).
          type: "domainsAnyCount",
          domains: [
            // Marketplaces (US + regional Amazons enumerated explicitly —
            // domainMatches doesn't treat .co.uk/.de as the same host)
            "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it",
            "amazon.es", "amazon.ca", "amazon.com.au", "amazon.co.jp",
            "amazon.in", "amazon.sg", "amazon.ae", "amazon.com.br", "amazon.com.mx",
            "ebay.com", "ebay.co.uk", "ebay.de", "ebay.fr", "ebay.com.au",
            "etsy.com",
            // Asia-Pacific shopping ecosystems
            "shopee.sg", "shopee.com.my", "shopee.co.id", "shopee.co.th",
            "shopee.vn", "shopee.ph", "shopee.tw", "shopee.com.br",
            "lazada.sg", "lazada.com.my", "lazada.co.id", "lazada.co.th",
            "lazada.vn", "lazada.com.ph",
            "rakuten.com", "rakuten.co.jp",
            "aliexpress.com", "alibaba.com", "taobao.com", "tmall.com",
            "jd.com", "kogan.com",
            "carousell.sg", "carousell.com.my", "carousell.com.ph",
            "qoo10.sg", "qoo10.com",
            // US big-box + general retail
            "target.com", "walmart.com", "bestbuy.com", "costco.com",
            "samsclub.com", "kohls.com", "homedepot.com", "lowes.com",
            "macys.com", "nordstrom.com", "nordstromrack.com", "saksfifthavenue.com",
            "bloomingdales.com", "neimanmarcus.com",
            // Fast / cheap fashion
            "shein.com", "romwe.com", "boohoo.com", "prettylittlething.com",
            "nastygal.com", "fashionnova.com", "missguided.com", "temu.com",
            // Designer + premium
            "ssense.com", "farfetch.com", "mytheresa.com", "net-a-porter.com",
            "matchesfashion.com", "mrporter.com", "brownsfashion.com",
            "harveynichols.com", "harrods.com", "selfridges.com",
            "lystpf.com", "lyst.com",
            // Mid-market apparel (US / global)
            "uniqlo.com", "muji.com", "muji.us", "muji.eu", "muji.net",
            "zara.com", "hm.com", "asos.com", "mango.com", "massimodutti.com",
            "cos.com", "arket.com", "weekday.com", "monki.com", "stories.com",
            "pullandbear.com", "bershka.com", "stradivarius.com",
            "jcrew.com", "gap.com", "oldnavy.com", "bananarepublic.com",
            "madewell.com", "abercrombie.com", "hollisterco.com",
            "reformation.com", "everlane.com", "lululemon.com", "athleta.com",
            "anthropologie.com", "freepeople.com", "urbanoutfitters.com",
            "shopbop.com", "revolve.com",
            // UK + EU high-street
            "johnlewis.com", "marksandspencer.com", "next.co.uk",
            "riverisland.com", "newlook.com", "boden.com", "houseoffraser.co.uk",
            "matalan.co.uk", "primark.com",
            "zalando.com", "zalando.co.uk", "zalando.de", "zalando.fr",
            // Resale + thrift
            "depop.com", "vinted.com", "vinted.co.uk", "thredup.com",
            "vestiairecollective.com", "therealreal.com", "grailed.com",
            "stockx.com", "goat.com", "ebay.com/itm",
            // Athletic + footwear
            "nike.com", "adidas.com", "puma.com", "reebok.com",
            "newbalance.com", "asics.com", "allbirds.com", "on.com",
            "hokaoneone.com", "salomon.com", "footlocker.com", "jdsports.com",
            "footasylum.com", "ssense.com/sneakers"
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
      shortName: "Cart Cemetery",
      emoji: "🛒",
      category: "shopping",
      description: "Nine carts. Eight hundred dollars in items. Zero check-outs. The graveyard is full.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "amazon.com", "amazon.co.uk", "amazon.de", "amazon.com.au",
            "amazon.co.jp", "amazon.in",
            "ebay.com", "ebay.co.uk",
            "etsy.com", "shopify.com",
            "asos.com", "shein.com", "uniqlo.com", "muji.com", "muji.us",
            "zara.com", "hm.com", "mango.com", "cos.com",
            "shopee.sg", "shopee.com.my", "shopee.co.id", "shopee.co.th",
            "lazada.sg", "lazada.com.my",
            "ssense.com", "farfetch.com", "net-a-porter.com",
            "nordstrom.com", "target.com", "walmart.com", "bestbuy.com",
            "jcrew.com", "gap.com", "madewell.com", "everlane.com",
            "lululemon.com", "nike.com", "adidas.com"
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
      shortName: "Flight Refresh",
      emoji: "✈️",
      category: "travel",
      description: "The price will not drop. We are begging you to stop refreshing.",
      rules: [
        {
          // Dropped urlIncludes: "flight" in Jun 2026. It blocked tabs like
          // aa.com/managed-trips or skyscanner.com landing pages — both of
          // which are very much flight-refresh behavior even without the
          // literal "flight" substring.
          type: "domainsAnyCount",
          domains: [
            // Meta-search
            "google.com/flights", "google.com/travel", "kayak.com",
            "skyscanner.com", "skyscanner.net", "skyscanner.co.uk",
            "expedia.com", "expedia.co.uk", "expedia.ca",
            "momondo.com", "hopper.com", "going.com",
            "cheapflights.com", "cheapflights.co.uk",
            "secretflying.com", "thriftytraveler.com",
            "scottscheapflights.com", "kiwi.com",
            // North American carriers
            "aa.com", "delta.com", "united.com", "alaskaair.com",
            "jetblue.com", "southwest.com", "spirit.com", "frontier.com",
            "sun-country.com", "hawaiianairlines.com", "aircanada.com",
            "westjet.com",
            // European carriers
            "ba.com", "virginatlantic.com", "klm.com", "airfrance.com",
            "lufthansa.com", "swiss.com", "austrian.com", "iberia.com",
            "alitalia.com", "ita-airways.com", "tap.pt", "finnair.com",
            "sas.com", "norwegian.com",
            "ryanair.com", "easyjet.com", "wizzair.com", "vueling.com",
            "transavia.com", "eurowings.com",
            "turkishairlines.com", "lot.com",
            // Middle East + Africa
            "emirates.com", "qatarairways.com", "etihad.com",
            "ethiopianairlines.com", "kenya-airways.com",
            // Asia-Pacific carriers
            "singaporeair.com", "cathaypacific.com", "jal.com",
            "ana.co.jp", "koreanair.com", "asiana.com",
            "thaiairways.com", "vietnamairlines.com", "chinaairlines.com",
            "evaair.com", "philippineairlines.com", "malaysiaairlines.com",
            "garuda-indonesia.com",
            "qantas.com", "qantas.com.au", "virginaustralia.com",
            "airnewzealand.com", "airnewzealand.co.nz",
            "airasia.com", "scoot.com", "jetstar.com",
            "cebupacificair.com", "lionair.co.id", "indigo.in",
            "vistara.com", "airindia.com", "spicejet.com",
            // India / SEA OTAs
            "makemytrip.com", "goibibo.com", "easemytrip.com",
            "yatra.com", "cleartrip.com", "ixigo.com",
            "trip.com", "ctrip.com", "traveloka.com",
            "12go.asia", "klook.com/flights"
          ],
          min: 5,
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
      // Renamed from "The Booking.com Detective" in Jun 2026 — original was
      // too tied to one brand. The behavior pattern (40 hotel tabs across
      // 12 booking platforms) is identical whether the user is on Booking,
      // Agoda (SEA), Trip/Ctrip (China), MakeMyTrip (India), or hotel-chain
      // direct sites. The new name + expanded domain list catches all of
      // them under one persona.
      archetypeId: "booking_detective",
      name: "The Travel Stack Detective",
      shortName: "Travel Stack",
      emoji: "🔍",
      category: "travel",
      description: "23 hotels. 412 reviews read. One certainty: you are exhausted.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Major OTAs
            "booking.com", "hotels.com", "expedia.com", "expedia.co.uk",
            "agoda.com", "trivago.com", "trivago.co.uk", "kayak.com/hotels",
            "priceline.com", "orbitz.com", "travelocity.com",
            "ebookers.com", "lastminute.com", "hotwire.com",
            // Asia / India OTAs
            "trip.com", "ctrip.com", "tujia.com",
            "klook.com", "kkday.com", "traveloka.com",
            "makemytrip.com", "goibibo.com", "yatra.com", "easemytrip.com",
            "redbus.in", "ixigo.com/hotels",
            "rakuten-travel.com", "rakutentravel.com", "jalan.net",
            "ikyu.com",
            // Vacation rentals / alt-stays
            "airbnb.com", "airbnb.co.uk", "vrbo.com", "homeaway.com",
            "plumguide.com", "onefinestay.com", "boutiquehomes.com",
            // Hostels + budget
            "hostelworld.com", "hostelbookers.com", "couchsurfing.com",
            // Direct hotel brands (where users go to compare to OTAs)
            "marriott.com", "hilton.com", "hyatt.com", "ihg.com",
            "accor.com", "all.accor.com", "choicehotels.com",
            "wyndhamhotels.com", "radissonhotels.com", "bestwestern.com",
            "fourseasons.com", "ritzcarlton.com", "mandarinoriental.com",
            "peninsula.com", "shangri-la.com", "rosewoodhotels.com",
            "banyantree.com", "sixsenses.com", "aman.com",
            "lhw.com", "smallluxuryhotels.com", "designhotels.com"
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
      shortName: "Itineraries",
      emoji: "🗺️",
      category: "travel",
      description: "Eighteen 'things to do in [city]' tabs. You'll do three of them.",
      rules: [
        {
          // Dropped urlIncludes: "things-to-do" in Jun 2026 — most travel
          // reading isn't on a URL with that exact slug (Atlas Obscura,
          // Eater, blog roundups, Reddit threads all use bespoke paths).
          // The domain list itself is now the scoping signal.
          type: "domainsAnyCount",
          domains: [
            // Editorial travel
            "tripadvisor.com", "tripadvisor.co.uk",
            "lonelyplanet.com", "fodors.com", "frommers.com", "ricksteves.com",
            "timeout.com", "atlasobscura.com", "culturetrip.com",
            "thrillist.com", "eater.com", "afar.com", "cntraveler.com",
            "travelandleisure.com", "nationalgeographic.com/travel",
            "bbc.com/travel", "smartertravel.com", "matadornetwork.com",
            "theinfatuation.com",
            // Wiki + community
            "wikitravel.org", "wikivoyage.org",
            "nomadicmatt.com", "travelfish.org", "thetravelhack.com",
            "travelblogcollective.com", "thebrokebackpacker.com",
            // Booking-adjacent activity / experiences
            "getyourguide.com", "viator.com", "klook.com/activities",
            "tiqets.com", "musement.com", "withlocals.com",
            "airbnb.com/experiences"
          ],
          min: 5,
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
      shortName: "YouTube Hole",
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
      archetypeId: "reddit_loop",
      name: "The Reddit Loop",
      shortName: "Reddit",
      emoji: "🌀",
      category: "lifestyle",
      description: "Five subreddits open. One answer needed. Three hours in. The wiki has been read.",
      rules: [
        { type: "domainCount", domain: "reddit.com", min: 5, var: "redditCount" }
      ],
      priority: 6,
      roastTemplates: [
        "${redditCount} Reddit tabs. Five subreddits, three of them niche. The advice is conflicting. The vibe is research.",
        "${redditCount} Reddit threads open. You went in for an answer. You came back with three new hobbies.",
        "${redditCount} Reddit tabs. The mods of these subs have a higher posting frequency than your therapist. Time to log off."
      ]
    },
    {
      archetypeId: "pinterest_black_hole",
      name: "The Pinterest Black Hole",
      shortName: "Pinterest",
      emoji: "📌",
      category: "lifestyle",
      description: "Eight boards, twelve tabs, zero life-changes. The mood is 'someday'.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "pinterest.com", "pinterest.co.uk", "pinterest.ca",
            "pinterest.de", "pinterest.fr", "pinterest.es", "pinterest.it",
            "pinterest.com.au", "pinterest.jp", "pinterest.nz", "pin.it"
          ],
          min: 5,
          var: "pinterestCount"
        }
      ],
      priority: 6,
      roastTemplates: [
        "${pinterestCount} Pinterest tabs. The kitchen renovation, the wedding, the capsule wardrobe — all someday. We're rooting for you.",
        "${pinterestCount} Pinterest boards open. Pins saved: thousands. Pins acted on: a candle, once.",
        "${pinterestCount} Pinterest tabs. You're not planning — you're manifesting. Different tax bracket."
      ]
    },
    {
      archetypeId: "google_search_spiral",
      name: "The Google Search Spiral",
      shortName: "Google Spiral",
      emoji: "🔎",
      category: "lifestyle",
      description: "Five searches deep, three rabbit holes wide. The original question is unrecoverable.",
      rules: [
        {
          // Catches the "I just googled it" → 5 tabs of result pages pattern.
          // Lower priority than themed personas (cooking, travel, finance)
          // so a focused search session still wins the right archetype.
          type: "domainsAnyCount",
          domains: [
            "google.com", "google.co.uk", "google.de", "google.fr",
            "google.it", "google.es", "google.ca", "google.com.au",
            "google.co.jp", "google.co.in", "google.com.sg", "google.com.br",
            "google.co.kr", "google.com.mx", "google.com.hk", "google.com.tw",
            "duckduckgo.com", "bing.com", "search.brave.com",
            "ecosia.org", "startpage.com", "kagi.com", "yandex.com",
            "searx.org", "presearch.com"
          ],
          min: 5,
          var: "searchCount"
        }
      ],
      priority: 5,
      roastTemplates: [
        "${searchCount} search-result tabs. The first answer didn't satisfy. Now you're at page 4, learning about something else entirely.",
        "${searchCount} Google tabs. You searched, you spiraled, you forgot what you came for. Welcome.",
        "${searchCount} search tabs. Each one a tiny inquisition. None of them final. You contain multitudes — of unresolved curiosities."
      ]
    },
    {
      archetypeId: "eternal_read_later",
      name: "The Eternal Read-Later",
      shortName: "Read-Later",
      emoji: "📚",
      category: "lifestyle",
      description: "44 articles waiting. The oldest one is now historical fiction.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Long-form magazines + newspapers
            "medium.com", "substack.com",
            "nytimes.com", "newyorker.com", "theatlantic.com", "wired.com",
            "theverge.com", "theguardian.com", "ft.com", "wsj.com",
            "washingtonpost.com", "bbc.com", "reuters.com", "bloomberg.com",
            "politico.com", "vox.com", "slate.com", "axios.com", "quartz.com",
            "theintercept.com", "propublica.org", "motherjones.com",
            "harpers.org", "paris-review.org", "lrb.co.uk", "nybooks.com",
            "lithub.com", "electricliterature.com", "thepointmag.com",
            "n-1.org", "jacobinmag.com", "currentaffairs.org",
            "themarginalian.org", "longform.org", "longreads.com",
            // Tech / culture commentary
            "stratechery.com", "ben-evans.com", "noahpinion.blog",
            "marker.medium.com", "thedispatch.com", "thefp.com",
            // Read-it-later services (often the tab IS the open reader)
            "getpocket.com", "instapaper.com", "raindrop.io",
            "readwise.io", "matter.app", "omnivore.app"
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
      shortName: "Recipes",
      emoji: "🍳",
      category: "lifestyle",
      description: "Twelve recipes, zero cooked, DoorDash on speed dial. The fantasy is the meal.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Big editorial cooking
            "allrecipes.com", "bonappetit.com", "seriouseats.com",
            "epicurious.com", "food52.com", "thekitchn.com",
            "nytimes.com/cooking", "cooking.nytimes.com",
            "kingarthurbaking.com", "americastestkitchen.com",
            "tasteofhome.com", "delish.com", "tastingtable.com",
            "eatingwell.com", "marthastewart.com",
            "foodnetwork.com", "bbcgoodfood.com", "jamieoliver.com",
            // Recipe blogs (the long-scroll-with-story-on-top kind)
            "smittenkitchen.com", "halfbakedharvest.com",
            "minimalistbaker.com", "pinchofyum.com", "budgetbytes.com",
            "sallysbakingaddiction.com", "twopeasandtheirpod.com",
            "cookieandkate.com", "ohsheglows.com", "deliciouseveryday.com",
            "gimmesomeoven.com", "loveandlemons.com", "theclevercarrot.com",
            "sproutedkitchen.com", "thewoksoflife.com", "rasamalaysia.com",
            "spendwithpennies.com", "wellplated.com", "natashaskitchen.com",
            "thepioneerwoman.com", "iamafoodblog.com", "bowlofdelicious.com",
            "thekitcheneer.com", "themediterraneandish.com",
            // Specialty / dietary
            "pressurecookrecipes.com", "kingarthurflour.com",
            "boundsbysugar.com", "minimalistbaker.com"
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
      shortName: "3am WebMD",
      emoji: "🩺",
      category: "lifestyle",
      description: "Symptoms googled at 3am. Doctor not consulted. We beg you to sleep.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // US consumer health
            "webmd.com", "mayoclinic.org", "healthline.com",
            "verywellhealth.com", "verywellmind.com",
            "clevelandclinic.org", "hopkinsmedicine.org",
            "kp.org", "self.com/health",
            // Government / authoritative
            "nih.gov", "medlineplus.gov", "cdc.gov",
            "patient.info", "nhs.uk", "nhsinform.scot",
            "betterhealth.vic.gov.au", "healthhub.sg",
            // Drugs / interactions
            "drugs.com", "rxlist.com", "medscape.com",
            "uptodate.com", "emedicine.com",
            // Symptom checkers
            "ada.com", "buoyhealth.com", "isabelhealthcare.com",
            "symptomate.com",
            // Find-a-doctor (still 3am-spiral adjacent)
            "zocdoc.com", "doctolib.fr", "doctolib.de"
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
      shortName: "Zillow",
      emoji: "🏡",
      category: "lifestyle",
      description: "Houses in 14 cities you don't live in. The relocation is emotional.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // US
            "zillow.com", "redfin.com", "realtor.com", "trulia.com",
            "homes.com", "compass.com", "homefinder.com",
            // UK + Ireland
            "rightmove.co.uk", "zoopla.co.uk", "onthemarket.com",
            "primelocation.com", "daft.ie", "myhome.ie",
            // EU
            "immobilienscout24.de", "immowelt.de", "immonet.de",
            "seloger.com", "leboncoin.fr/immobilier", "logic-immo.com",
            "idealista.com", "idealista.it", "fotocasa.es", "pisos.com",
            "immobiliare.it", "casa.it",
            "hemnet.se", "blocket.se/bostader",
            "boligsiden.dk", "boliga.dk",
            // Nordics / Switz / Austria
            "finn.no/realestate",
            "homegate.ch", "comparis.ch/immobilien",
            "immowelt.at",
            // APAC
            "domain.com.au", "realestate.com.au", "allhomes.com.au",
            "trademe.co.nz/property",
            "lifull.com", "suumo.jp", "athome.co.jp", "homes.co.jp",
            "propertyguru.sg", "99.co", "srx.com.sg",
            "iproperty.com.my", "edgeprop.my",
            "ddproperty.com", "hipflat.co.th",
            "magicbricks.com", "99acres.com", "housing.com",
            "5i5j.com", "lianjia.com"
          ],
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
      shortName: "3am Parent",
      emoji: "👶",
      category: "lifestyle",
      description: "It's 3am. The baby is fine. The rash is normal. We see you, friend.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Mainstream parenting brands
            "babycenter.com", "whattoexpect.com", "thebump.com",
            "parents.com", "parenting.com", "scarymommy.com",
            "motherly.com", "fatherly.com", "verywellfamily.com",
            // Medical-grade
            "healthychildren.org", "aap.org", "nhs.uk/conditions/baby",
            "raisingchildren.net.au", "nct.org.uk",
            // Lactation + feeding
            "kellymom.com", "lalecheleague.org", "llli.org",
            // Brand support
            "pampers.com", "huggies.com", "enfamil.com", "similac.com",
            // Forums + advice
            "mamasource.com", "cafemom.com", "mumsnet.com", "babybunting.com.au",
            "parentdata.org", "expectful.com", "happiestbaby.com",
            // Sleep-focused (a 3am favorite)
            "takingcarababies.com", "babysleepsite.com", "sleepwizards.com"
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
      shortName: "11:47 PM",
      emoji: "📝",
      category: "study",
      description: "12 minutes till the deadline. 174 words written. Future you has notes.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // AI / writing tools
            "chatgpt.com", "chat.openai.com", "claude.ai",
            "gemini.google.com", "quillbot.com", "grammarly.com",
            "writesonic.com", "jasper.ai",
            // Citation + bibliography
            "easybib.com", "scribbr.com", "citationmachine.net",
            "zotero.org", "mendeley.com", "paperpile.com",
            // Reference + research
            "scholar.google.com", "jstor.org", "wikipedia.org",
            "sparknotes.com", "shmoop.com", "litcharts.com",
            "cliffsnotes.com",
            // Homework-help marketplaces
            "coursehero.com", "chegg.com", "studocu.com",
            "quizlet.com", "khanacademy.org", "brainly.com",
            "studypool.com", "bartleby.com",
            // Math / solvers
            "wolframalpha.com", "mathway.com", "photomath.com",
            "symbolab.com", "desmos.com",
            // LMS (the dreaded deadline page)
            "canvas.instructure.com", "blackboard.com", "moodle.org",
            "brightspace.com", "schoology.com",
            // Writing surface
            "docs.google.com", "overleaf.com"
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
      // Reframed (was "recruiter_black_hole"). The detection signal — 5+
      // LinkedIn tabs + an ATS or scheduling tab — describes a job seeker
      // far more often than a recruiter. Recruiters use LinkedIn Recruiter
      // (different product) and live INSIDE the ATS as a logged-in dashboard,
      // not as page-by-page tab browsing. Job seekers, on the other hand,
      // routinely open multiple hiring-manager profiles + the company's
      // Greenhouse/Lever job page + a Calendly slot.
      archetypeId: "active_job_seeker",
      name: "The Job Hunt Marathon",
      shortName: "Job Hunt",
      emoji: "🎯",
      category: "work",
      description: "Hiring managers researched, applications mid-flight, Calendlys blocked. You've got this.",
      rules: [
        { type: "domainCount", domain: "linkedin.com", min: 5, var: "linkedinCount" },
        {
          type: "domainsAnyCount",
          domains: [
            // Major ATS
            "greenhouse.io", "boards.greenhouse.io", "lever.co", "jobs.lever.co",
            "workable.com", "ashbyhq.com", "myworkdayjobs.com",
            "workday.com", "smartrecruiters.com", "icims.com",
            "jobvite.com", "bamboohr.com", "taleo.net", "successfactors.com",
            // Scheduling
            "calendly.com", "cal.com", "savvycal.com",
            // Job boards + aggregators
            "indeed.com", "monster.com", "ziprecruiter.com", "simplyhired.com",
            "dice.com", "wellfound.com", "ycombinator.com/jobs",
            "builtin.com", "otta.com", "welcometothejungle.com",
            "weworkremotely.com", "remoteok.com", "remote.co", "flexjobs.com",
            "stackoverflow.com/jobs", "hnhiring.com", "hired.com",
            // Regional boards
            "totaljobs.com", "reed.co.uk", "cv-library.co.uk",
            "stepstone.com", "stepstone.de",
            "seek.com.au", "seek.co.nz",
            "jobstreet.com", "jobsdb.com",
            "naukri.com", "shine.com", "instahyre.com"
          ],
          min: 1,
          var: "atsCount"
        }
      ],
      priority: 9,
      roastTemplates: [
        "${linkedinCount} LinkedIn profiles + ${atsCount} ATS tab(s). You've rehearsed 'tell me about yourself' in three accents. The interviews are coming.",
        "${linkedinCount} hiring managers stalked. ${atsCount} Greenhouse/Lever tab(s). Your 'open to work' frame is doing the heavy lifting. We're rooting for you.",
        "${linkedinCount} LinkedIn tabs + ${atsCount} application in motion. The Calendly link is loaded. The cover letter is in the chamber. Send it."
      ]
    },
    {
      archetypeId: "pre_date_detective",
      name: "The Pre-Date Detective",
      shortName: "Pre-Date",
      emoji: "🕵️",
      category: "lifestyle",
      description: "You know their college roommate's ex's name. The date doesn't know yours.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "whitepages.com", "beenverified.com", "spokeo.com",
            "peoplefinders.com", "truepeoplesearch.com", "fastpeoplesearch.com",
            "intelius.com", "thatsthem.com", "radaris.com",
            "publicrecordsnow.com", "publicrecordsreviews.com"
          ],
          min: 1,
          var: "peopleSearchCount"
        },
        {
          type: "domainsAnyCount",
          domains: [
            "linkedin.com", "instagram.com", "x.com", "twitter.com",
            "facebook.com", "tiktok.com", "threads.net", "bluesky.app"
          ],
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
      shortName: "PhD Avoider",
      emoji: "📚",
      category: "study",
      description: "47 PDFs open. 3 read. Cited all 47. The committee will not hear it from us.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Aggregators + libraries
            "jstor.org", "scholar.google.com", "semanticscholar.org",
            "researchgate.net", "academia.edu", "core.ac.uk",
            "base-search.net", "doaj.org", "openaire.eu",
            "lens.org", "dimensions.ai",
            // Pre-print servers
            "arxiv.org", "biorxiv.org", "medrxiv.org", "chemrxiv.org",
            "psyarxiv.com", "ssrn.com", "papers.ssrn.com",
            "philpapers.org", "preprints.org",
            // Reference managers
            "zotero.org", "mendeley.com", "paperpile.com",
            "endnote.com",
            // Tools
            "connectedpapers.com", "litmaps.com", "researchrabbit.ai",
            "elicit.com", "consensus.app", "scite.ai", "scinapse.io",
            // Subject-specific
            "ncbi.nlm.nih.gov", "pubmed.ncbi.nlm.nih.gov",
            "sciencedirect.com", "springer.com", "tandfonline.com",
            "wiley.com", "sage.com", "cambridge.org/core",
            "oxford.universitypress.com", "nature.com", "science.org",
            "plos.org",
            // Greys
            "sci-hub.se", "sci-hub.ru", "libgen.is"
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
      shortName: "Wedding",
      emoji: "💍",
      category: "lifestyle",
      description: "31 tabs, 14 months out. The fiancé's tab count is 0. Notice the math.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Planning hubs
            "theknot.com", "zola.com", "weddingwire.com", "brides.com",
            "hitched.co.uk", "weddingbee.com", "junebugweddings.com",
            "herecomesguide.com", "weddingchicks.com", "stylemepretty.com",
            "ruffledblog.com", "greenweddingshoes.com", "bridalmusings.com",
            "offbeatbride.com", "offbeathome.com", "mywedding.com",
            // Dresses + style
            "davidsbridal.com", "bhldn.com", "lulus.com",
            "mariamarie.com", "azazie.com",
            "stylesnoop.com", "mywedstyle.com",
            // Invitations + paper goods
            "minted.com", "minted.com/wedding", "papier.com",
            "zazzle.com", "weddingpaperdivas.com", "shutterfly.com",
            "vistaprint.com",
            // Registry
            "zola.com/registry", "amazon.com/wedding-registry",
            "honeyfund.com", "blueprintregistry.com",
            // Venue + vendor finders
            "partyslate.com", "weddingvenues.com",
            "venuereport.com",
            // Etsy (wedding category is enormous on Etsy)
            "etsy.com/c/weddings"
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
      shortName: "Keyboards",
      emoji: "⌨️",
      category: "hobby",
      description: "4 keyboards owned, MacBook keyboard used. The others are exhibits.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Vendors (US)
            "drop.com", "novelkeys.com", "kbdfans.com", "omnitype.com",
            "cannonkeys.com", "mode-designs.com", "candykeys.com",
            "ashkeebs.com", "milktoothmtl.com", "1upkeyboards.com",
            "primekb.com", "kbdpad.com", "ramaworks.com",
            "keebsforall.com", "keeb.io", "keebio.com",
            // Vendors (EU + APAC)
            "keychron.com", "qwertykeys.com", "wuquestudio.com",
            "akkogear.com", "akko.com", "epomakerz.com",
            "ergodox-ez.com", "zsa.io", "glove80.com",
            "mechanicalkeyboards.com",
            // Switches / keycaps direct
            "cherrymx.com", "gmkkeycaps.com", "signature-plastics.com",
            "matrixkeyboards.com",
            // Community + reference
            "geekhack.org", "reddit.com/r/mechanicalkeyboards",
            "thock.io", "keymapdb.com", "kbd.news", "switchandclick.com"
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
      shortName: "Worldbuilder",
      emoji: "🗡️",
      category: "creative",
      description: "12th-century Bavarian salt taxes: known. Protagonist's name: unnamed.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            "worldanvil.com", "kanka.io", "campfirewriting.com",
            "fantasynamegen.com", "donjon.bin.sh", "inkarnate.com",
            "watabou.itch.io", "worldbuilding.stackexchange.com",
            "wonderdraft.net", "dungeonscrawl.com", "azgaar.github.io",
            // Long-form drafting + outlining
            "scrivener.com", "literatureandlatte.com",
            "novlr.org", "plottr.com", "dabblewriter.com", "milanote.com",
            "sudowrite.com", "shaxpir.com",
            "writeometer.com", "thestoryshack.com"
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
      shortName: "AI Chats",
      emoji: "🤖",
      category: "modern",
      description: "Five chat tabs across three models. The same question, three opinions.",
      rules: [
        {
          type: "domainsAnyCount",
          domains: [
            // Frontier model chat UIs
            "chatgpt.com", "chat.openai.com",
            "claude.ai", "console.anthropic.com",
            "gemini.google.com", "bard.google.com",
            "notebooklm.google.com", "aistudio.google.com",
            "copilot.microsoft.com", "bing.com/chat",
            // Search-as-chat + alt models
            "perplexity.ai", "you.com",
            "pi.ai", "inflection.ai/pi",
            "character.ai", "poe.com",
            "mistral.ai", "chat.mistral.ai",
            "deepseek.com", "chat.deepseek.com",
            "huggingface.co/chat", "labs.perplexity.ai",
            "groq.com", "kimi.moonshot.cn",
            "qwen.ai", "tongyi.aliyun.com",
            "yiyan.baidu.com"
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
      shortName: "Maximalist",
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
      shortName: "Casual",
      emoji: "🐌",
      category: "elite",
      description: "No specific obsession, just a steady, gentle inability to close anything. Honestly? Same.",
      rules: [
        { type: "tabCount", min: 0, var: "tabCount" }
      ],
      priority: 1,
      roastTemplates: [
        "${tabCount} tabs. None of them important. All of them, somehow, still open. A digital crime scene with no body.",
        "${tabCount} tabs. You opened them with intent. You will close them in the afterlife.",
        "${tabCount} tabs of 'I'll get back to it.' Spoiler: you will not.",
        "${tabCount} tabs. No category, no commitment, no closure. The Tinder profile of browsing.",
        "${tabCount} tabs. You've been on this page for 4 minutes. The other ${tabCount} are watching.",
        "${tabCount} tabs. Each one a tiny monument to a thought you almost finished.",
        "${tabCount} tabs. The browser equivalent of leaving every drawer in the house slightly open.",
        "${tabCount} tabs. Cmd+W exists. You just don't believe in it."
      ]
    }
  ];

  // Attach to global namespace so both the service worker (importScripts) and
  // popup/report (<script> tags) can read it.
  globalThis.TabShame = globalThis.TabShame || {};
  globalThis.TabShame.ARCHETYPES = ARCHETYPES;
})();
