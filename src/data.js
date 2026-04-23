// ====================================================================
// Data — Aakar Kale's portfolio content
// ====================================================================

export const AK_DATA = {
  name: 'Aakar Kale',
  role: 'Senior Product Manager',
  tagline: 'Ex-founder turned Senior PM, turning ambiguity into outcomes. Shaping the next generation of products with clarity and purpose.',
  location: 'San Francisco, CA',
  origin: 'Mumbai, India',

  stats: [
    { num: '10+', label: 'Years in tech' },
    { num: '6+',  label: 'Years in product' },
    { num: '10+', label: 'Products shipped' },
    { num: '3M+', label: 'Users impacted' },
    { num: '180+', label: 'Usability sessions' },
    { num: '50k+', label: 'Books sold as founder' },
    { num: '$1.45M', label: 'Funding unlocked' },
    { num: '2×', label: 'Masters degrees' },
  ],

  about: [
    "I've always introduced myself as an engineer and a tech enthusiast — someone who tears apart how things work and gets a kick out of putting them back together, better. MKBHD and the smartphone revolution pulled me into tech. These days it's the architecture behind large language models and the craft of building products that millions of people actually use.",
    "Born and raised in Mumbai, currently living in San Francisco — chasing childhood dreams in Silicon Valley. You'll find me frequenting city beaches, looking for answers to life's questions and a good spot to catch the sunset.",
    "I'm a PM who thinks in data. Machine learning and data science aren't buzzwords on my resume — they're how I think about problems: find the signal, test the hypothesis, ship the thing, measure what happens.",
    "I'm a product manager, a data engineer, a startup enthusiast, a videographer, a marathon runner, a proud son, a loving brother, and a lifetime student. I'm an optimist who believes consistent hard work almost always beats smart work.",
  ],

  experience: [
    {
      role: 'Senior Product Manager, Growth',
      company: 'DGDG, Inc.',
      place: 'San Jose, CA',
      period: 'May 2023 — Present',
      bullets: [
        'Led 0-to-1 development of AcquireCars (Patent Filed), an AI/ML-powered vehicle acquisition platform.',
        'Improved acquisition conversion rate by 11% and reduced time-to-value by 58%.',
        'Integrated an AI/ML pricing engine and architected scalable AWS infrastructure.',
      ],
    },
    {
      role: 'Technology Consultant — Product Org',
      company: 'ZS Associates',
      place: 'San Francisco, CA',
      period: 'Feb 2021 — May 2023',
      bullets: [
        'Managed a comprehensive Healthcare IoT platform achieving 99.95% uptime.',
        'Spearheaded development of a B2B SaaS telemedicine solution.',
        'Conducted 180+ usability sessions to drive product iteration and user-centric design.',
      ],
    },
    {
      role: 'Data Engineering Intern',
      company: 'T-Mobile USA',
      place: 'Bellevue, WA',
      period: 'Jun 2019 — Aug 2019',
      bullets: [
        'Built a 5G rollout dashboard utilized by 200+ representatives.',
        'Reduced data processing time by 95%.',
      ],
    },
    {
      role: 'Project Manager, M&A Lead',
      company: 'Navayuvak Entrepreneurs',
      place: 'Mumbai, India',
      period: 'Jun 2017 — Jul 2018',
      bullets: [
        'Unlocked $1.45M in funding opportunities for portfolio companies.',
      ],
    },
    {
      role: 'Co-Founder & CEO',
      company: 'Bookmarked Inc.',
      place: 'Mumbai, India',
      period: 'Oct 2014 — Jan 2017',
      bullets: [
        'Founded and led a B2C book marketplace with a 24-person team.',
        'Scaled to 50k+ books sold and acquired 15k+ customers.',
      ],
    },
  ],

  projects: [
    {
      id: 'archly',
      index: '01',
      title: 'Archly AI',
      oneLiner: 'LLM-powered voice interview coach with RAG and agentic capabilities.',
      tags: ['RAG', 'LLM', 'Voice AI', 'Cursor'],
      accent: 'rgb(115,115,255)',
      url: 'https://archly.ai',
    },
    {
      id: 'alignmoney',
      index: '02',
      title: 'AlignMoney',
      oneLiner: 'AI-powered personal finance with smart budgeting and intelligent investing.',
      tags: ['FinTech', 'AI', 'Replit'],
      accent: 'rgb(4,196,10)',
      url: 'https://alignmoney.app',
    },
    {
      id: 'biotracker',
      index: '03',
      title: 'BioTracker',
      oneLiner: 'ML-powered health analytics hub for biomarker tracking and personalized insights.',
      tags: ['Machine Learning', 'HealthTech', 'Analytics'],
      accent: 'rgb(255,133,115)',
      url: 'https://biotracker.app',
    },
    {
      id: 'photocloud',
      index: '04',
      title: 'PhotoCloudCRM',
      oneLiner: 'AI-integrated photo business platform with built-in CRM workflows.',
      tags: ['CRM', 'SaaS', 'Lovable'],
      accent: 'rgb(255,221,85)',
      url: 'https://photocloudcrm.com',
    },
    {
      id: 'traffic',
      index: '05',
      title: 'Traffic Camera Alert',
      oneLiner: 'Born from one expensive lesson at a notorious SF intersection.',
      tags: ['Computer Vision', 'Real-time', 'Alerts'],
      accent: 'rgb(255,69,56)',
      url: 'https://trafficcam.app',
    },
  ],

  secretProject: {
    id: 'secret',
    index: '??',
    title: 'The Konami Project',
    oneLiner: "You found the cheat code. A scrappy prototype I'm still tinkering with on weekends.",
    tags: ['Secret', 'WIP', 'Easter Egg'],
    accent: 'rgb(255,0,128)',
  },

  skills: [
    { group: 'AI/ML & LLM', items: ['RAG', 'Agentic Workflows', 'Prompt Engineering', 'TensorFlow', 'Keras', 'Scikit-Learn', 'PySpark'] },
    { group: 'AI Coding', items: ['Cursor', 'Claude Code', 'Replit Agent', 'Lovable', 'Gemini Code Assist'] },
    { group: 'Languages', items: ['Python', 'JavaScript', 'TypeScript', 'SQL', 'Java', 'R'] },
    { group: 'Cloud', items: ['AWS (EC2, S3, Lambda, Redshift)', 'GCP', 'Azure'] },
    { group: 'Data', items: ['Tableau', 'Power BI', 'Pandas', 'NumPy', 'Dovetail AI'] },
    { group: 'Product & Design', items: ['Figma', 'Jira', 'Confluence', 'Productboard', 'Airtable'] },
  ],

  // Each item: {name, slug?}. `slug` is a Simple Icons slug (cdn.simpleicons.org/{slug}).
  // If slug is missing OR the request 404s, the UI falls back to the name as text.
  techReel: [
    { name: 'Figma', slug: 'figma' },
    { name: 'Jira', slug: 'jira' },
    { name: 'Confluence', slug: 'confluence' },
    { name: 'Productboard' },
    { name: 'Aha!' },
    { name: 'Airtable', slug: 'airtable' },
    { name: 'Notion', slug: 'notion' },
    { name: 'Linear', slug: 'linear' },
    { name: 'Miro', slug: 'miro' },
    { name: 'FigJam' },
    { name: 'Loom', slug: 'loom' },
    { name: 'Mixpanel', slug: 'mixpanel' },
    { name: 'Segment', slug: 'segment' },
    { name: 'Pendo' },
    { name: 'Heap' },
    { name: 'LaunchDarkly', slug: 'launchdarkly' },
    { name: 'Tableau', slug: 'tableau' },
    { name: 'Power BI', slug: 'powerbi' },
    { name: 'Looker', slug: 'looker' },
    { name: 'Google Analytics', slug: 'googleanalytics' },
    { name: 'Dovetail', slug: 'dovetail' },
    { name: 'UserTesting' },
    { name: 'Cursor', slug: 'cursor' },
    { name: 'Claude Code', slug: 'anthropic' },
    { name: 'Replit', slug: 'replit' },
    { name: 'Lovable' },
    { name: 'Gemini Code Assist', slug: 'googlegemini' },
    { name: 'Hugging Face', slug: 'huggingface' },
    { name: 'TensorFlow', slug: 'tensorflow' },
    { name: 'AWS', slug: 'amazonwebservices' },
    { name: 'GCP', slug: 'googlecloud' },
    { name: 'Azure', slug: 'microsoftazure' },
    { name: 'BigQuery', slug: 'googlebigquery' },
    { name: 'Redshift', slug: 'amazonredshift' },
    { name: 'Snowflake', slug: 'snowflake' },
    { name: 'GitHub', slug: 'github' },
    { name: 'Vercel', slug: 'vercel' },
    { name: 'Postman', slug: 'postman' },
    { name: 'Datadog', slug: 'datadog' },
    { name: 'TypeScript', slug: 'typescript' },
    { name: 'Salesforce', slug: 'salesforce' },
    { name: 'HubSpot', slug: 'hubspot' },
    { name: 'Marketo', slug: 'marketo' },
    { name: 'Stripe', slug: 'stripe' },
    { name: 'Zendesk', slug: 'zendesk' },
  ],

  education: [
    { degree: 'M.S. in Business Analytics & Data Science', school: 'Cal State East Bay', period: '2019 — 2020', url: 'https://www.csueastbay.edu/' },
    { degree: 'M.S. in Information Systems Management', school: 'Santa Clara University', period: '2018 — 2019', url: 'https://www.scu.edu/' },
    { degree: 'B.E. in Information Technology', school: 'Mumbai University', period: '2012 — 2017', url: 'https://mu.ac.in/' },
  ],

  certifications: [
    { name: 'Salesforce Certified Advanced Administrator', year: '2025', note: 'Held by 15% of certified professionals' },
    { name: 'FAA-Certified Drone Pilot (Part 107)', year: '2021', note: 'See my YouTube Channel', url: 'https://youtube.com/@aakarkale' },
  ],

  papers: [
    { title: 'Number Plate Recognition System: A Smart City Solution', pub: 'IRJET · Vol 4, Issue 12', year: 'Dec 2017', url: './papers/Number.Plate.Recognition.System.pdf' },
    { title: '3D Face Recognition Technology in Network Security Applications', pub: 'IRJET · Vol 4, Issue 12', year: 'Dec 2017', url: './papers/3D.Face.Recognition.Technology.pdf' },
  ],

  contact: {
    email: 'hello@aakarkale.com',
    linkedin: 'https://linkedin.com/in/aakarkale',
    x: 'https://x.com/aakarkale',
    youtube: 'https://www.youtube.com/channel/UCi_Gt1HFpBS5p3TSLlkP6Kw',
  },
};
