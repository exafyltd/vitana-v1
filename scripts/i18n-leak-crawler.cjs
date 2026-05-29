// i18n leak crawler.
//
// Walks every user-facing route from src/generated/spa-routes.json with the
// German locale forced, dumps the visible text from each page, and flags
// English-only strings.
//
// Output:
//   /tmp/i18n-leak-report.json  — machine-readable per-route findings
//   /tmp/i18n-leak-report.md    — human-readable ranked summary
//
// Usage:
//   APP_URL=https://vitanaland.com node scripts/i18n-leak-crawler.cjs
//   LD_LIBRARY_PATH=/tmp/chromium-libs/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH \
//     PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true \
//     node scripts/i18n-leak-crawler.cjs

const { chromium, devices } = require('playwright');
const fs = require('node:fs');

const SUPABASE_URL = 'https://inmkhvwdcuyhnxkgfvsb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlubWtodndkY3V5aG54a2dmdnNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjY2MzcsImV4cCI6MjA3MTQ0MjYzN30._-QX8ZFgDsKgLM7eDlyc64vi73F-Hwc4ttnDPHjZgVw';
const APP = process.env.APP_URL || 'https://vitanaland.com';
const EMAIL = 'e2e-test@vitana.dev';
const PASSWORD = 'VitanaE2eTest2026!';

// English-only function words. If a string contains 1+ of these AND no
// German diacritics, it's almost certainly English. Conservative —
// avoids false positives on loanwords like "Live", "Premium", "Fitness".
const EN_FN_WORDS = new Set([
  'the','and','your','this','you','are','all','have','with','for','from','see','show','make','get','set','any','can','will','would','should','could','that','was','were','been','being','they','their','them','these','those','then','than','here','there','what','when','where','which','who','why','how','about','into','onto','upon','during','before','after','above','below','between','through','over','under','again','further','very','just','only','some','such','more','most','other','same','those','about','because','into','until','while','once','being','having','doing','having','want','need','tap','click','swipe','press','enter','submit','choose','select','open','close','remove','delete','update','create','edit','save','cancel','continue','back','next','prev','previous','start','stop','pause','resume','play','share','copy','paste','search','filter','sort','view','manage','settings','preferences','account','profile','help','support','about','contact','sign','log','login','logout','register','signup','signin','signout','reset','forgot','remember','welcome','hello','hi','thanks','please','sorry','error','warning','success','info','loading','done','complete','completed','pending','active','inactive','enabled','disabled','available','unavailable',
]);

// Brand / loanword allowlist — these are intentional English in DE UI.
const ALLOWLIST = new Set([
  'Vitana','VITANA','MAXINA','Maxina','OASIS','Lovable','Exafy','EXAFY',
  'Premium','Live','Fitness','Community','Pro','Plus','Lite','Beta','Mini',
  'Smart','API','SDK','UI','UX','HTTP','URL','PDF','OK','ID','EU','USD','EUR',
  'iPhone','Android','iOS','Apple','Google','Meta','OpenAI','Anthropic',
  'Bio','Profile','Avatar','Badge','Status','Step','Tag','Block','Cart',
  'Inbox','Discover','Wallet','Settings','Search','Filter','Login','Mode',
  'Hub','Plan','Score','Index','Token','Credits','Email','Code','Link','URL',
  'Autopilot','Streaming','Online','Offline','Member','Account','Skills',
]);

// German-only word list to suppress false positives. If any word in the
// candidate appears here, the string is NOT flagged.
const DE_WORDS = new Set([
  'dein','deine','deiner','deines','deinen','meine','mein','meiner','meines','meinen',
  'sein','seine','seiner','seines','seinen','ihr','ihre','ihres','ihren','ihrer',
  'unser','unsere','unserer','unseren','unseres','euer','eure','eurer','euren','eures',
  'der','die','das','den','dem','des','ein','eine','einer','einen','eines','einem',
  'kein','keine','keinen','keiner','keines','keinem',
  'ist','sind','war','waren','wird','werden','wurde','wurden','wirst','wären',
  'hat','hatte','hatten','haben','hast','habt','hätten','hätte',
  'kann','könnte','sollte','würde','muss','müssen','musste','müsste',
  'für','und','oder','aber','wenn','weil','damit','dass','als','wie','wo','was','warum','wann',
  'auf','an','in','aus','von','vom','zu','zum','zur','mit','bei','nach','vor','seit','über','unter','durch','gegen','ohne','um',
  'nicht','noch','schon','immer','niemals','manchmal','oft','heute','gestern','morgen','jetzt','dann','hier','dort','dann',
  'sehr','mehr','weniger','viel','wenig','alle','alles','jeder','jede','jedes','jedem','jeden','einige','andere',
  'tage','tag','woche','wochen','monat','monate','jahr','jahre','stunde','stunden','minute','minuten',
  'warenkorb','suchen','speichern','löschen','abbrechen','bestätigen','weiter','zurück','schließen',
  'einstellungen','benachrichtigungen','datenschutz','sicherheit','übersicht','unterstützung',
  'profil','konto','nachricht','nachrichten','treffer','reise','meilensteine','gesundheit',
  'morgens','abends','täglich','wöchentlich','monatlich','jährlich','startseite',
  'kalender','direkt','direktnachrichten','folge','live','räume','verbindungen','soziales','aktivität',
  'gruppe','gruppen','mitglied','mitglieder','event','events','meetup','meetups','live-rooms',
  'medien','dashboard','favorit','favoriten','aktuell','neueste','beliebt','vorgeschlagen','empfohlen',
  'persönlich','individuell','automatisch','manuell','intelligent','smart',
  'hervorragend','gut','schlecht','toll','perfekt','wunderbar',
  'beste','besten','schnell','schneller','langsam','langsamer','einfach','komplex',
  'morgenbriefing','tagesplan','wochenend','wochenende','feiertag','feiertage',
  'übersetzung','übersetzungen','sprache','sprachen','deutsch','englisch','spanisch','serbisch',
  'kategorie','kategorien','typ','typen','art','arten','status','zustand',
]);

function looksEnglish(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 4) return false;
  // Has German diacritic → German
  if (/[äöüÄÖÜß]/.test(t)) return false;
  // Numbers/symbols/emojis only → skip
  if (!/[A-Za-z]{2,}/.test(t)) return false;
  // Pure URL / path / code identifier → skip
  if (/^(https?:|\/|@[\w-]+|\w+\.[\w.-]+\/)/.test(t)) return false;
  if (/^[A-Za-z]+([._][A-Za-z]+)+$/.test(t) && !/\s/.test(t)) return false; // dotted id
  const wordTokens = t.split(/\s+/).filter(Boolean);
  // Pure brand-token strings → skip
  if (wordTokens.length > 0 && wordTokens.every((w) => {
    const stripped = w.replace(/[^A-Za-z]/g, '');
    return !stripped || ALLOWLIST.has(stripped) || /^\d+$/.test(w);
  })) return false;
  const lowered = wordTokens.map((w) => w.replace(/[^a-z]/gi, '').toLowerCase());
  // If ANY known German word appears → German (suppress false positive)
  for (const w of lowered) if (DE_WORDS.has(w)) return false;
  // English-function-word hit → English
  for (const w of lowered) if (EN_FN_WORDS.has(w)) return true;
  // 3+ ASCII-letter capitalized words with no German pattern → likely English
  // (raise threshold from 2 to 3 to avoid "Dein Warenkorb" type FP)
  if (wordTokens.length >= 3 && wordTokens.every((w) => /^[A-Z][a-z]+s?$/.test(w))) return true;
  return false;
}

async function authSession() {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const s = await r.json();
  if (!s.access_token) throw new Error('AUTH_FAILED: ' + JSON.stringify(s));
  return s;
}

function loadRoutes() {
  const data = JSON.parse(fs.readFileSync('src/generated/spa-routes.json', 'utf8'));
  // User-facing only: exclude admin, dev, parameterized, wildcards.
  return data.routes
    .map((r) => r.path)
    .filter((p) => p && p !== '*' && !p.includes(':') && !p.endsWith('/*'))
    .filter((p) => !p.startsWith('/admin') && !p.startsWith('/dev') && !p.startsWith('/command-hub'));
}

(async () => {
  const session = await authSession();
  console.log('AUTH_OK user_id=', session.user?.id);

  const routes = loadRoutes();
  console.log(`Crawling ${routes.length} routes…`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 14'], locale: 'de-DE' });
  const page = await ctx.newPage();

  // Inject auth + locale once
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.evaluate((s) => {
    localStorage.setItem('sb-inmkhvwdcuyhnxkgfvsb-auth-token', JSON.stringify(s));
    localStorage.setItem('vitana.authToken', s.access_token);
    localStorage.setItem('vitana.viewRole', 'community');
    localStorage.setItem('vitana-language', 'de-DE');
    localStorage.setItem('selectedLanguage', 'de-DE');
    localStorage.setItem('i18nextLng', 'de-DE');
  }, session);

  const findings = [];
  const startedAt = Date.now();

  for (let i = 0; i < routes.length; i++) {
    const route = routes[i];
    const url = APP + route;
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2000); // let React paint
      const text = await page.evaluate(() => {
        const out = [];
        function walk(node) {
          if (node.nodeType === 3) {
            const t = node.textContent.trim();
            if (t) out.push(t);
          } else if (node.nodeType === 1) {
            const tag = node.tagName.toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'noscript') return;
            const cs = window.getComputedStyle(node);
            if (cs.display === 'none' || cs.visibility === 'hidden') return;
            for (const c of node.childNodes) walk(c);
          }
        }
        walk(document.body);
        return out;
      });
      const leaks = text.filter(looksEnglish);
      const uniqueLeaks = [...new Set(leaks)];
      findings.push({ route, leakCount: uniqueLeaks.length, leaks: uniqueLeaks, totalNodes: text.length });
      const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
      console.log(`[${i + 1}/${routes.length}] ${route.padEnd(48)} → ${String(uniqueLeaks.length).padStart(3)} leaks  (${elapsed}s)`);
    } catch (e) {
      findings.push({ route, error: e.message });
      console.log(`[${i + 1}/${routes.length}] ${route.padEnd(48)} ERR ${e.message.slice(0, 60)}`);
    }
  }

  await browser.close();

  fs.writeFileSync('/tmp/i18n-leak-report.json', JSON.stringify(findings, null, 2));

  // Markdown report sorted by leak count desc
  const ranked = findings.filter((f) => !f.error).sort((a, b) => (b.leakCount || 0) - (a.leakCount || 0));
  const md = [
    `# i18n leak crawl — DE on mobile`,
    `Generated: ${new Date().toISOString()}`,
    `Routes crawled: ${findings.length}`,
    `Routes with errors: ${findings.filter((f) => f.error).length}`,
    `Routes with 0 leaks: ${ranked.filter((f) => f.leakCount === 0).length}`,
    `Routes with leaks: ${ranked.filter((f) => f.leakCount > 0).length}`,
    `Total unique leaks: ${[...new Set(ranked.flatMap((f) => f.leaks || []))].length}`,
    '',
    '## Ranked by leak count',
    '',
    '| Route | Leak count | Sample leaks |',
    '|---|---|---|',
  ];
  for (const f of ranked) {
    if ((f.leakCount || 0) === 0) continue;
    md.push(`| ${f.route} | ${f.leakCount} | ${(f.leaks || []).slice(0, 5).map((l) => l.slice(0, 60)).join(' \\| ').replace(/\|/g, '\\|')} |`);
  }
  fs.writeFileSync('/tmp/i18n-leak-report.md', md.join('\n') + '\n');
  console.log('\n--- DONE ---');
  console.log('Per-route JSON: /tmp/i18n-leak-report.json');
  console.log('Ranked report:  /tmp/i18n-leak-report.md');
})().catch((e) => { console.error(e); process.exit(1); });
