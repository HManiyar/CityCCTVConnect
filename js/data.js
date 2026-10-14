/*
 * CityConnect — initial demo dataset
 * ------------------------------------------------------------------
 * IMPORTANT: Every vendor business, person, contact detail, rating,
 * review, certification and verification flag in this file is
 * FICTIONAL SAMPLE DATA created for demonstration purposes only.
 * Phone numbers use placeholder ranges and e-mail addresses use the
 * reserved ".example" domain so nothing here can reach a real party.
 *
 * The dataset is loaded into LocalStorage only when the app has no
 * saved state (see js/store.js). Dates are expressed relative to
 * "today" so the demo always looks current.
 */
(function () {
  'use strict';

  const UNSPLASH = (id) => `https://images.unsplash.com/photo-${id}`;

  // Stock photography (Unsplash). Each image has a local SVG fallback.
  const IMAGES = {
    cctvWall: UNSPLASH('1557597774-9d273605dfa9'),
    cctvBlack: UNSPLASH('1558002038-1055907df827'),
    cctvDome: UNSPLASH('1590479773265-7464e5d48118'),
    officeTower: UNSPLASH('1486406146926-c627a92ad1ab'),
    officeInterior: UNSPLASH('1497366216548-37526070297c'),
    workspace: UNSPLASH('1504384308090-c894fdcc538d'),
    warehouse: UNSPLASH('1586528116311-ad8dd3c8310d'),
    warehouseTeam: UNSPLASH('1553413077-190dd305871c'),
    retail: UNSPLASH('1441986300917-64674bd600d8'),
    serverRoom: UNSPLASH('1558494949-ef010cbdcc31'),
    networkCables: UNSPLASH('1544197150-b99a580bb7a8'),
    technician: UNSPLASH('1581092160562-40aa08e78837'),
    electrician: UNSPLASH('1621905251189-08b45d6a269e'),
    security: UNSPLASH('1563986768609-322da13575f3'),
    residential: UNSPLASH('1545324418-cc1a3fa10c00'),
    factory: UNSPLASH('1565043666747-69f6646db940')
  };

  const ORGANIZATION = {
    name: 'Sapphire Retail & Logistics Pvt. Ltd.',
    hqCity: 'ahmedabad',
    user: {
      name: 'Nisha Mehta',
      title: 'Facilities Manager',
      email: 'nisha.mehta@sapphire-retail.example',
      phone: '+91 90000 10021'
    }
  };

  // Gujarat cities. lat/lng are approximate and used for the coverage map.
  const CITIES = [
    { id: 'ahmedabad', name: 'Ahmedabad', district: 'Ahmedabad', region: 'Central Gujarat', lat: 23.02, lng: 72.57, pinPrefixes: ['380', '382'], pins: ['380001', '380009', '380015', '380051', '380054', '382330', '382445'], localities: ['SG Highway', 'Prahlad Nagar', 'Navrangpura', 'Bodakdev', 'Vastrapur', 'Naroda GIDC', 'Vatva GIDC', 'Satellite'] },
    { id: 'rajkot', name: 'Rajkot', district: 'Rajkot', region: 'Saurashtra', lat: 22.30, lng: 70.80, pinPrefixes: ['360'], pins: ['360001', '360002', '360003', '360004', '360005', '360007', '360024'], localities: ['Kalawad Road', 'Raiya Road', '150 Feet Ring Road', 'Aji GIDC', 'Mavdi', 'Gondal Road', 'Yagnik Road', 'Metoda GIDC'] },
    { id: 'surat', name: 'Surat', district: 'Surat', region: 'South Gujarat', lat: 21.17, lng: 72.83, pinPrefixes: ['394', '395'], pins: ['395001', '395003', '395007', '395009', '394221', '394230'], localities: ['Adajan', 'Vesu', 'Ring Road', 'Udhna', 'Sachin GIDC', 'Varachha', 'Piplod'] },
    { id: 'vadodara', name: 'Vadodara', district: 'Vadodara', region: 'Central Gujarat', lat: 22.31, lng: 73.18, pinPrefixes: ['390', '391'], pins: ['390001', '390007', '390010', '390020', '390021', '391760'], localities: ['Alkapuri', 'Makarpura GIDC', 'Gotri', 'Akota', 'Sayajigunj', 'Waghodia Road'] },
    { id: 'jamnagar', name: 'Jamnagar', district: 'Jamnagar', region: 'Saurashtra', lat: 22.47, lng: 70.06, pinPrefixes: ['361'], pins: ['361001', '361004', '361005', '361008'], localities: ['Digvijay Plot', 'Shanker Tekri GIDC', 'Patel Colony', 'Bedi Port Road'] },
    { id: 'bhavnagar', name: 'Bhavnagar', district: 'Bhavnagar', region: 'Saurashtra', lat: 21.76, lng: 72.15, pinPrefixes: ['364'], pins: ['364001', '364002', '364003', '364004'], localities: ['Waghawadi Road', 'Kalanala', 'Chitra GIDC', 'Sardarnagar'] },
    { id: 'gandhinagar', name: 'Gandhinagar', district: 'Gandhinagar', region: 'North Gujarat', lat: 23.22, lng: 72.65, pinPrefixes: ['382'], pins: ['382007', '382010', '382016', '382021', '382355'], localities: ['Infocity', 'Sector 11', 'GIFT City', 'Kudasan', 'Sargasan'] },
    { id: 'junagadh', name: 'Junagadh', district: 'Junagadh', region: 'Saurashtra', lat: 21.52, lng: 70.46, pinPrefixes: ['362'], pins: ['362001', '362002', '362015'], localities: ['Zanzarda Road', 'Motibaug', 'Timbawadi', 'Joshipura'] },
    { id: 'anand', name: 'Anand', district: 'Anand', region: 'Central Gujarat', lat: 22.56, lng: 72.95, pinPrefixes: ['388'], pins: ['388001', '388120', '388121'], localities: ['Vallabh Vidyanagar', 'Grid Road', 'Anand GIDC'] },
    { id: 'morbi', name: 'Morbi', district: 'Morbi', region: 'Saurashtra', lat: 22.82, lng: 70.84, pinPrefixes: ['363'], pins: ['363641', '363642'], localities: ['Lalpar Ceramic Zone', 'Sanala Road', 'Ravapar Road', '8-A National Highway'] },
    { id: 'mehsana', name: 'Mehsana', district: 'Mehsana', region: 'North Gujarat', lat: 23.60, lng: 72.37, pinPrefixes: ['384'], pins: ['384001', '384002', '384003'], localities: ['Modhera Road', 'Radhanpur Road', 'Mehsana GIDC'] },
    { id: 'bhuj', name: 'Bhuj', district: 'Kutch', region: 'Kutch', lat: 23.25, lng: 69.67, pinPrefixes: ['370'], pins: ['370001', '370020', '370040'], localities: ['Hospital Road', 'Mirzapar', 'Madhapar'] }
  ];

  const SERVICES = [
    { id: 'install', name: 'New CCTV Installation', short: 'Installation', kind: 'installation', icon: 'cctv', desc: 'Site survey, camera placement, cabling and commissioning of new systems.' },
    { id: 'maintenance', name: 'CCTV Maintenance', short: 'Maintenance', kind: 'maintenance', icon: 'wrench', desc: 'Preventive servicing, cleaning, health checks and firmware updates.' },
    { id: 'replacement', name: 'Camera Replacement', short: 'Replacement', kind: 'maintenance', icon: 'refresh', desc: 'Swap faulty or outdated cameras with like-for-like or upgraded units.' },
    { id: 'troubleshooting', name: 'CCTV Troubleshooting', short: 'Troubleshooting', kind: 'maintenance', icon: 'activity', desc: 'Diagnose video loss, recording gaps, network and power issues.' },
    { id: 'nvr', name: 'NVR Setup & Configuration', short: 'NVR Setup', kind: 'installation', icon: 'server', desc: 'Network video recorder installation, storage planning and remote access.' },
    { id: 'relocation', name: 'Camera Relocation', short: 'Relocation', kind: 'installation', icon: 'move', desc: 'Re-position cameras after layout changes or renovations.' },
    { id: 'amc', name: 'Annual Maintenance Contract', short: 'AMC', kind: 'maintenance', icon: 'calendarCheck', desc: 'Scheduled quarterly visits with priority breakdown support.' },
    { id: 'emergency', name: 'Emergency Repair', short: 'Emergency', kind: 'maintenance', icon: 'siren', desc: 'Rapid-response repair for critical surveillance failures.' }
  ];

  const SITE_TYPES = [
    { id: 'office', name: 'Corporate office' },
    { id: 'warehouse', name: 'Warehouse / distribution centre' },
    { id: 'retail', name: 'Retail store' },
    { id: 'factory', name: 'Factory / manufacturing unit' },
    { id: 'residential', name: 'Residential complex' },
    { id: 'hospital', name: 'Hospital / clinic' },
    { id: 'school', name: 'School / campus' },
    { id: 'hotel', name: 'Hotel / hospitality' },
    { id: 'other', name: 'Other' }
  ];

  const SITE_SIZES = ['Under 2,000 sq ft', '2,000 – 10,000 sq ft', '10,000 – 50,000 sq ft', '50,000 – 1,00,000 sq ft', 'Above 1,00,000 sq ft'];
  const INFRASTRUCTURE = ['No existing system (new site)', 'Analog cameras with DVR', 'IP cameras with NVR', 'Mixed / partially working system', 'Not sure'];
  const TIME_SLOTS = [
    { id: 'morning', name: 'Morning (9 AM – 12 PM)' },
    { id: 'afternoon', name: 'Afternoon (12 PM – 4 PM)' },
    { id: 'evening', name: 'Evening (4 PM – 7 PM)' }
  ];
  const URGENCY = [
    { id: 'standard', name: 'Standard', hint: 'Within 1–2 weeks' },
    { id: 'priority', name: 'Priority', hint: 'Within 3 days' },
    { id: 'emergency', name: 'Emergency', hint: 'Within 24 hours' }
  ];
  const WARRANTY_OPTIONS = ['6 months on labour', '1 year on labour & equipment', '2 years on equipment, 1 year labour', '3 years comprehensive'];

  /*
   * Vendor directory (fictional).
   * pricing.perCamera: indicative installed price per camera (₹, equipment + labour)
   * pricing.visit:     indicative maintenance / troubleshooting visit charge (₹)
   * pricing.amc:       indicative AMC price per camera per year (₹)
   * nextAvailableDays: days until the earliest available slot (0 = today)
   */
  const VENDORS = [
    {
      id: 'v-ssv', name: 'Saurashtra SecureVision Pvt. Ltd.', initials: 'SV', color: '#1d4ed8',
      baseCity: 'rajkot', cities: ['rajkot', 'morbi', 'jamnagar', 'junagadh'], radiusKm: 120, founded: 2011,
      services: ['install', 'maintenance', 'nvr', 'amc', 'emergency', 'troubleshooting', 'replacement'],
      rating: 4.7, reviewCount: 186, experience: 15, teamSize: 38, projects: 640,
      pricing: { perCamera: 2200, visit: 750, amc: 1100 }, nextAvailableDays: 1, responseHours: 2, emergency: true, verified: true,
      tagline: 'Enterprise-grade surveillance for Saurashtra’s industrial belt',
      description: 'Saurashtra SecureVision designs, installs and maintains IP surveillance systems for factories, warehouses and multi-site retailers across Rajkot and nearby districts. Their in-house network team handles structured cabling, NVR storage planning and remote monitoring set-up.',
      contact: { person: 'Hardik Vaghasiya', role: 'Head of Projects', phone: '+91 90000 41001', email: 'projects@saurashtrasecure.example', address: '4th Floor, Crystal Arcade, 150 Feet Ring Road, Rajkot 360005' },
      hours: 'Mon – Sat, 9:00 AM – 7:30 PM', emergencyLine: '24×7 emergency response line',
      certifications: ['ISO 9001:2015 quality management (sample)', 'Licensed electrical contractor (sample)', 'OEM-trained IP surveillance engineers (sample)'],
      equipment: ['4K & 8MP IP cameras', 'PTZ & ANPR cameras', 'Thermal perimeter cameras', 'Enterprise NVRs with RAID storage', 'Fibre & PoE networking', 'Video analytics & VMS'],
      pins: ['360001', '360002', '360003', '360004', '360005', '360024', '363641', '361004', '362001'],
      portfolio: ['Ceramic plant perimeter coverage, Morbi', 'Cold-storage warehouse, Aji GIDC', 'Multi-storey retail showroom, Kalawad Road', 'Logistics yard ANPR, Jamnagar']
    },
    {
      id: 'v-kss', name: 'Kathiawar Surveillance Systems', initials: 'KS', color: '#0f766e',
      baseCity: 'rajkot', cities: ['rajkot', 'morbi', 'junagadh'], radiusKm: 80, founded: 2017,
      services: ['install', 'maintenance', 'troubleshooting', 'replacement', 'relocation'],
      rating: 4.4, reviewCount: 92, experience: 9, teamSize: 16, projects: 310,
      pricing: { perCamera: 1650, visit: 500, amc: 850 }, nextAvailableDays: 0, responseHours: 4, emergency: false, verified: true,
      tagline: 'Practical, well-documented CCTV installations',
      description: 'Kathiawar Surveillance Systems focuses on small and mid-sized commercial sites. Known for neat cable management, clear handover documentation and quick turnaround on camera relocation and replacement work.',
      contact: { person: 'Mitesh Kotecha', role: 'Proprietor', phone: '+91 90000 41002', email: 'hello@kathiawarsurveillance.example', address: 'Shop 12, Raiya Road Commercial Hub, Rajkot 360007' },
      hours: 'Mon – Sat, 9:30 AM – 7:00 PM', emergencyLine: 'Emergency visits not offered',
      certifications: ['Udyam registered MSME (sample)', 'OEM installation training (sample)'],
      equipment: ['HD analog & IP cameras', 'DVR / NVR systems', 'Structured cabling', 'Mobile remote viewing set-up'],
      pins: ['360001', '360002', '360007', '363641', '362001'],
      portfolio: ['Showroom refit & camera relocation, Raiya Road', 'School campus coverage, Junagadh', 'Office block retrofit, Yagnik Road', 'Tile showroom, Morbi']
    },
    {
      id: 'v-shreeji', name: 'Shreeji CCTV & Security Solutions', initials: 'SC', color: '#b45309',
      baseCity: 'rajkot', cities: ['rajkot'], radiusKm: 35, founded: 2021,
      services: ['install', 'maintenance', 'troubleshooting', 'replacement', 'emergency'],
      rating: 4.1, reviewCount: 47, experience: 5, teamSize: 7, projects: 120,
      pricing: { perCamera: 1350, visit: 400, amc: 700 }, nextAvailableDays: 0, responseHours: 3, emergency: true, verified: false,
      tagline: 'Affordable CCTV for shops, clinics and offices',
      description: 'A compact local team offering budget-friendly installations and same-day troubleshooting within Rajkot city limits. Suitable for small retail outlets, clinics and branch offices.',
      contact: { person: 'Jignesh Parmar', role: 'Founder', phone: '+91 90000 41003', email: 'support@shreejicctv.example', address: 'Mavdi Main Road, Near Bapa Sitaram Chowk, Rajkot 360004' },
      hours: 'Mon – Sun, 10:00 AM – 8:00 PM', emergencyLine: 'Same-day emergency visits within Rajkot',
      certifications: ['Udyam registered MSME (sample)'],
      equipment: ['HD analog cameras', 'Entry-level IP cameras', 'DVR / NVR set-up', 'Wi-Fi cameras'],
      pins: ['360001', '360004', '360005'],
      portfolio: ['Clinic reception & pharmacy, Mavdi', 'Mobile store chain, Kalawad Road', 'Branch office, Gondal Road', 'Bakery outlet, Yagnik Road']
    },
    {
      id: 'v-neteye', name: 'NetEye Technologies Pvt. Ltd.', initials: 'NE', color: '#4338ca',
      baseCity: 'ahmedabad', cities: ['ahmedabad', 'gandhinagar', 'mehsana', 'anand'], radiusKm: 90, founded: 2014,
      services: ['install', 'nvr', 'amc', 'maintenance', 'troubleshooting', 'relocation'],
      rating: 4.8, reviewCount: 241, experience: 12, teamSize: 52, projects: 910,
      pricing: { perCamera: 2600, visit: 850, amc: 1300 }, nextAvailableDays: 2, responseHours: 2, emergency: true, verified: true,
      tagline: 'Networked surveillance for corporate campuses',
      description: 'NetEye Technologies delivers IP surveillance, access-control integration and centralised monitoring for corporate offices, IT parks and campuses in and around Ahmedabad. Dedicated AMC desk with quarterly health reports.',
      contact: { person: 'Kunal Shah', role: 'Business Development Manager', phone: '+91 90000 41004', email: 'enterprise@neteyetech.example', address: '1102, Titanium Heights, Corporate Road, Prahlad Nagar, Ahmedabad 380015' },
      hours: 'Mon – Sat, 9:00 AM – 7:00 PM', emergencyLine: '24×7 helpdesk for AMC customers',
      certifications: ['ISO 9001:2015 & ISO 27001 (sample)', 'Certified network engineers (sample)', 'Licensed electrical contractor (sample)'],
      equipment: ['4K IP & fisheye cameras', 'Centralised VMS', 'Access-control integration', 'Cloud backup & remote monitoring', 'Fibre backbone'],
      pins: ['380009', '380015', '380051', '380054', '382010', '382355', '384001', '388001'],
      portfolio: ['Corporate HQ, SG Highway', 'IT park, GIFT City', 'Hospital campus, Bodakdev', 'Data centre perimeter, Gandhinagar']
    },
    {
      id: 'v-gujsecure', name: 'GujSecure Infra Pvt. Ltd.', initials: 'GS', color: '#0b1e44',
      baseCity: 'ahmedabad', cities: ['ahmedabad', 'rajkot', 'surat', 'vadodara', 'jamnagar', 'bhavnagar', 'gandhinagar', 'anand'], radiusKm: 400, founded: 2008,
      services: ['install', 'maintenance', 'replacement', 'troubleshooting', 'nvr', 'relocation', 'amc', 'emergency'],
      rating: 4.6, reviewCount: 312, experience: 18, teamSize: 140, projects: 2100,
      pricing: { perCamera: 2900, visit: 1000, amc: 1450 }, nextAvailableDays: 5, responseHours: 6, emergency: true, verified: true,
      tagline: 'State-wide security infrastructure partner',
      description: 'GujSecure Infra runs project teams in eight Gujarat cities and specialises in large multi-site roll-outs, city-scale camera networks and industrial security. A single point of contact coordinates installation, compliance documentation and AMC across locations.',
      contact: { person: 'Priya Desai', role: 'Key Accounts Lead', phone: '+91 90000 41005', email: 'keyaccounts@gujsecure.example', address: 'GujSecure House, Sindhu Bhavan Road, Bodakdev, Ahmedabad 380054' },
      hours: 'Mon – Sat, 9:00 AM – 8:00 PM', emergencyLine: '24×7 national operations centre',
      certifications: ['ISO 9001:2015 & ISO 45001 (sample)', 'Licensed electrical contractor (sample)', 'Large-project safety programme (sample)'],
      equipment: ['City-surveillance & PTZ cameras', 'ANPR & face-recognition analytics', 'Thermal & explosion-proof cameras', 'Command-centre video walls', 'Redundant storage clusters'],
      pins: ['380054', '360005', '395007', '390007', '361004', '364002', '382010', '388001'],
      portfolio: ['Multi-site retail roll-out, 8 cities', 'Port logistics park, Jamnagar', 'Industrial estate, Vadodara', 'Textile market, Surat']
    },
    {
      id: 'v-suraksha', name: 'Suraksha Integrated Systems LLP', initials: 'SI', color: '#7c3aed',
      baseCity: 'surat', cities: ['surat', 'vadodara', 'anand'], radiusKm: 110, founded: 2015,
      services: ['install', 'nvr', 'amc', 'maintenance', 'emergency'],
      rating: 4.5, reviewCount: 128, experience: 11, teamSize: 34, projects: 480,
      pricing: { perCamera: 2100, visit: 700, amc: 1000 }, nextAvailableDays: 2, responseHours: 3, emergency: true, verified: true,
      tagline: 'Integrated security for South Gujarat industry',
      description: 'Suraksha Integrated Systems installs CCTV, NVR storage and intrusion alarms for textile units, chemical plants and warehouses across the Surat–Vadodara corridor, with AMC plans that include quarterly preventive visits.',
      contact: { person: 'Rohan Patel', role: 'Operations Manager', phone: '+91 90000 41006', email: 'ops@surakshaintegrated.example', address: 'B-204, Western Business Park, Vesu, Surat 395007' },
      hours: 'Mon – Sat, 9:30 AM – 7:00 PM', emergencyLine: 'Emergency response for AMC customers',
      certifications: ['ISO 9001:2015 (sample)', 'OEM-trained engineers (sample)'],
      equipment: ['IP bullet & dome cameras', 'Explosion-proof housings', 'NVR with hot-swap storage', 'Intrusion alarm panels'],
      pins: ['395001', '395007', '394230', '390010', '388001'],
      portfolio: ['Textile unit, Sachin GIDC', 'Chemical warehouse, Vadodara', 'Diamond office, Varachha', 'College campus, Anand']
    },
    {
      id: 'v-diamond', name: 'Diamond City Security Networks', initials: 'DC', color: '#be123c',
      baseCity: 'surat', cities: ['surat'], radiusKm: 40, founded: 2019,
      services: ['install', 'maintenance', 'troubleshooting', 'replacement', 'emergency'],
      rating: 4.3, reviewCount: 76, experience: 7, teamSize: 12, projects: 260,
      pricing: { perCamera: 1550, visit: 500, amc: 800 }, nextAvailableDays: 0, responseHours: 2, emergency: true, verified: false,
      tagline: 'Fast response CCTV service across Surat',
      description: 'Diamond City Security Networks offers quick-turnaround installation and repair for showrooms, offices and residential societies in Surat, with a mobile service team covering the city every day of the week.',
      contact: { person: 'Sneha Mistry', role: 'Service Coordinator', phone: '+91 90000 41007', email: 'service@diamondcitysecurity.example', address: '15, Shreeji Complex, Ring Road, Surat 395003' },
      hours: 'Mon – Sun, 9:00 AM – 9:00 PM', emergencyLine: 'Same-day emergency response in Surat',
      certifications: ['Udyam registered MSME (sample)'],
      equipment: ['HD analog & IP cameras', 'Wi-Fi & 4G cameras', 'DVR / NVR', 'Video door phones'],
      pins: ['395001', '395003', '395009'],
      portfolio: ['Jewellery showroom, Ghod Dod Road', 'Residential society, Adajan', 'Office floor, Ring Road', 'Restaurant chain, Vesu']
    },
    {
      id: 'v-barodian', name: 'Barodian VisionTech', initials: 'BV', color: '#0369a1',
      baseCity: 'vadodara', cities: ['vadodara', 'anand', 'ahmedabad'], radiusKm: 100, founded: 2016,
      services: ['install', 'nvr', 'relocation', 'maintenance', 'amc', 'troubleshooting'],
      rating: 4.6, reviewCount: 104, experience: 10, teamSize: 26, projects: 420,
      pricing: { perCamera: 2000, visit: 650, amc: 950 }, nextAvailableDays: 3, responseHours: 4, emergency: false, verified: true,
      tagline: 'Engineering-led surveillance design',
      description: 'Barodian VisionTech provides camera-coverage design, installation and NVR configuration for manufacturing units and offices in Vadodara and Anand, including coverage drawings and storage calculations with every proposal.',
      contact: { person: 'Aditya Joshi', role: 'Technical Director', phone: '+91 90000 41008', email: 'design@barodianvision.example', address: '302, Sapphire Complex, Alkapuri, Vadodara 390007' },
      hours: 'Mon – Sat, 9:30 AM – 6:30 PM', emergencyLine: 'Next-business-day breakdown support',
      certifications: ['ISO 9001:2015 (sample)', 'Licensed electrical contractor (sample)'],
      equipment: ['IP cameras with analytics', 'Coverage design & drawings', 'NVR storage planning', 'PoE & fibre networking'],
      pins: ['390001', '390007', '390010', '390020', '388001', '380015'],
      portfolio: ['Engineering plant, Makarpura GIDC', 'Corporate office, Alkapuri', 'Dairy processing unit, Anand', 'Hospital wing, Gotri']
    },
    {
      id: 'v-navanagar', name: 'Navanagar Security Services', initials: 'NS', color: '#047857',
      baseCity: 'jamnagar', cities: ['jamnagar', 'rajkot', 'morbi'], radiusKm: 100, founded: 2013,
      services: ['install', 'maintenance', 'amc', 'replacement', 'troubleshooting', 'emergency'],
      rating: 4.5, reviewCount: 88, experience: 13, teamSize: 22, projects: 370,
      pricing: { perCamera: 1850, visit: 600, amc: 900 }, nextAvailableDays: 1, responseHours: 3, emergency: true, verified: true,
      tagline: 'Reliable surveillance for brass, port and refinery-belt industry',
      description: 'Navanagar Security Services supports brass-part manufacturers, logistics companies and retail outlets across Jamnagar, Rajkot and Morbi with installation, AMC and rapid breakdown service.',
      contact: { person: 'Imran Sumra', role: 'Service Head', phone: '+91 90000 41009', email: 'service@navanagarsecurity.example', address: 'Plot 88, Shanker Tekri GIDC, Jamnagar 361004' },
      hours: 'Mon – Sat, 9:00 AM – 7:00 PM', emergencyLine: '24×7 emergency line for industrial clients',
      certifications: ['ISO 9001:2015 (sample)', 'Industrial safety trained crew (sample)'],
      equipment: ['IP & HD analog cameras', 'Weather-proof PTZ', 'NVR / DVR', 'Solar-powered remote cameras'],
      pins: ['361001', '361004', '361005', '360002', '360024', '363641'],
      portfolio: ['Brass component unit, Shanker Tekri', 'Transport yard, Rajkot', 'Retail mall, Digvijay Plot', 'Ceramic warehouse, Morbi']
    },
    {
      id: 'v-sabarmati', name: 'Sabarmati Smart Surveillance', initials: 'SS', color: '#0e7490',
      baseCity: 'gandhinagar', cities: ['gandhinagar', 'ahmedabad', 'mehsana'], radiusKm: 60, founded: 2020,
      services: ['install', 'nvr', 'troubleshooting', 'relocation'],
      rating: 4.2, reviewCount: 54, experience: 6, teamSize: 11, projects: 150,
      pricing: { perCamera: 1700, visit: 550, amc: 880 }, nextAvailableDays: 1, responseHours: 5, emergency: false, verified: false,
      tagline: 'Smart cameras and remote viewing, simply set up',
      description: 'Sabarmati Smart Surveillance installs smart IP cameras with mobile apps and cloud recording for offices, co-working spaces and residential towers in Gandhinagar and Ahmedabad.',
      contact: { person: 'Dhruv Trivedi', role: 'Co-founder', phone: '+91 90000 41010', email: 'team@sabarmatismart.example', address: 'Shop 7, Pramukh Arcade, Kudasan, Gandhinagar 382421' },
      hours: 'Mon – Sat, 10:00 AM – 7:00 PM', emergencyLine: 'Emergency visits not offered',
      certifications: ['Startup India recognised (sample)'],
      equipment: ['Smart IP cameras', 'Cloud recording', 'Mobile app set-up', 'Compact NVRs'],
      pins: ['382010', '382016', '382421', '380054', '384001'],
      portfolio: ['Co-working space, GIFT City', 'Residential tower, Kudasan', 'Office relocation, Infocity', 'Retail kiosk, Sargasan']
    },
    {
      id: 'v-gohilwad', name: 'Gohilwad Electronics & CCTV', initials: 'GE', color: '#9333ea',
      baseCity: 'bhavnagar', cities: ['bhavnagar', 'junagadh'], radiusKm: 90, founded: 2010,
      services: ['install', 'maintenance', 'replacement', 'troubleshooting', 'amc'],
      rating: 4.4, reviewCount: 69, experience: 16, teamSize: 18, projects: 520,
      pricing: { perCamera: 1500, visit: 450, amc: 780 }, nextAvailableDays: 2, responseHours: 6, emergency: false, verified: true,
      tagline: 'Long-standing electronics and CCTV specialists',
      description: 'Gohilwad Electronics & CCTV has served Bhavnagar’s retail, shipping and education sectors for over 15 years, with dependable AMC programmes and a well-stocked spares inventory.',
      contact: { person: 'Bhavesh Gohil', role: 'Managing Partner', phone: '+91 90000 41011', email: 'info@gohilwadelectronics.example', address: 'Waghawadi Road, Near Crescent Circle, Bhavnagar 364002' },
      hours: 'Mon – Sat, 9:30 AM – 7:30 PM', emergencyLine: 'Priority visits for AMC customers',
      certifications: ['Udyam registered MSME (sample)', 'OEM installation training (sample)'],
      equipment: ['HD analog & IP cameras', 'DVR / NVR', 'Spare parts inventory', 'Public-address integration'],
      pins: ['364001', '364002', '364003', '362001'],
      portfolio: ['School campus, Sardarnagar', 'Shipping office, Kalanala', 'Supermarket, Waghawadi Road', 'Hostel, Junagadh']
    },
    {
      id: 'v-girnar', name: 'Girnar TechGuard Services', initials: 'GT', color: '#c2410c',
      baseCity: 'junagadh', cities: ['junagadh', 'rajkot'], radiusKm: 110, founded: 2018,
      services: ['install', 'maintenance', 'emergency', 'troubleshooting'],
      rating: 4.3, reviewCount: 41, experience: 8, teamSize: 10, projects: 190,
      pricing: { perCamera: 1600, visit: 500, amc: 820 }, nextAvailableDays: 4, responseHours: 5, emergency: true, verified: true,
      tagline: 'Dependable CCTV support across Sorath',
      description: 'Girnar TechGuard Services installs and maintains CCTV systems for hotels, temples, schools and retail outlets in Junagadh, with regular service trips to Rajkot.',
      contact: { person: 'Ketan Dave', role: 'Proprietor', phone: '+91 90000 41012', email: 'care@girnartechguard.example', address: 'Zanzarda Road, Opp. Bus Depot, Junagadh 362001' },
      hours: 'Mon – Sat, 9:00 AM – 7:00 PM', emergencyLine: 'Emergency visits within Junagadh',
      certifications: ['Udyam registered MSME (sample)'],
      equipment: ['HD analog & IP cameras', 'Solar CCTV', 'DVR / NVR', '4G remote cameras'],
      pins: ['362001', '362002', '360004'],
      portfolio: ['Heritage hotel, Junagadh', 'School campus, Joshipura', 'Showroom, Motibaug', 'Farmhouse perimeter, Gondal Road']
    },
    {
      id: 'v-kutch', name: 'Kutch WatchTower Systems', initials: 'KW', color: '#a16207',
      baseCity: 'bhuj', cities: ['bhuj', 'jamnagar'], radiusKm: 150, founded: 2017,
      services: ['install', 'maintenance', 'amc', 'nvr'],
      rating: 4.0, reviewCount: 33, experience: 9, teamSize: 9, projects: 140,
      pricing: { perCamera: 1900, visit: 800, amc: 950 }, nextAvailableDays: 6, responseHours: 8, emergency: false, verified: false,
      tagline: 'Rugged surveillance for remote and coastal sites',
      description: 'Kutch WatchTower Systems specialises in solar-powered and long-range wireless camera links for salt pans, wind farms and remote warehouses across Kutch.',
      contact: { person: 'Farhan Node', role: 'Project Engineer', phone: '+91 90000 41013', email: 'projects@kutchwatchtower.example', address: 'Hospital Road, Bhuj 370001' },
      hours: 'Mon – Sat, 9:30 AM – 6:30 PM', emergencyLine: 'Emergency visits not offered',
      certifications: ['Wireless link installation training (sample)'],
      equipment: ['Solar CCTV towers', 'Point-to-point wireless links', 'Long-range IR cameras', 'Edge storage NVRs'],
      pins: ['370001', '370020', '361004'],
      portfolio: ['Wind farm substation, Kutch', 'Salt works perimeter', 'Remote warehouse, Mirzapar', 'Port office, Jamnagar']
    },
    {
      id: 'v-vishwas', name: 'Vishwas Security Solutions', initials: 'VS', color: '#2563eb',
      baseCity: 'morbi', cities: ['morbi', 'rajkot'], radiusKm: 70, founded: 2019,
      services: ['install', 'maintenance', 'troubleshooting', 'replacement', 'nvr'],
      rating: 4.5, reviewCount: 58, experience: 7, teamSize: 14, projects: 230,
      pricing: { perCamera: 1750, visit: 550, amc: 850 }, nextAvailableDays: 1, responseHours: 3, emergency: true, verified: true,
      tagline: 'Factory-floor CCTV specialists for the ceramic cluster',
      description: 'Vishwas Security Solutions focuses on ceramic and packaging factories in Morbi, providing dust-resistant camera installations, kiln-area monitoring and NVR set-up, with frequent project work in Rajkot.',
      contact: { person: 'Nilesh Aghara', role: 'Director', phone: '+91 90000 41014', email: 'sales@vishwassecurity.example', address: 'Office 21, Lalpar Ceramic Zone, 8-A National Highway, Morbi 363642' },
      hours: 'Mon – Sat, 9:00 AM – 7:00 PM', emergencyLine: 'Emergency visits for factory clients',
      certifications: ['Udyam registered MSME (sample)', 'OEM-trained technicians (sample)'],
      equipment: ['Dust & heat-resistant housings', 'IP bullet cameras', 'NVR with remote access', 'Industrial PoE switches'],
      pins: ['363641', '363642', '360024'],
      portfolio: ['Ceramic kiln monitoring, Lalpar', 'Packaging factory, Sanala Road', 'Warehouse, Metoda GIDC', 'Factory office, Ravapar Road']
    }
  ];

  const REVIEW_POOL = [
    { author: 'Operations Manager', org: 'Regional logistics company', rating: 5, text: 'Survey, quotation and installation were completed exactly as planned. Cabling is neat and the handover document was detailed.' },
    { author: 'Store Operations Lead', org: 'Retail chain', rating: 4, text: 'Good coordination with our store team. A follow-up visit was needed for one camera angle but it was handled quickly.' },
    { author: 'Admin Head', org: 'Manufacturing unit', rating: 5, text: 'Responsive team and transparent pricing. Remote viewing on mobile was set up for all supervisors.' },
    { author: 'Facility Executive', org: 'Corporate office', rating: 4, text: 'Professional technicians and clear communication. Scheduling took a couple of days longer than expected.' },
    { author: 'Plant Head', org: 'Engineering company', rating: 5, text: 'They recommended better camera placement than our original plan, which removed several blind spots.' },
    { author: 'Branch Manager', org: 'Co-operative bank', rating: 4, text: 'AMC visits happen on schedule and reports are shared promptly after each visit.' }
  ];

  /*
   * Sample service requests. `createdDaysAgo` and other relative
   * offsets are converted to real dates when the seed is built.
   */
  const SAMPLE_REQUESTS = [
    { id: 'CC-REQ-2031', createdDaysAgo: 165, status: 'completed', city: 'ahmedabad', area: 'SG Highway', pin: '380054', address: 'Sapphire House, 3rd Floor, Near Iscon Cross Roads, SG Highway', siteType: 'office', services: ['maintenance', 'troubleshooting'], cameras: 32, environment: 'both', siteSize: '10,000 – 50,000 sq ft', infrastructure: 'IP cameras with NVR', description: 'Comprehensive preventive maintenance for the head-office CCTV system: lens cleaning, firmware updates, storage health checks and fixing two cameras with intermittent video loss.', preferredInDays: 7, timeSlot: 'morning', urgency: 'standard', budget: 65000, inspection: false, vendorId: 'v-neteye', invited: ['v-neteye'] },
    { id: 'CC-REQ-2033', createdDaysAgo: 140, status: 'completed', city: 'vadodara', area: 'Makarpura GIDC', pin: '390010', address: 'Plot 214, Sapphire Packaging Unit, Makarpura GIDC', siteType: 'factory', services: ['install', 'nvr'], cameras: 28, environment: 'both', siteSize: '50,000 – 1,00,000 sq ft', infrastructure: 'No existing system (new site)', description: 'New IP CCTV installation for the packaging unit covering production floor, loading bays and perimeter, with a 32-channel NVR and 30 days of recording.', preferredInDays: 10, timeSlot: 'morning', urgency: 'standard', budget: 260000, inspection: true, vendorId: 'v-barodian', invited: ['v-barodian'] },
    { id: 'CC-REQ-2034', createdDaysAgo: 118, status: 'completed', city: 'anand', area: 'Vallabh Vidyanagar', pin: '388120', address: 'Sapphire Fresh Store, Nana Bazaar, Vallabh Vidyanagar', siteType: 'retail', services: ['install'], cameras: 10, environment: 'indoor', siteSize: '2,000 – 10,000 sq ft', infrastructure: 'No existing system (new site)', description: 'Install 10 indoor dome cameras covering billing counters, aisles and the storeroom for a new retail outlet.', preferredInDays: 6, timeSlot: 'afternoon', urgency: 'priority', budget: 90000, inspection: false, vendorId: 'v-barodian', invited: ['v-barodian'] },
    { id: 'CC-REQ-2035', createdDaysAgo: 104, status: 'completed', city: 'gandhinagar', area: 'Infocity', pin: '382010', address: 'Sapphire Regional Office, Infocity Tower II', siteType: 'office', services: ['relocation'], cameras: 6, environment: 'indoor', siteSize: 'Under 2,000 sq ft', infrastructure: 'IP cameras with NVR', description: 'Relocate 6 cameras after office partition changes and update the NVR camera layout.', preferredInDays: 5, timeSlot: 'evening', urgency: 'standard', budget: 18000, inspection: false, vendorId: 'v-sabarmati', invited: ['v-sabarmati'] },
    { id: 'CC-REQ-2037', createdDaysAgo: 78, status: 'completed', city: 'surat', area: 'Vesu', pin: '395007', address: 'Sapphire Store #14, VIP Road, Vesu', siteType: 'retail', services: ['emergency', 'troubleshooting'], cameras: 4, environment: 'indoor', siteSize: 'Under 2,000 sq ft', infrastructure: 'Analog cameras with DVR', description: 'DVR stopped recording after a power surge. Four cameras show no video. Store needs coverage restored urgently.', preferredInDays: 1, timeSlot: 'morning', urgency: 'emergency', budget: 15000, inspection: false, vendorId: 'v-diamond', invited: ['v-diamond'] },
    { id: 'CC-REQ-2038', createdDaysAgo: 66, status: 'cancelled', city: 'junagadh', area: 'Zanzarda Road', pin: '362001', address: 'Sapphire Store #22, Zanzarda Road', siteType: 'retail', services: ['maintenance'], cameras: 8, environment: 'indoor', siteSize: '2,000 – 10,000 sq ft', infrastructure: 'Analog cameras with DVR', description: 'Routine maintenance for 8 cameras. Store is being relocated, so this request was withdrawn.', preferredInDays: 8, timeSlot: 'afternoon', urgency: 'standard', budget: 12000, inspection: false, vendorId: 'v-girnar', invited: ['v-girnar'], cancelReason: 'Store relocation planned — maintenance no longer required at this site.' },
    { id: 'CC-REQ-2039', createdDaysAgo: 48, status: 'in_progress', progress: 45, city: 'mehsana', area: 'Mehsana GIDC', pin: '384002', address: 'Sapphire Distribution Centre, Shed 9, Mehsana GIDC', siteType: 'warehouse', services: ['amc'], cameras: 20, environment: 'both', siteSize: '10,000 – 50,000 sq ft', infrastructure: 'IP cameras with NVR', description: 'Annual maintenance contract for the distribution centre: quarterly preventive maintenance and breakdown support for 20 cameras.', preferredInDays: 6, timeSlot: 'morning', urgency: 'standard', budget: 30000, inspection: false, vendorId: 'v-neteye', invited: ['v-neteye'] },
    { id: 'CC-REQ-2040', createdDaysAgo: 29, status: 'scheduled', city: 'surat', area: 'Sachin GIDC', pin: '394230', address: 'Sapphire Apparel Unit, Plot 52, Sachin GIDC', siteType: 'factory', services: ['install', 'nvr'], cameras: 40, environment: 'both', siteSize: '50,000 – 1,00,000 sq ft', infrastructure: 'Analog cameras with DVR', description: 'Replace the legacy analog system with 40 IP cameras, a 64-channel NVR and fibre link to the security cabin.', preferredInDays: 34, timeSlot: 'morning', urgency: 'standard', budget: 380000, inspection: true, vendorId: 'v-suraksha', invited: ['v-suraksha'] },
    { id: 'CC-REQ-2041', createdDaysAgo: 21, status: 'in_progress', progress: 60, city: 'rajkot', area: 'Kalawad Road', pin: '360005', address: 'Sapphire Store #31, Kalawad Road, Near KKV Hall', siteType: 'retail', services: ['maintenance', 'replacement'], cameras: 12, environment: 'indoor', siteSize: '2,000 – 10,000 sq ft', infrastructure: 'Analog cameras with DVR', description: 'Service all 12 cameras and replace 3 blurry dome cameras near the billing area.', preferredInDays: 12, timeSlot: 'evening', urgency: 'standard', budget: 25000, inspection: false, vendorId: 'v-shreeji', invited: ['v-shreeji'] },
    { id: 'CC-REQ-2042', createdDaysAgo: 14, status: 'approved', city: 'vadodara', area: 'Alkapuri', pin: '390007', address: 'Sapphire Zonal Office, 5th Floor, Alkapuri Business Centre', siteType: 'office', services: ['troubleshooting'], cameras: 16, environment: 'indoor', siteSize: '2,000 – 10,000 sq ft', infrastructure: 'IP cameras with NVR', description: 'Intermittent video loss on 5 of 16 cameras and remote viewing not working. Please diagnose network and NVR configuration.', preferredInDays: 9, timeSlot: 'afternoon', urgency: 'priority', budget: 20000, inspection: false, vendorId: 'v-barodian', invited: ['v-barodian'] },
    { id: 'CC-REQ-2043', createdDaysAgo: 6, status: 'under_review', city: 'jamnagar', area: 'Shanker Tekri GIDC', pin: '361004', address: 'Sapphire Warehouse, Plot 41, Shanker Tekri GIDC', siteType: 'warehouse', services: ['replacement'], cameras: 10, environment: 'outdoor', siteSize: '10,000 – 50,000 sq ft', infrastructure: 'Analog cameras with DVR', description: 'Replace 10 weather-damaged outdoor cameras along the yard and dock area. Prefer IR cameras with at least 40 m range.', preferredInDays: 10, timeSlot: 'morning', urgency: 'standard', budget: 70000, inspection: true, vendorId: 'v-navanagar', invited: ['v-navanagar'] },
    { id: 'CC-REQ-2044', createdDaysAgo: 5, status: 'quotation_received', city: 'rajkot', area: 'Aji GIDC', pin: '360003', address: 'Sapphire Regional Warehouse, Plot 118, Aji GIDC Phase II', siteType: 'warehouse', services: ['install', 'nvr'], cameras: 24, environment: 'both', siteSize: '50,000 – 1,00,000 sq ft', infrastructure: 'No existing system (new site)', description: 'New regional warehouse needs full CCTV coverage: 16 outdoor cameras for perimeter, gates and loading docks, 8 indoor cameras for racking aisles and dispatch. 32-channel NVR with 30-day retention and remote viewing for the Ahmedabad head office.', preferredInDays: 12, timeSlot: 'morning', urgency: 'priority', budget: 240000, inspection: true, vendorId: null, invited: ['v-ssv', 'v-kss', 'v-gujsecure'] },
    { id: 'CC-REQ-2045', createdDaysAgo: 2, status: 'submitted', city: 'bhavnagar', area: 'Waghawadi Road', pin: '364002', address: 'Sapphire Store #40, Waghawadi Road', siteType: 'retail', services: ['install'], cameras: 8, environment: 'indoor', siteSize: '2,000 – 10,000 sq ft', infrastructure: 'No existing system (new site)', description: 'New store opening next month. Need 8 indoor cameras covering entrance, aisles, billing and storeroom with mobile viewing.', preferredInDays: 14, timeSlot: 'afternoon', urgency: 'standard', budget: 75000, inspection: false, vendorId: 'v-gohilwad', invited: ['v-gohilwad'] },
    { id: 'CC-REQ-2046', createdDaysAgo: 4, status: 'quotation_received', city: 'morbi', area: 'Lalpar Ceramic Zone', pin: '363642', address: 'Sapphire Packaging Supplies Depot, Lalpar', siteType: 'factory', services: ['install'], cameras: 18, environment: 'both', siteSize: '10,000 – 50,000 sq ft', infrastructure: 'No existing system (new site)', description: '18 cameras for a packaging depot in the ceramic zone. Dust-resistant housings required for the outdoor yard.', preferredInDays: 15, timeSlot: 'morning', urgency: 'standard', budget: 160000, inspection: true, vendorId: null, invited: ['v-vishwas', 'v-ssv', 'v-navanagar'] },
    { id: 'CC-REQ-2047', createdDaysAgo: 1, status: 'draft', city: 'ahmedabad', area: 'Naroda GIDC', pin: '382330', address: 'Sapphire Cold Storage, Phase III, Naroda GIDC', siteType: 'warehouse', services: ['install'], cameras: 14, environment: 'both', siteSize: '10,000 – 50,000 sq ft', infrastructure: 'No existing system (new site)', description: 'Draft: cold storage facility coverage — confirm camera count after site walk-through.', preferredInDays: 20, timeSlot: 'morning', urgency: 'standard', budget: 120000, inspection: true, vendorId: null, invited: [] }
  ];

  /*
   * Sample quotations. `atStep` ties each quote to the request lifecycle;
   * `status` is the quote's own state.
   */
  const SAMPLE_QUOTES = [
    { requestId: 'CC-REQ-2031', vendorId: 'v-neteye', labor: 24000, material: 8500, other: 1500, completionDays: 3, proposedInDays: 7, warranty: '6 months on labour', notes: 'Full preventive service with health report; replacement PoE injector for the two faulty cameras included.', status: 'approved' },
    { requestId: 'CC-REQ-2033', vendorId: 'v-barodian', labor: 52000, material: 148000, other: 6000, completionDays: 6, proposedInDays: 10, warranty: '2 years on equipment, 1 year labour', notes: 'Includes coverage drawing, 32-ch NVR with 4×6 TB storage and fibre link to gate cabin.', status: 'approved' },
    { requestId: 'CC-REQ-2034', vendorId: 'v-barodian', labor: 14000, material: 52000, other: 2500, completionDays: 2, proposedInDays: 6, warranty: '1 year on labour & equipment', notes: '10 × 4MP IP domes with 16-ch NVR and 4 TB storage.', status: 'approved' },
    { requestId: 'CC-REQ-2035', vendorId: 'v-sabarmati', labor: 9000, material: 3500, other: 1000, completionDays: 1, proposedInDays: 5, warranty: '6 months on labour', notes: 'After-hours relocation to avoid disruption.', status: 'approved' },
    { requestId: 'CC-REQ-2037', vendorId: 'v-diamond', labor: 4500, material: 6800, other: 800, completionDays: 1, proposedInDays: 0, warranty: '6 months on labour', notes: 'Replace DVR power supply and surge-protect the rack.', status: 'approved' },
    { requestId: 'CC-REQ-2039', vendorId: 'v-neteye', labor: 18000, material: 6000, other: 1500, completionDays: 365, proposedInDays: 6, warranty: '1 year on labour & equipment', notes: 'Four quarterly visits; spares billed separately at actuals.', status: 'approved' },
    { requestId: 'CC-REQ-2040', vendorId: 'v-suraksha', labor: 78000, material: 236000, other: 9000, completionDays: 8, proposedInDays: 34, warranty: '2 years on equipment, 1 year labour', notes: 'Phased cut-over so the factory is never without coverage.', status: 'approved' },
    { requestId: 'CC-REQ-2041', vendorId: 'v-shreeji', labor: 6500, material: 11500, other: 800, completionDays: 2, proposedInDays: 12, warranty: '6 months on labour', notes: '3 replacement 2MP domes included.', status: 'approved' },
    { requestId: 'CC-REQ-2042', vendorId: 'v-barodian', labor: 9500, material: 4200, other: 1200, completionDays: 1, proposedInDays: 9, warranty: '6 months on labour', notes: 'Likely PoE switch fault; switch replacement included if required.', status: 'approved' },
    { requestId: 'CC-REQ-2044', vendorId: 'v-ssv', labor: 46000, material: 148000, other: 7500, completionDays: 5, proposedInDays: 12, warranty: '2 years on equipment, 1 year labour', notes: '16 × 5MP outdoor IR bullets, 8 × 4MP domes, 32-ch NVR with 4×8 TB, remote viewing for HO. Site survey included.', status: 'submitted' },
    { requestId: 'CC-REQ-2044', vendorId: 'v-kss', labor: 38000, material: 129000, other: 5000, completionDays: 7, proposedInDays: 16, warranty: '1 year on labour & equipment', notes: '16 × 4MP outdoor bullets, 8 × 2MP domes, 32-ch NVR with 3×6 TB storage.', status: 'submitted' },
    { requestId: 'CC-REQ-2044', vendorId: 'v-gujsecure', labor: 58000, material: 166000, other: 12000, completionDays: 4, proposedInDays: 19, warranty: '3 years comprehensive', notes: 'Enterprise-grade cameras with analytics on gate cameras; dedicated project manager.', status: 'submitted' },
    { requestId: 'CC-REQ-2046', vendorId: 'v-vishwas', labor: 32000, material: 104000, other: 4000, completionDays: 4, proposedInDays: 15, warranty: '2 years on equipment, 1 year labour', notes: 'Dust-resistant IP66 housings for all yard cameras; 32-ch NVR.', status: 'submitted' },
    { requestId: 'CC-REQ-2046', vendorId: 'v-navanagar', labor: 30000, material: 112000, other: 6500, completionDays: 5, proposedInDays: 18, warranty: '1 year on labour & equipment', notes: 'Includes 1 PTZ for the yard and 16-ch NVR with expansion.', status: 'submitted' }
  ];

  window.CC = window.CC || {};
  window.CC.data = {
    IMAGES, ORGANIZATION, CITIES, SERVICES, SITE_TYPES, SITE_SIZES, INFRASTRUCTURE,
    TIME_SLOTS, URGENCY, WARRANTY_OPTIONS, VENDORS, REVIEW_POOL, SAMPLE_REQUESTS, SAMPLE_QUOTES,
    STORAGE_KEY: 'cityconnect.state.v1',
    REQUEST_ID_START: 2048
  };
})();
