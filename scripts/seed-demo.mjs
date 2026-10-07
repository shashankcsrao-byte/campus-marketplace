// Fills the marketplace with demo data: 50 student accounts, ~75 listings with
// generated sticker-style images, favourites and a few chats.
//
//   node --env-file=.env scripts/seed-demo.mjs
//
// Everything goes through the public API as real users would, so RLS applies.
// Demo accounts use the @demo.campusmart.app domain; their shared password is
// saved to .demo-accounts.local (git-ignored). Supabase allows ~30 sign-ups per
// 5 minutes, so the script paces itself (about 10 minutes in total).
import { createClient } from '@supabase/supabase-js';
import { Resvg } from '@resvg/resvg-js';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

const URL_ = process.env.VITE_SUPABASE_URL;
const KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL_ || !KEY) throw new Error('Run with: node --env-file=.env scripts/seed-demo.mjs');

const DOMAIN = 'demo.campusmart.app';
const ACCOUNTS_FILE = '.demo-accounts.local';
const SIGNUP_GAP_MS = 10_500; // stay under the sign-up rate limit
const BUCKET = 'listing-images';

// ── deterministic randomness so re-runs look the same ─────────────────────
let seed = 20261007;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const daysAgo = (d, h = 0) => new Date(Date.now() - d * 86400e3 - h * 3600e3).toISOString();

// ── people ─────────────────────────────────────────────────────────────────
const NAMES = [
  'Aarav Sharma', 'Ananya Rao', 'Rohan Gowda', 'Priya Nair', 'Karthik Reddy', 'Sneha Kulkarni', 'Vikram Shetty',
  'Divya Iyer', 'Aditya Patil', 'Meera Joshi', 'Rahul Hegde', 'Kavya Menon', 'Siddharth Jain', 'Pooja Bhat',
  'Arjun Naik', 'Ishita Verma', 'Nikhil Kumar', 'Shreya Desai', 'Varun Prasad', 'Tanvi Shah', 'Manoj Gupta',
  'Riya Fernandes', 'Harsh Agarwal', 'Neha Pillai', 'Akash Murthy', 'Sanjana Rao', 'Yash Mehta', 'Aishwarya Gowda',
  'Pranav Kamath', 'Lavanya Srinivas', 'Abhishek Singh', 'Deepika Ramesh', 'Gautham Krishna', 'Nandini Hegde',
  'Rakesh Yadav', 'Swathi Shenoy', 'Kunal Malhotra', 'Bhavana Reddy', 'Tejas Acharya', 'Anjali Mishra', 'Suhas Bhat',
  'Keerthana Raj', 'Mohit Chauhan', 'Spoorthi Gowda', 'Vivek Pai', 'Rachana Kini', 'Chetan Kumar', 'Amrutha Varsha',
  'Dhruv Kapoor', 'Sahana Murthy',
];
const CAMPUSES = [
  ...Array(6).fill('NMIT Bangalore'),
  'RV College of Engineering', 'BMS College of Engineering', 'PES University', 'Ramaiah Institute of Technology',
];
const PLACES = {
  'NMIT Bangalore': ['Near NMIT Main Gate', 'NMIT Central Library', 'NMIT Boys Hostel', 'NMIT Girls Hostel', 'NMIT Food Court', 'Near CSE Block, NMIT', 'NMIT Sports Ground', 'Yelahanka New Town'],
  'RV College of Engineering': ['RVCE Main Gate', 'RVCE Canteen'],
  'BMS College of Engineering': ['BMSCE Main Gate', 'BMSCE Library'],
  'PES University': ['PES RR Campus Gate', 'PES Food Court'],
  'Ramaiah Institute of Technology': ['MSRIT Main Gate', 'MSRIT Library'],
};
const GEO_QUERY = {
  'NMIT Bangalore': 'Nitte Meenakshi Institute of Technology, Bengaluru',
  'RV College of Engineering': 'R V College of Engineering, Bengaluru',
  'BMS College of Engineering': 'BMS College of Engineering, Bengaluru',
  'PES University': 'PES University, Bengaluru',
  'Ramaiah Institute of Technology': 'Ramaiah Institute of Technology, Bengaluru',
};
// Every campus here is in Bengaluru; reject matches outside the city (e.g. a same-named college elsewhere).
const inBengaluru = (c) => c && c.latitude > 12.8 && c.latitude < 13.25 && c.longitude > 77.35 && c.longitude < 77.85;

// ── catalogue: [category, title, price, description] ───────────────────────
const ITEMS = [
  ['Electronics', 'boAt Rockerz 450 Bluetooth headphones', 900, 'Good bass, about 12 hours of battery. Slight wear on the ear cushions, otherwise perfect. Charging cable included.'],
  ['Electronics', 'Logitech M235 wireless mouse', 450, 'Smooth and silent, works with any laptop. Nano receiver included. Selling because I switched to a trackpad.'],
  ['Electronics', 'Laptop cooling pad with 3 fans', 550, 'Keeps the laptop cool during long coding sessions. USB powered, adjustable height. Fits up to 15.6 inch.'],
  ['Electronics', 'Redmi Note 10 (6GB / 128GB)', 6500, 'Two years old, no scratches on the screen, always used with a cover. Battery health is good. Box and charger included.'],
  ['Electronics', 'JBL Go 3 portable speaker', 1600, 'Loud and waterproof, perfect for hostel room parties. Bought last year, works like new.'],
  ['Electronics', 'Redragon K552 mechanical keyboard', 1800, 'Red switches, RGB backlight, tenkeyless. Super satisfying to type on. All keys work.'],
  ['Electronics', 'Mi 20000mAh power bank', 800, 'Fast charging, two USB ports. Charges a phone about 4 times. Used for one semester.'],
  ['Electronics', 'Acer 24-inch 1080p monitor', 5500, 'IPS panel, HDMI and VGA ports. Great second screen for coding. Pickup only, comes with stand and cables.'],
  ['Electronics', 'Arduino Uno starter kit with sensors', 1200, 'Uno board, breadboard, LEDs, ultrasonic and temperature sensors, servo motor. Perfect for mini projects.'],
  ['Books', 'Engineering Mathematics by B.S. Grewal', 350, '44th edition, a few pages highlighted in pencil. Covers all four semesters of maths.'],
  ['Books', 'Let Us C by Yashavant Kanetkar', 150, 'Classic beginner C book. Clean copy, no writing inside. Great for first years.'],
  ['Books', 'Data Structures Using C by Reema Thareja', 280, 'Second edition. Very useful for the DS lab and exams. Cover slightly bent.'],
  ['Books', 'Operating System Concepts (Galvin) 10th ed.', 450, 'The dinosaur book. Like new, used only for reference. Original, not a photocopy.'],
  ['Books', 'GATE CSE previous year papers (Made Easy)', 300, 'Solved papers with explanations. Some questions marked. Good for GATE preparation.'],
  ['Books', 'Atomic Habits by James Clear', 250, 'Paperback, read once. Honestly life-changing, passing it on to the next person.'],
  ['Books', 'Computer Networks by Tanenbaum', 400, 'Fifth edition. Needed for the CN course. Good condition with a plastic cover.'],
  ['Books', 'Set of 5 Chetan Bhagat novels', 350, 'Five States, 2 States, Revolution 2020, Half Girlfriend and One Indian Girl. Light reading for the hostel.'],
  ['Furniture', 'Foldable study table', 900, 'Wooden top, folds flat to save space. Perfect for hostel rooms or PG. Sturdy, no wobble.'],
  ['Furniture', 'Nilkamal plastic chair', 400, 'Strong, comfortable, easy to carry. Moving out so selling it cheap.'],
  ['Furniture', 'XL bean bag cover', 600, 'Brown leatherette, XL size. Sold without filling. Washed and clean.'],
  ['Furniture', '3-tier book shelf', 750, 'Metal frame with wooden shelves. Holds plenty of textbooks. Easy to assemble.'],
  ['Furniture', 'Bedside table with drawer', 650, 'Compact table with one drawer. Good for keeping your phone, lamp and water bottle.'],
  ['Furniture', 'Single floor mattress (4 inch)', 1100, 'Foam mattress, used for one year with a cover. Clean and comfortable.'],
  ['Furniture', 'Office chair with armrests', 2200, 'Adjustable height, mesh back, smooth wheels. Very comfortable for long study sessions.'],
  ['Vehicles', 'Hero Sprint 21-gear cycle', 2800, 'Gears work smoothly, new tyres fitted two months ago. Perfect for getting around campus.'],
  ['Vehicles', 'Btwin Rockrider ST20 cycle', 5200, 'Bought from Decathlon last year. Lightweight, comfortable seat. Lock included.'],
  ['Vehicles', 'Honda Activa 4G (2017)', 38000, 'Single owner, 24,000 km, serviced regularly. Insurance valid. All papers ready for transfer.'],
  ['Vehicles', 'Firefox Bad Attitude cycle', 6500, 'Front suspension, disc brakes, 21 gears. Great for longer rides. Very well maintained.'],
  ['Vehicles', 'Bajaj Pulsar 150 (2016)', 42000, '35,000 km, good mileage, new battery. RC and insurance in order. Test ride on campus.'],
  ['Vehicles', 'Atlas ladies cycle with basket', 2500, 'Comfortable and easy to ride, front basket for books. Recently serviced.'],
  ['Clothing', 'NMIT college hoodie (size L)', 500, 'Official fest hoodie, worn a few times. Warm and comfy for early classes.'],
  ['Clothing', 'Navy blue formal blazer (size 40)', 1200, 'Worn twice for presentations. Dry-cleaned. Great for interviews and placements.'],
  ["Clothing", "Levi's 511 jeans (32 waist)", 900, 'Slim fit, dark blue. Original, bought from the Levi’s store. No fading.'],
  ['Clothing', 'Nike running shoes (UK 9)', 1800, 'Lightweight and cushioned. Used for morning runs for about three months.'],
  ['Clothing', 'White lab coat (size M)', 200, 'Needed for chemistry and biology labs. Clean, no stains.'],
  ['Clothing', 'Decathlon winter jacket (size M)', 1100, 'Water-resistant, very warm. Bought for a trek, used once.'],
  ['Clothing', 'Ethnic kurta set for fest (size L)', 700, 'Maroon kurta with pyjama. Worn once for the cultural fest. Like new.'],
  ['Accessories', 'Fastrack analog watch', 800, 'Black leather strap, works perfectly. Comes with the original box.'],
  ['Accessories', 'Wildcraft 35L laptop backpack', 1100, 'Fits a 15.6 inch laptop plus books. Padded straps, rain cover included.'],
  ['Accessories', 'Aviator sunglasses', 350, 'UV protection, comes with a hard case. No scratches on the lenses.'],
  ['Accessories', 'Phone tripod with Bluetooth remote', 400, 'Extendable up to 1.5 m. Great for reels, video calls and recording lectures.'],
  ['Accessories', 'Milton 1L steel water bottle', 250, 'Keeps water cold all day. No dents. Selling because I got a new one as a gift.'],
  ['Accessories', '15.6 inch laptop sleeve', 350, 'Padded, water-resistant sleeve with a front pocket for the charger.'],
  ['Accessories', '6-in-1 USB-C hub', 900, 'HDMI, 2× USB 3.0, SD card, USB-C charging. Works with MacBooks and Windows laptops.'],
  ['Sports', 'Yonex Nanoray badminton racket', 1300, 'Strung recently, grip replaced. Comes with a cover. Great for intermediate players.'],
  ['Sports', 'Cosco football (size 5)', 400, 'Holds air well, used on the college ground a few times.'],
  ['Sports', 'Kashmir willow cricket bat with gloves', 1100, 'Well knocked-in bat plus a pair of batting gloves. Ready for weekend matches.'],
  ['Sports', 'Yoga mat (6mm)', 300, 'Non-slip, includes a carry strap. Cleaned and ready to use.'],
  ['Sports', 'Dumbbell set (2 × 5 kg)', 900, 'Rubber-coated dumbbells. Perfect for working out in the hostel room.'],
  ['Sports', 'Table tennis bats (pair) with balls', 500, 'Two bats and six balls. Good grip, no peeling rubber.'],
  ['Sports', 'Complete skateboard deck', 1500, 'Smooth wheels and good bearings. Small scratches on the deck from use.'],
  ['Sports', 'Wooden tournament chess board', 450, 'Full-size board with weighted pieces. All 32 pieces present.'],
  ['Hostel Essentials', 'Prestige 1.5L electric kettle', 600, 'Boils water in two minutes. Great for Maggi, tea and coffee nights.'],
  ['Hostel Essentials', 'Rechargeable LED table lamp', 450, 'Three brightness levels, about 6 hours of battery. Saves you during power cuts.'],
  ['Hostel Essentials', 'Bucket, mug and stand set', 250, 'Sturdy plastic set. Clean, moving out of the hostel.'],
  ['Hostel Essentials', 'Usha pedestal fan', 1200, 'Three speeds, oscillation works. A lifesaver in summer.'],
  ['Hostel Essentials', '6-socket extension board (3m)', 300, 'Surge protected, long cable. Charge everything at once.'],
  ['Hostel Essentials', 'Philips induction cooktop', 1500, 'Works perfectly, comes with one compatible pan. Makes late-night cooking easy.'],
  ['Hostel Essentials', 'Single-bed mosquito net', 200, 'Easy to hang, no holes. Must-have during the monsoon.'],
  ['Hostel Essentials', 'Godrej 45L mini fridge', 4500, 'Cools well, very quiet. Perfect for drinks and snacks in the room.'],
  ['Academic', 'Casio fx-991EX scientific calculator', 650, 'Exam-approved, all functions working. Comes with the original cover. Used for two semesters.'],
  ['Academic', 'Engineering drawing kit with mini drafter', 400, 'Mini drafter, set squares, compass and protractor. Everything needed for the ED course.'],
  ['Academic', 'First-year lab record books (set of 4)', 150, 'Unused record books for physics, chemistry, C programming and electrical labs.'],
  ['Academic', 'Wacom One graphic tablet', 3500, 'Great for digital notes and design. Pen and USB cable included.'],
  ['Academic', 'IoT mini project kit (ESP8266)', 1500, 'NodeMCU, sensors, relay module and jumper wires. Built a smart-home project with it.'],
  ['Academic', 'Raspberry Pi 4 (4GB) with case', 4200, 'Includes case, fan, power adapter and a 32GB SD card with the OS installed.'],
  ['Academic', 'Printed CSE 3rd semester notes', 200, 'Neatly printed notes for all subjects, with important questions marked.'],
  ['Academic', 'Breadboard, jumper wire and resistor kit', 250, 'Everything needed for electronics labs. Assorted resistors and LEDs included.'],
  ['Other', 'Yamaha F280 acoustic guitar', 5500, 'Great sound, strings changed last month. Comes with a gig bag and picks.'],
  ['Other', 'Fujifilm Instax Mini 11 camera', 3500, 'Instant camera in pastel blue. Includes 10 film sheets. Perfect for fest memories.'],
  ['Other', 'Monopoly (India edition)', 400, 'All pieces and cards present. Fun for hostel game nights.'],
  ['Other', 'Money plant in a ceramic pot', 150, 'Healthy plant, easy to look after. Brightens up any room.'],
  ['Other', 'Soprano ukulele with bag', 1400, 'Easy to learn, stays in tune. Bag and spare strings included.'],
  ['Other', 'Set of 10 wall posters', 150, 'Movies, music and motivational posters. Makes your room feel like home.'],
];

// ── image generation (sticker style, matches the site design) ──────────────
const ICON = {
  Electronics: ['M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25'],
  Books: ['M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25'],
  Furniture: ['M7.5 3.75h9a.75.75 0 0 1 .75.75v6.75h-10.5V4.5a.75.75 0 0 1 .75-.75Z', 'M5.25 11.25h13.5v3H5.25z', 'M7.5 14.25v6M16.5 14.25v6'],
  Vehicles: ['M9.5 16.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z', 'M21.5 16.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z', 'M6 16.5 9.5 9h6l2.5 7.5M9.5 9 8.25 6.75H6.5M15.5 9l1-2.25h2M12 16.5 9.5 9'],
  Clothing: ['M8.25 3.75 3.75 6.375l1.5 4.125 2.25-.75v10.5h9V9.75l2.25.75 1.5-4.125-4.5-2.625c-.375 1.5-1.875 2.625-3.75 2.625s-3.375-1.125-3.75-2.625Z'],
  Accessories: ['M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z'],
  Sports: ['M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0'],
  'Hostel Essentials': ['m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25'],
  Academic: ['M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5'],
  Other: ['m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9'],
};
const POP = ['#ffd43b', '#ff7ab6', '#3ddc97', '#6cc4ff', '#ff9248', '#c4b5fd'];
const BG = {
  Electronics: ['#6cc4ff', '#dbf0ff'], Books: ['#ffd43b', '#fff3bf'], Furniture: ['#ff9248', '#ffe6d4'],
  Vehicles: ['#3ddc97', '#d3f9e6'], Clothing: ['#ff7ab6', '#ffe0ef'], Accessories: ['#c4b5fd', '#ede9fe'],
  Sports: ['#3ddc97', '#d3f9e6'], 'Hostel Essentials': ['#6cc4ff', '#dbf0ff'], Academic: ['#ffd43b', '#fff3bf'],
  Other: ['#ff7ab6', '#ffe0ef'],
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const shortTitle = (t) => {
  const s = t.split(/ \(| by | with /)[0].trim();
  return s.length > 26 ? s.slice(0, 25).trimEnd() + '…' : s;
};

function renderArt(category, title, variant) {
  const ink = '#1a1033';
  const bg = BG[category][variant % 2];
  const a1 = pick(POP);
  const a2 = pick(POP);
  const rot = variant === 0 ? -6 + rand() * 4 : 3 + rand() * 4;
  const label = esc(shortTitle(title));
  const pillW = Math.min(700, label.length * 17 + 70);
  const paths = ICON[category].map((d) => `<path d="${d}"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2.4" fill="${ink}" fill-opacity="0.13"/></pattern></defs>
  <rect width="800" height="600" fill="${bg}"/><rect width="800" height="600" fill="url(#dots)"/>
  <circle cx="${90 + rand() * 60}" cy="${90 + rand() * 50}" r="${70 + rand() * 30}" fill="${a1}" stroke="${ink}" stroke-width="6"/>
  <rect x="${600 + rand() * 60}" y="${330 + rand() * 60}" width="140" height="140" rx="32" transform="rotate(${10 + rand() * 20} 680 420)" fill="${a2}" stroke="${ink}" stroke-width="6"/>
  <circle cx="${640 + rand() * 80}" cy="${90 + rand() * 40}" r="18" fill="#fff" stroke="${ink}" stroke-width="5"/>
  <g transform="rotate(${rot.toFixed(1)} 400 270)">
    <rect x="248" y="102" width="320" height="320" rx="44" fill="${ink}"/>
    <rect x="232" y="86" width="320" height="320" rx="44" fill="#fff" stroke="${ink}" stroke-width="8"/>
    <g transform="translate(272 126) scale(10)" fill="none" stroke="${ink}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
  </g>
  <g transform="rotate(-2 400 500)">
    <rect x="${400 - pillW / 2 + 8}" y="476" width="${pillW}" height="66" rx="33" fill="${ink}"/>
    <rect x="${400 - pillW / 2}" y="468" width="${pillW}" height="66" rx="33" fill="#fff" stroke="${ink}" stroke-width="6"/>
    <text x="400" y="512" text-anchor="middle" font-family="Arial Rounded MT Bold, Helvetica, Arial" font-size="30" fill="${ink}">${label}</text>
  </g>
</svg>`;
  return new Resvg(svg, { font: { loadSystemFonts: true, defaultFontFamily: 'Arial Rounded MT Bold' } }).render().asPng();
}

// ── helpers ─────────────────────────────────────────────────────────────────
const mk = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function geocode(q) {
  try {
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.search = new URLSearchParams({ q, format: 'jsonv2', limit: '1', countrycodes: 'in' }).toString();
    const res = await fetch(u, { headers: { 'Accept-Language': 'en', 'User-Agent': 'campus-marketplace-demo-seed/1.0' } });
    const d = await res.json();
    if (!d.length) return null;
    const r = (n) => Math.round(n * 1000) / 1000;
    return { latitude: r(+d[0].lat), longitude: r(+d[0].lon) };
  } catch {
    return null;
  }
}

let lastSignup = 0;
async function getAccount(name, email, password, campus) {
  const client = mk();
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = lastSignup + SIGNUP_GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastSignup = Date.now();
    const { data, error } = await client.auth.signUp({ email, password, options: { data: { name, campus } } });
    if (!error && data.session) return { client, user: data.user, created: true };
    if (error?.code === 'user_already_exists' || (data?.user && !data.session)) {
      const s = await client.auth.signInWithPassword({ email, password });
      if (s.error) throw new Error(`Sign-in failed for ${email}: ${s.error.message}`);
      return { client, user: s.data.user, created: false };
    }
    if (error?.status === 429 || /rate limit/i.test(error?.message ?? '')) {
      console.log(`   rate-limited, waiting 60s...`);
      await sleep(60_000);
      continue;
    }
    throw new Error(`Sign-up failed for ${email}: ${error?.message ?? 'no session (is "Confirm email" off?)'}`);
  }
  throw new Error(`Gave up on ${email} after repeated rate limits`);
}

// ── main ────────────────────────────────────────────────────────────────────
const saved = existsSync(ACCOUNTS_FILE) ? JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf8')) : null;
const password = saved?.password ?? `Demo-${randomBytes(9).toString('base64url')}9!`;
const people = NAMES.map((name, i) => {
  const [first, last] = name.toLowerCase().split(' ');
  return { name, email: `${first}.${last}@${DOMAIN}`, campus: i === 0 ? 'NMIT Bangalore' : pick(CAMPUSES) };
});
writeFileSync(ACCOUNTS_FILE, JSON.stringify({ note: 'Demo accounts for Campus Marketplace. Do not commit.', password, emails: people.map((p) => p.email) }, null, 2));

console.log('Looking up campus coordinates (OpenStreetMap, 1 req/s)...');
const coords = {};
for (const [campus, q] of Object.entries(GEO_QUERY)) {
  const found = await geocode(q);
  coords[campus] = inBengaluru(found) ? found : null;
  console.log(`   ${campus}: ${coords[campus] ? `${coords[campus].latitude}, ${coords[campus].longitude}` : 'not found'}`);
  await sleep(1200);
}

// Shuffle catalogue and deal: first 25 people get 2 items, the rest get 1.
const items = [...ITEMS].sort(() => rand() - 0.5);
let next = 0;
const accounts = [];
const listings = [];
const t0 = Date.now();

for (const [i, p] of people.entries()) {
  const { client, user, created } = await getAccount(p.name, p.email, password, p.campus);
  accounts.push({ ...p, client, id: user.id });

  const { count } = await client.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', user.id);
  const want = i < 25 ? 2 : 1;
  let made = 0;
  if ((count ?? 0) > 0) next += want; // already seeded on an earlier run: keep the catalogue in step
  for (let k = 0; k < want && (count ?? 0) === 0 && next < items.length; k++) {
    const [category, title, basePrice, description] = items[next++];
    const id = crypto.randomUUID();
    const nImages = rand() < 0.4 ? 2 : 1;
    const paths = [];
    for (let v = 0; v < nImages; v++) {
      const png = renderArt(category, title, v);
      const path = `${user.id}/${id}/${v}-${Date.now()}.png`;
      const up = await client.storage.from(BUCKET).upload(path, png, { contentType: 'image/png', upsert: false });
      if (up.error) throw new Error(`Upload failed: ${up.error.message}`);
      paths.push(path);
    }
    const hasLoc = rand() < 0.75;
    const place = pick(PLACES[p.campus]);
    const c = hasLoc ? coords[p.campus] : null;
    const created_at = daysAgo(Math.floor(rand() * 21), Math.floor(rand() * 20));
    const price = Math.max(50, Math.round((basePrice * (0.9 + rand() * 0.2)) / 10) * 10);
    const row = {
      id, title, description, price, category, image_paths: paths,
      status: rand() < 0.14 ? 'sold' : 'available',
      location_name: hasLoc ? place : null,
      latitude: c?.latitude ?? null, longitude: c?.longitude ?? null,
      created_at, updated_at: created_at,
    };
    const ins = await client.from('listings').insert(row).select('id, seller_id, status, title, price, location_name, created_at').single();
    if (ins.error) throw new Error(`Insert failed: ${ins.error.message}`);
    listings.push(ins.data);
    made++;
  }
  const mins = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`[${String(i + 1).padStart(2)}/50] ${p.name.padEnd(18)} ${created ? 'created' : 'existing'} · ${made} listing(s) · ${mins} min`);
}

// Favourites: each person saves 0–4 other people's listings.
let favs = 0;
for (const a of accounts) {
  const others = listings.filter((l) => l.seller_id !== a.id);
  const n = Math.floor(rand() * 5);
  for (let k = 0; k < n; k++) {
    const l = pick(others);
    const { error } = await a.client.from('favorites').insert({ listing_id: l.id });
    if (!error) favs++;
  }
}
console.log(`Favourites added: ${favs}`);

// Chats: 15 buyer–seller conversations on available listings.
let chats = 0;
const available = listings.filter((l) => l.status === 'available');
const used = new Set();
for (let k = 0; k < 15 && available.length; k++) {
  const l = pick(available);
  const seller = accounts.find((a) => a.id === l.seller_id);
  const buyer = pick(accounts.filter((a) => a.id !== l.seller_id));
  const key = `${l.id}:${buyer.id}`;
  if (!seller || used.has(key)) continue;
  used.add(key);
  const ch = await buyer.client.from('chats').insert({ listing_id: l.id, seller_id: seller.id }).select('id').single();
  if (ch.error) continue;
  const offer = Math.round((l.price * 0.85) / 10) * 10;
  const meet = l.location_name ?? 'the library';
  const script = [
    [buyer, `Hi ${seller.name.split(' ')[0]}! Is the ${shortTitle(l.title)} still available?`],
    [seller, 'Yes, it is! Let me know if you have any questions.'],
    [buyer, `Would you take ₹${offer.toLocaleString('en-IN')}?`],
    [seller, `Okay, ₹${offer.toLocaleString('en-IN')} works. Can we meet at ${meet} tomorrow around 4?`],
    [buyer, 'Perfect, see you there!'],
  ].slice(0, 2 + Math.floor(rand() * 4));
  const start = new Date(l.created_at).getTime() + 3600e3 * (2 + rand() * 20);
  for (const [j, [who, body]] of script.entries()) {
    const at = new Date(Math.min(Date.now() - 60e3, start + j * 7 * 60e3)).toISOString();
    await who.client.from('messages').insert({ chat_id: ch.data.id, body, created_at: at });
  }
  chats++;
}
console.log(`Chats created: ${chats}`);

console.log(`\nDone: ${accounts.length} accounts, ${listings.length} listings (${listings.filter((l) => l.status === 'sold').length} sold).`);
console.log(`Demo password saved in ${ACCOUNTS_FILE}`);
