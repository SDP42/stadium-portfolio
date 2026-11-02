// All project facts come from the READMEs and commit history of github.com/SDP42.
export const profile = {
  name: 'Swayam Panchal',
  fullName: 'Swayam Devendra Panchal',
  role: 'Data Science · Machine Learning · Generative AI',
  college: 'Dwarkadas J. Sanghvi College of Engineering',
  degree: 'B.Tech, Artificial Intelligence & Data Science',
  location: 'Mumbai, India',
  email: 'panchalswayam35@gmail.com',
  github: 'https://github.com/SDP42',
  linkedin: 'https://www.linkedin.com/in/swayam-panchal-11281b34a/',
  repos: 53,
  phone: '', // add a number and set showPhone: true to list it on the contact page
  showPhone: false,
};

export const education = [
  { years: '2024 – 2028', school: 'Dwarkadas J. Sanghvi College of Engineering', detail: 'B.Tech, Artificial Intelligence & Data Science · Mumbai University', score: '9.70', unit: 'CGPA / 10' },
  { years: '2024', school: 'Vidyaniketan Junior College of Commerce and Science', detail: 'HSC · Maharashtra State Board', score: '87.67', unit: '%' },
  { years: '2022', school: 'Shree Siddhi Vinayagar English High School', detail: 'SSC · Maharashtra State Board', score: '93', unit: '%' },
];

export const honours = [
  { big: '5×', label: 'Hackathon winner', note: 'Working AI, data and full-stack products built against the clock.' },
  { big: '2×', label: 'Ideathon winner', note: 'Problem framing and solution design that won the room.' },
  { big: 'JPMC', label: 'Code for Good', note: 'J.P. Morgan Chase & Co. hackathon building tech for non-profits.' },
];

export const roles = [
  { when: 'Committee', title: 'Secretary · DJS NSDC × Infomatrix', org: 'DJSCE', text: 'Co-led Elevate 1.0, a 24-hour national hackathon. I manage events, sponsorships and a 47-member organising committee.' },
  { when: 'Jun – Jul 2026', title: 'AI Data Analyst', org: 'InAmigos Foundation', text: 'Data cleaning, EDA and statistical analysis in Python, Pandas and NumPy, with dashboards and reports that drove decisions.' },
  { when: 'Ongoing', title: 'Mentor', org: 'DJSCE · Infomatrix Python Bootcamp', text: 'Teach juniors Python, NumPy, Pandas, Matplotlib, Seaborn and core ML through hands-on sessions and notebooks.' },
];

export const interests = ['Football & tactics', 'Sports analytics', 'Explainable AI', 'AI in education', 'Cyber-safety', 'Hackathons'];

const gh = (r) => `https://github.com/SDP42/${r}`;

// The starting XI, in a 4-3-3. Pitch runs along x (-52.5 → 52.5), attacking +x.
// `order` is the tour order: build-up play from the keeper to the striker.
export const squad = [
  {
    no: 1, pos: 'GK', posName: 'Goalkeeper', at: [-46, 0],
    title: 'Elevate 1.0', repo: gh('Elevate1.0'), live: 'https://elevate1-0.vercel.app',
    commits: 145, event: '24-hour national hackathon · DJS NSDC × Infomatrix',
    tagline: 'The official platform that ran a 24-hour national hackathon, live.',
    about: 'Co-built and deployed the Elevate 1.0 website and portals: submissions, shortlisting, on-day check-in and meal passes. Kept it running for all 24 hours, so organisers had one system for every participant.',
    points: [
      '2,500+ views and 700+ registrations; 115+ on-campus participants across 32 finalist teams',
      'Role-based portals on Neon PostgreSQL with JWTs in HttpOnly cookies and bcrypt',
      'Scores hidden until an admin approves them; credential exports never leak passwords',
    ],
    stack: ['React', 'Vite', 'Node.js', 'PostgreSQL', 'PL/pgSQL', 'JWT'],
  },
  {
    no: 2, pos: 'RB', posName: 'Right back', at: [-30, 24],
    title: 'NAMASTE × ICD-11', repo: gh('SIH_PS_10'),
    commits: 40, event: 'Smart India Hackathon',
    tagline: 'A FHIR R4 terminology service linking traditional and modern medicine.',
    about: "Maps India's NAMASTE codes to WHO's ICD-11 Traditional Medicine Module 2 so EMRs can speak both languages at once.",
    points: [
      '468 curated mappings stored in SQLite with FTS5 full-text search',
      'Sub-100 ms terminology lookups behind a FastAPI service',
      'FHIR R4-compliant resources and a React front end',
    ],
    stack: ['FastAPI', 'SQLite FTS5', 'FHIR R4', 'React', 'TypeScript'],
  },
  {
    no: 4, pos: 'CB', posName: 'Centre back', at: [-32, 9],
    title: 'OHMEN', repo: gh('ohmen'),
    commits: 62, event: 'D3COY · PS 03',
    tagline: 'See the cascade before it happens.',
    about: 'An AI-assisted cyber-risk digital twin for critical infrastructure. It joins asset inventories, vulnerability intel, network activity and operational dependencies to predict which assets matter most.',
    points: [
      'Consequence-based risk scoring instead of raw CVE counts',
      'Attack-path simulation across operational dependencies',
      'Mitigation optimiser that ranks the fixes that cut the most risk',
    ],
    stack: ['Python', 'TypeScript', 'Graph analytics', 'Digital twin'],
  },
  {
    no: 5, pos: 'CB', posName: 'Centre back', at: [-32, -9],
    title: 'DataPilot', repo: gh('datapilot'),
    commits: 71, event: 'Long-running build',
    tagline: 'An autonomous data scientist that explains every step.',
    about: 'Give it a messy dataset and an objective; it works through the pipeline the way a human data scientist would, and shows its reasoning at each stage.',
    points: [
      'Profiling, data-quality analysis and approval-gated cleaning',
      'Dataset versioning with lineage validation',
      'Deterministic EDA and statistical-analysis layer, then problem understanding',
    ],
    stack: ['Python', 'Pandas', 'Statistics', 'TypeScript', 'React'],
  },
  {
    no: 3, pos: 'LB', posName: 'Left back', at: [-30, -24],
    title: 'East Coast Freight Desk', repo: gh('east-coast-freight-desk'), live: 'https://east-coast-freight-desk.vercel.app',
    commits: 34, event: 'Smart India Hackathon 2026',
    tagline: "Freight forecasting and chartering decisions for SAIL's coking-coal imports.",
    about: 'Decision support for dry-bulk chartering into Paradip, Vizag, Haldia and other East Coast ports, where freight swings hard and every port has different draft limits.',
    points: [
      'ARIMA, Ridge, XGBoost and a PyTorch GRU compared walk-forward with Wilcoxon tests',
      'ARIMA + XGBoost ensemble explained with SHAP',
      '86.9% intent model and a PostgreSQL back end',
    ],
    stack: ['PyTorch', 'XGBoost', 'statsmodels', 'SHAP', 'PostgreSQL', 'FastAPI'],
  },
  {
    no: 6, pos: 'CDM', posName: 'Defensive midfield', at: [-14, 0],
    title: 'BrainMapAI', repo: gh('BrainMapAI'),
    commits: 58, event: 'Open source',
    tagline: 'Turns PDFs and papers into navigable knowledge graphs.',
    about: 'An open-source platform that reads unstructured PDFs, research papers and text and builds interactive, semantically validated knowledge graphs.',
    points: [
      'spaCy parsing and KeyBERT keyphrase extraction',
      'Entity-relation graphs you can explore and validate',
      'Python back end with an interactive TypeScript front end',
    ],
    stack: ['Python', 'spaCy', 'KeyBERT', 'NLP', 'TypeScript'],
  },
  {
    no: 8, pos: 'CM', posName: 'Central midfield', at: [-4, 15],
    title: 'Learnova V2', repo: gh('LearnovaV2'),
    commits: 185, event: 'Long-running build · 185 commits',
    tagline: 'Rebuilds lecture PDFs into illustrated, interactive decks.',
    about: 'Turns lecture notes, PDFs and old slide decks into designed presentations, with visuals picked for each idea, step-by-step problem explainers, quizzes and a study tutor.',
    points: [
      'Gemini + Groq with a FastAPI + React app and PPTX export',
      '700+ automated tests',
      'Visuals chosen per idea, step-by-step problem explainers and a study tutor',
    ],
    stack: ['FastAPI', 'React', 'Gemini', 'Groq', 'Docker', 'python-pptx'],
  },
  {
    no: 10, pos: 'CAM', posName: 'Playmaker', at: [-2, -15],
    title: 'Parallel', repo: gh('parallel'),
    commits: 4, event: "CASCADE '26 · Attention Digital Twin",
    tagline: 'Every ping forks your day. Parallel shows you both futures before you tap.',
    about: 'An attention digital twin that learns when you focus, what pulls you away and which notifications actually matter, then predicts the cost of every interruption against its counterfactual.',
    points: [
      '2,000 Monte Carlo futures per notification, with randomized holdouts and a T-learner',
      'Personas that shift toward your own data as it arrives (n / (n + 20))',
      'Web, mobile and 3D views: fingerprint heatmap, multiverse, replay',
    ],
    stack: ['TypeScript', 'Python', 'Causal ML', 'Swift', 'Three.js'],
  },
  {
    no: 7, pos: 'RW', posName: 'Right wing', at: [22, 24],
    title: 'Smart Resort 360', repo: gh('guestexperience'), live: 'https://guestexperience.vercel.app',
    commits: 5, event: 'Hospitality AI',
    tagline: 'A guest portal with a live 3D digital twin and an AI concierge.',
    about: 'A digital twin of a 130-suite, 7-floor resort with per-room 3D interiors and a concierge that understands English, Hindi and Marathi.',
    points: [
      'Hybrid dense + BM25 RAG with RRF and MMR over local MiniLM embeddings',
      'Trained predictive-maintenance, intent and sentiment models',
      'Self-running automation rules for requests, perks and dispatch',
    ],
    stack: ['Next.js', 'three.js', 'RAG', 'SQLite', 'ONNX'],
  },
  {
    no: 11, pos: 'LW', posName: 'Left wing', at: [22, -24],
    title: 'WorldCupAI 2026', repo: gh('WorldCupAI-2026'),
    commits: 8, event: 'Sports analytics',
    tagline: 'Predicts the FIFA World Cup 2026 knockout stage.',
    about: 'An end-to-end ML lifecycle, from data and feature engineering to deep learning, ensembles and an interactive dashboard, aimed at one question: who lifts the trophy?',
    points: [
      'ML + deep learning ensembles',
      'Monte Carlo simulation of the full knockout bracket',
      'SHAP explanations in a Streamlit dashboard',
    ],
    stack: ['scikit-learn', 'TensorFlow', 'SHAP', 'Streamlit', 'Monte Carlo'],
  },
  {
    no: 9, pos: 'ST', posName: 'Striker', at: [31, 0],
    title: 'MIRAGE', repo: gh('isacaps2'), captain: true,
    commits: 201, event: 'D3COY 1.0 · DJS ISACA · PS 02',
    subtitle: 'Multimodal Impersonation & Request-Aware Guard Engine',
    numbers: [['201', 'commits'], ['1.87%', 'voice EER'], ['41/42', 'voice fakes caught'], ['15/15', 'image fakes caught']],
    deep: [
      ['Detect', 'Five "witnesses" (voice, face, provenance, words, identity) on published detectors: DF_Arena 500M, NII AntiDeepfake, Community Forensics, SwinV2, GenD (WACV 2026).'],
      ['Explain', 'Every claim cites numbered exhibits tied to waveform seconds, words, frames and OCR boxes. A model jury, a score waterfall and an AI Tribunal that argues both sides.'],
      ['Cure', 'A live response per scam type: hold the money, challenge questions, pre-filled cybercrime.gov.in / 1930 / bank / CERT-In drafts, an evidence-pack ZIP, warn who is next.'],
      ['Shield', 'Voice check, live call shield and a Chrome extension (right-click checks, tab-call shield, Gmail banners). English, Hindi and Hinglish.'],
    ],
    tagline: 'Seeing is no longer believing.',
    about: 'Investigates a suspicious voice note, call, video meeting, screenshot, email or chat and answers the question that protects people: is it safe to act on this request, and what do I do now?',
    points: [
      'Five detector "witnesses"; voice detection at 1.87% EER on In-the-Wild',
      'Red-team lab: 41/42 laundered voice and 15/15 image variants caught',
      'Explains with numbered evidence, then runs the cure: hold money, verify, report',
    ],
    stack: ['PyTorch', 'FastAPI', 'TypeScript', 'Chrome extension', 'Docker'],
  },
];

// Substitutes: real work that did not make the starting XI.
export const bench = [
  { title: 'Stratify', repo: 'https://dombivli-hackathon-s6vb.vercel.app', linkLabel: 'Live', tagline: 'AI-powered algorithmic trading platform with a Pandas/NumPy backtester (RSI, MACD, moving averages).', stack: ['Python', 'React', 'SQL'] },
  { title: 'Medical AI · Chest X-ray', tagline: 'YOLOv9 + DenseNet-121 diagnosis on 2,000+ X-rays, explained with Grad-CAM.', stack: ['PyTorch', 'YOLOv9', 'Grad-CAM'] },
  { title: 'DriftWard', repo: gh('driftward'), tagline: 'Behavioural identity layer that contains hijacked AI agents while their credentials stay valid.', stack: ['FastAPI', 'three.js', 'CUSUM'] },
  { title: 'CityPulse AI', repo: gh('citypulse-ai'), tagline: 'Local-first civic evidence workbench: every number traces back to its source rows.', stack: ['FastAPI', 'SQLite', 'H3', 'React'] },
  { title: 'Learnova IPD', repo: gh('LearnovaIPD'), tagline: 'The original presentation-transformation engine behind Learnova.', stack: ['Python', 'Groq', 'Gemini'] },
  { title: 'Football Analytics', repo: gh('Football-Analytics'), tagline: 'Tactical analytics platform, research and architecture phase.', stack: ['Python', 'ML', 'CV'] },
  { title: 'HackNova L5614', repo: gh('HackNova-L5614'), tagline: 'Logistics platform built at HackNova.', stack: ['JavaScript', 'Python', 'Docker'] },
];

export const skills = [
  { k: 'Machine learning', v: ['scikit-learn', 'XGBoost', 'statsmodels', 'SHAP', 'ARIMA / ETS', 'Walk-forward validation'] },
  { k: 'Deep learning', v: ['PyTorch', 'TensorFlow', 'Keras', 'GRU / RNN', 'CNN', 'YOLO', 'OpenCV'] },
  { k: 'GenAI & NLP', v: ['Gemini', 'Groq', 'RAG', 'Hugging Face', 'spaCy', 'KeyBERT', 'Embeddings'] },
  { k: 'Data', v: ['Pandas', 'NumPy', 'SciPy', 'Plotly', 'Monte Carlo', 'Hypothesis testing'] },
  { k: 'DBMS & SQL', v: ['PostgreSQL', 'PL/pgSQL', 'SQLite FTS5', 'SQLAlchemy', 'Redis'] },
  { k: 'Engineering', v: ['Python', 'FastAPI', 'React', 'TypeScript', 'Docker', 'Git'] },
];

