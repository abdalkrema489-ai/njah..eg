'use strict';
// ══════════════════════════════════════════════════════
// NAJAH INTERNAL AI — Full Egyptian Curriculum Engine v2
// ══════════════════════════════════════════════════════

// ── Curriculum Knowledge Base (All Grades) ─────────────
const CURRICULUM = {
  mathematics: {
    primary: {
      grade1: ['counting 1-100', 'addition basics', 'subtraction basics', 'shapes recognition'],
      grade2: ['multiplication tables 1-5', 'division introduction', 'fractions half and quarter', 'measurement'],
      grade3: ['multiplication tables 1-10', 'long division', 'fractions', 'geometry basics', 'word problems'],
      grade4: ['fractions and decimals', 'area and perimeter', 'angles', 'large numbers', 'averages'],
      grade5: ['percentages', 'ratios', 'equations introduction', 'statistics basics', 'coordinate plane'],
      grade6: ['algebra introduction', 'integers', 'probability', 'volume', 'proportions'],
    },
    preparatory: {
      grade1: ['algebraic expressions', 'linear equations', 'geometry angles', 'statistics', 'directed numbers'],
      grade2: ['simultaneous equations', 'pythagoras theorem', 'quadratic basics', 'trigonometry intro', 'data analysis'],
      grade3: ['quadratic equations', 'functions', 'trigonometry', 'circle geometry', 'probability'],
    },
    secondary: {
      grade1: ['functions and graphs', 'logarithms', 'trigonometric functions', 'geometric sequences', 'complex numbers basics'],
      grade2: ['calculus introduction', 'derivatives', 'integrals basics', 'matrices', 'statistics'],
      grade3: ['differentiation applications', 'integration applications', 'differential equations', 'linear algebra', 'final exam prep'],
    },
    concepts: {
      fractions: ['A fraction = part ÷ whole', 'Top = numerator, Bottom = denominator', 'To add: find LCD first', 'To multiply: numerator×numerator ÷ denominator×denominator', 'Simplify by dividing by GCF'],
      algebra: ['Variables represent unknowns', 'Solve by isolating the variable', 'Same operation both sides', 'Combine like terms first', 'Check answer by substituting back'],
      geometry: ['Triangle angles sum = 180°', 'Rectangle area = l × w', 'Circle area = πr²', 'Circumference = 2πr', 'Pythagorean theorem: a²+b²=c²', 'Volume of cube = s³'],
      calculus: ['Derivative = rate of change', 'd/dx(xⁿ) = nxⁿ⁻¹', 'd/dx(sin x) = cos x', '∫xⁿdx = xⁿ⁺¹/(n+1) + C', 'Chain rule: d/dx f(g(x)) = f\'(g(x))·g\'(x)'],
      trigonometry: ['sin θ = opposite/hypotenuse', 'cos θ = adjacent/hypotenuse', 'tan θ = opposite/adjacent', 'sin²θ + cos²θ = 1', 'sin(30°)=0.5, cos(60°)=0.5, tan(45°)=1'],
      statistics: ['Mean = Σx/n', 'Median = middle value when sorted', 'Mode = most frequent', 'Range = max - min', 'Variance = Σ(x-μ)²/n'],
      probability: ['P(event) = favorable/total outcomes', '0 ≤ P ≤ 1', 'P(A or B) = P(A)+P(B)-P(A and B)', 'P(not A) = 1 - P(A)', 'Independent events: P(A and B) = P(A)×P(B)'],
    },
  },
  science: {
    primary: {
      concepts: {
        photosynthesis: ['Plants make food using sunlight + water + CO₂', 'Occurs in chloroplasts containing chlorophyll', 'Produces glucose and oxygen', 'Equation: 6CO₂+6H₂O+light → C₆H₁₂O₆+6O₂', 'Stomata control gas exchange'],
        animals: ['Mammals: warm-blooded, give birth to live young', 'Birds: warm-blooded, lay eggs, have feathers', 'Reptiles: cold-blooded, scaly skin', 'Insects: 6 legs, 3 body parts', 'Food chains: Producer → Herbivore → Carnivore'],
        matter: ['Three states: solid, liquid, gas', 'Solid: fixed shape and volume', 'Liquid: fixed volume, takes container shape', 'Gas: no fixed shape or volume', 'Melting, freezing, evaporation, condensation'],
        earth: ['Earth rotates on its axis (day/night)', 'Earth revolves around the sun (seasons)', 'Solar system: 8 planets', 'Moon orbits Earth', 'Layers: crust, mantle, outer core, inner core'],
      },
    },
    preparatory: {
      concepts: {
        cells: ['Cell = basic unit of life', 'Animal cell: membrane, nucleus, cytoplasm, mitochondria', 'Plant cell: also has wall, chloroplasts, vacuole', 'Mitochondria = powerhouse (ATP production)', 'Nucleus contains DNA/chromosomes'],
        forces: ['Force = push or pull (Newtons)', 'Newton 1st: object stays at rest unless force acts', 'Newton 2nd: F = ma', 'Newton 3rd: every action has equal opposite reaction', 'Weight = mass × gravity (W=mg, g=9.8 m/s²)'],
        electricity: ['Current (I) = charge flow in Amperes', 'Voltage (V) = electrical pressure in Volts', 'Resistance (R) = opposition in Ohms', 'Ohm\'s Law: V = IR', 'Series circuit: same current everywhere', 'Parallel circuit: same voltage across branches'],
        chemistry: ['Element: pure substance, one type of atom', 'Compound: two+ elements chemically combined', 'Mixture: two+ substances physically mixed', 'Atom: protons (positive), neutrons (neutral), electrons (negative)', 'Atomic number = number of protons'],
      },
    },
    secondary: {
      concepts: {
        mechanics: ['Velocity = displacement/time', 'Acceleration = Δv/Δt', 'Kinetic energy = ½mv²', 'Potential energy = mgh', 'Momentum = mv', 'Work = Force × distance × cos θ'],
        waves: ['Wave frequency (f) = cycles per second (Hz)', 'Wavelength (λ) = distance between wave peaks', 'Speed = f × λ', 'Transverse waves: vibration ⊥ direction', 'Longitudinal waves: vibration ∥ direction', 'Sound is longitudinal, light is transverse'],
        thermodynamics: ['Heat flows from hot to cold', 'Q = mcΔT (heat = mass × specific heat × temp change)', 'First Law: ΔU = Q - W (energy conservation)', 'Absolute zero = -273.15°C = 0 K', 'Ideal gas law: PV = nRT'],
        organicChem: ['Carbon forms 4 bonds', 'Hydrocarbons: contain only C and H', 'Alkanes: CₙH₂ₙ₊₂ (saturated)', 'Alkenes: CₙH₂ₙ (one double bond)', 'Functional groups: -OH (alcohol), -COOH (carboxyl)', 'Isomers: same formula, different structure'],
      },
    },
  },
  arabic: {
    grammar: {
      sentence_types: ['الجملة الاسمية: تبدأ باسم وتتكون من مبتدأ وخبر', 'الجملة الفعلية: تبدأ بفعل وتتكون من فعل وفاعل', 'المبتدأ: اسم مرفوع في أول الجملة الاسمية', 'الخبر: ما يُخبر به عن المبتدأ وهو مرفوع', 'الفاعل: من قام بالفعل وهو مرفوع دائماً'],
      parsing: ['المرفوع: الفاعل، المبتدأ، الخبر، نائب الفاعل', 'المنصوب: المفعول به، الحال، التمييز، المفعول المطلق', 'المجرور: الاسم بعد حروف الجر', 'علامات الرفع: الضمة، الواو، الألف، النون', 'علامات النصب: الفتحة، الياء، الألف، الكسرة'],
      verb_types: ['الفعل الماضي: ما دل على حدث مضى', 'الفعل المضارع: يدل على الحاضر أو المستقبل', 'فعل الأمر: يطلب به القيام بعمل', 'الفعل المعتل: يحتوي على حرف علة (و/ا/ي)', 'الفعل الصحيح: لا يحتوي على حروف علة'],
      nouns: ['الاسم المعرفة: محدد (مع ال أو ضمير متصل)', 'الاسم النكرة: غير محدد (بدون ال)', 'المذكر السالم جمعه: واو ونون أو ياء ونون', 'المؤنث السالم جمعه: ألف وتاء', 'جمع التكسير: يتغير بناؤه الأصلي'],
      rhetorical: ['التشبيه: تشبيه شيء بشيء آخر (مثل، كأن)', 'الاستعارة: تشبيه حذف أحد طرفيه', 'الكناية: تعبير يُقصد به معنى خفي', 'المجاز المرسل: استخدام اللفظ في غير معناه الأصلي', 'الجناس: تشابه اللفظين مع اختلاف المعنى'],
    },
    literature: {
      classical: ['الشعر الجاهلي: المعلقات السبع الكبرى', 'الأدب الإسلامي: القرآن الكريم والحديث النبوي', 'الأدب الأموي: زهد وفخر وغزل', 'الأدب العباسي: أبو تمام والمتنبي والبحتري', 'الأدب الأندلسي: ابن خفاجة وابن زيدون'],
      modern: ['رائد النهضة: طه حسين ومحمود تيمور', 'الشعر الحديث: أحمد شوقي وحافظ إبراهيم', 'الرواية المصرية: نجيب محفوظ صاحب نوبل', 'الأدب النسائي: نوال السعداوي'],
    },
  },
  english: {
    grammar: {
      tenses: {
        present: ['Simple present: I study / She studies', 'Present continuous: I am studying', 'Present perfect: I have studied', 'Present perfect continuous: I have been studying'],
        past: ['Simple past: I studied (add -ed for regular)', 'Past continuous: I was studying', 'Past perfect: I had studied', 'Past perfect continuous: I had been studying'],
        future: ['Simple future: I will study / I am going to study', 'Future continuous: I will be studying', 'Future perfect: I will have studied'],
      },
      conditionals: ['Zero: If water freezes, it becomes ice (general truth)', 'First: If I study, I will pass (real possibility)', 'Second: If I studied, I would pass (unreal present)', 'Third: If I had studied, I would have passed (unreal past)'],
      passive_voice: ['Active: Subject + verb + object', 'Passive: Object + to be + past participle (+ by agent)', 'Present: The book is read', 'Past: The book was read', 'Future: The book will be read'],
      parts_of_speech: ['Noun: names person, place or thing', 'Pronoun: replaces a noun (he, she, it, they)', 'Verb: shows action or state (run, is)', 'Adjective: describes a noun (tall, blue)', 'Adverb: modifies verb/adjective (quickly, very)', 'Preposition: shows relationship (in, on, at, by)', 'Conjunction: joins clauses (and, but, because, although)'],
    },
    writing: ['Paragraph: topic sentence + supporting details + conclusion', 'Essay: introduction + body paragraphs + conclusion', 'Formal letter: Date, Address, Dear Sir/Madam, Body, Yours faithfully', 'Informal letter: Date, Dear [name], Body, Best wishes'],
    vocabulary: {
      academic: ['analyze = examine carefully', 'evaluate = judge the value of', 'describe = give details about', 'compare = show similarities', 'contrast = show differences', 'explain = make clear why/how', 'discuss = consider different aspects'],
    },
  },
  social_studies: {
    egypt_history: ['Ancient Egypt: Pharaonic civilization 3100 BC', 'Pyramids built during Old Kingdom', 'Middle Kingdom: expansion and prosperity', 'New Kingdom: Ramses II and Abu Simbel', 'Islamic conquest 641 AD by Amr ibn al-As', 'Ottoman period 1517-1798', 'Napoleon\'s campaign 1798-1801', 'Muhammad Ali modernization 1805-1849', '1952 Revolution led by Free Officers', 'Suez Crisis 1956 - nationalization', 'October War 1973 - crossing the canal'],
    geography: ['Egypt area: 1,002,450 km² (mostly desert)', 'Population: ~100 million', 'Nile River: longest river in Africa (6,650 km)', 'Delta region: most fertile agricultural land', 'Desert regions: Western (Sahara), Eastern, Sinai', 'Climate: hot dry desert, Mediterranean coast mild', 'Main cities: Cairo (capital), Alexandria, Giza, Luxor, Aswan'],
    civics: ['Egypt is a republic with President, Parliament, Government', 'Constitution guarantees rights and duties', 'Egypt member of Arab League, African Union, UN', 'Economy: tourism, Suez Canal revenue, oil, remittances', 'Agriculture: cotton, rice, wheat, sugarcane'],
  },
  islamic_studies: {
    pillars: ['1. Shahada (Declaration of faith)', '2. Salah (Prayer 5 times daily)', '3. Zakat (Charity 2.5% of savings)', '4. Sawm (Fasting during Ramadan)', '5. Hajj (Pilgrimage to Mecca once if able)'],
    quran: ['114 Surahs (chapters)', '6,236 Ayat (verses)', 'Revealed over 23 years', 'First revelation: Surah Al-Alaq', 'Preserved unchanged for 1400+ years'],
    seerah: ['Prophet Muhammad ﷺ born 570 CE in Mecca', 'First revelation at age 40 in cave Hira', 'Hijra to Medina in 622 CE (Islamic calendar start)', 'Conquest of Mecca in 630 CE', 'Farewell Hajj and last sermon', 'Passed away 632 CE in Medina'],
  },
  sciences_subjects: {
    biology: ['Cell division: Mitosis (growth) and Meiosis (reproduction)', 'DNA double helix structure by Watson & Crick', 'Genetics: dominant/recessive alleles', 'Evolution: natural selection by Darwin', 'Ecosystems: abiotic and biotic components', 'Human body systems: circulatory, respiratory, digestive, nervous'],
    chemistry: ['Periodic table: 118 elements', 'Periods (rows) and Groups (columns)', 'Metals: conduct electricity, malleable, ductile', 'Non-metals: poor conductors, brittle', 'Chemical bonds: ionic, covalent, metallic', 'Acid: pH < 7, Base: pH > 7, Neutral: pH = 7'],
    physics: ['Speed = distance/time', 'Acceleration = (v-u)/t', 'Newton\'s laws of motion', 'Ohm\'s Law: V=IR', 'Wave properties: frequency, wavelength, amplitude', 'Electromagnetic spectrum: radio, microwave, IR, visible, UV, X-ray, gamma'],
  },
};

// ── Question Banks ──────────────────────────────────────
const QUESTION_BANKS = {
  mathematics: {
    easy: [
      { question: 'What is 12 + 8?', options: ['A) 18', 'B) 20', 'C) 22', 'D) 24'], correct: 1, explanation: '12 + 8 = 20.' },
      { question: 'What is 5 × 7?', options: ['A) 30', 'B) 32', 'C) 35', 'D) 40'], correct: 2, explanation: '5 × 7 = 35.' },
      { question: 'What is ½ of 40?', options: ['A) 10', 'B) 15', 'C) 20', 'D) 25'], correct: 2, explanation: '40 ÷ 2 = 20.' },
      { question: 'Perimeter of square with side 6?', options: ['A) 12', 'B) 18', 'C) 24', 'D) 36'], correct: 2, explanation: '4 × 6 = 24.' },
      { question: 'Which is prime?', options: ['A) 4', 'B) 6', 'C) 9', 'D) 7'], correct: 3, explanation: '7 is only divisible by 1 and 7.' },
    ],
    medium: [
      { question: 'Solve: 3x + 6 = 18', options: ['A) x=2', 'B) x=3', 'C) x=4', 'D) x=6'], correct: 2, explanation: '3x=12, x=4.' },
      { question: 'Area of circle with r=7 (π≈3.14)?', options: ['A) 21.98', 'B) 43.96', 'C) 153.86', 'D) 307.72'], correct: 2, explanation: 'π×49≈153.86.' },
      { question: '15% of 80?', options: ['A) 8', 'B) 10', 'C) 12', 'D) 15'], correct: 2, explanation: '0.15×80=12.' },
      { question: 'Simplify 24/36', options: ['A) 1/2', 'B) 2/3', 'C) 3/4', 'D) 4/5'], correct: 1, explanation: 'GCF=12, 24÷12=2, 36÷12=3.' },
      { question: 'Rectangle 12×8 area?', options: ['A) 40', 'B) 80', 'C) 96', 'D) 104'], correct: 2, explanation: '12×8=96.' },
    ],
    hard: [
      { question: 'Roots of x²-5x+6=0?', options: ['A) 1,3', 'B) 2,3', 'C) 2,4', 'D) 3,4'], correct: 1, explanation: '(x-2)(x-3)=0.' },
      { question: 'sin(30°)=?', options: ['A) 0', 'B) 0.5', 'C) √2/2', 'D) 1'], correct: 1, explanation: 'sin(30°)=1/2=0.5.' },
      { question: 'f(x)=2x²-3x+1, f(3)=?', options: ['A) 8', 'B) 10', 'C) 12', 'D) 16'], correct: 1, explanation: '2(9)-3(3)+1=10.' },
    ],
  },
  science: {
    easy: [
      { question: 'What do plants use to make food?', options: ['A) Moonlight', 'B) Sunlight', 'C) Starlight', 'D) Lamplight'], correct: 1, explanation: 'Photosynthesis uses sunlight.' },
      { question: 'Basic unit of life?', options: ['A) Atom', 'B) Molecule', 'C) Cell', 'D) Organ'], correct: 2, explanation: 'The cell is the basic unit of life.' },
      { question: 'Plant photosynthesis produces?', options: ['A) CO₂', 'B) Nitrogen', 'C) Hydrogen', 'D) Oxygen'], correct: 3, explanation: 'Oxygen is a byproduct of photosynthesis.' },
      { question: 'Force that pulls objects to Earth?', options: ['A) Magnetism', 'B) Friction', 'C) Gravity', 'D) Tension'], correct: 2, explanation: 'Gravity pulls all objects toward Earth.' },
      { question: 'Water boils at?', options: ['A) 50°C', 'B) 80°C', 'C) 100°C', 'D) 120°C'], correct: 2, explanation: '100°C at standard pressure.' },
    ],
    medium: [
      { question: "Newton's 2nd Law?", options: ['A) F=mc²', 'B) F=ma', 'C) E=mc²', 'D) P=mv'], correct: 1, explanation: 'Force = mass × acceleration.' },
      { question: 'Which organelle produces energy?', options: ['A) Nucleus', 'B) Vacuole', 'C) Ribosome', 'D) Mitochondria'], correct: 3, explanation: 'Mitochondria produce ATP.' },
      { question: 'Chemical symbol for Gold?', options: ['A) Go', 'B) Gd', 'C) Au', 'D) Ag'], correct: 2, explanation: 'Au from Latin "Aurum".' },
      { question: 'Speed of light?', options: ['A) 3×10⁶ m/s', 'B) 3×10⁸ m/s', 'C) 3×10⁵ m/s', 'D) 3×10¹⁰ m/s'], correct: 1, explanation: '3×10⁸ m/s.' },
      { question: 'Neutral atomic particle?', options: ['A) Proton', 'B) Electron', 'C) Neutron', 'D) Positron'], correct: 2, explanation: 'Neutrons have no charge.' },
    ],
    hard: [
      { question: 'Object in equilibrium net force?', options: ['A) = weight', 'B) > zero', 'C) Zero', 'D) = friction'], correct: 2, explanation: 'Net force = 0 in equilibrium.' },
      { question: 'Anaerobic respiration produces?', options: ['A) CO₂ only', 'B) ATP + CO₂', 'C) ATP + O₂', 'D) Glucose'], correct: 1, explanation: 'ATP and CO₂ (or ethanol in yeast).' },
      { question: "Avogadro's number?", options: ['A) 6.022×10²¹', 'B) 6.022×10²³', 'C) 6.022×10²⁵', 'D) 6.022×10²⁷'], correct: 1, explanation: '6.022×10²³ particles per mole.' },
    ],
  },
  arabic: {
    easy: [
      { question: 'جمع "كتاب"؟', options: ['أ) كتابين', 'ب) كتب', 'ج) كاتبون', 'د) مكتبة'], correct: 1, explanation: '"كتب" جمع تكسير.' },
      { question: 'جملة "محمد يلعب" نوعها؟', options: ['أ) اسمية', 'ب) فعلية', 'ج) شرطية', 'د) استفهامية'], correct: 0, explanation: 'تبدأ باسم فهي اسمية.' },
      { question: 'حركة إعراب الفاعل؟', options: ['أ) الفتح', 'ب) الكسر', 'ج) الضم', 'د) السكون'], correct: 2, explanation: 'الفاعل مرفوع بالضمة.' },
    ],
    medium: [
      { question: 'مثنى "طالب"؟', options: ['أ) طلاب', 'ب) طالبان', 'ج) طالبون', 'د) طلبة'], correct: 1, explanation: '"طالبان" في حالة الرفع.' },
      { question: 'الفعل المضارع من الأفعال التالية؟', options: ['أ) كتب', 'ب) يكتب', 'ج) اكتب', 'د) كتابة'], correct: 1, explanation: '"يكتب" مضارع يبدأ بحرف مضارعة.' },
      { question: 'علامة نصب الاسم المفرد؟', options: ['أ) الضمة', 'ب) الفتحة', 'ج) الكسرة', 'د) السكون'], correct: 1, explanation: 'المفرد المنصوب علامته الفتحة.' },
    ],
    hard: [
      { question: 'إعراب "الطالبَ" في: رأيتُ الطالبَ؟', options: ['أ) فاعل مرفوع', 'ب) مبتدأ', 'ج) مفعول به منصوب', 'د) خبر'], correct: 2, explanation: 'مفعول به منصوب بالفتحة.' },
      { question: 'التشبيه في: "الجندي كالأسد شجاعة"؟ أداة التشبيه؟', options: ['أ) الجندي', 'ب) كالأسد', 'ج) كـ', 'د) شجاعة'], correct: 2, explanation: '"كـ" هي أداة التشبيه.' },
    ],
  },
  english: {
    easy: [
      { question: 'Which is a noun?', options: ['A) Run', 'B) Blue', 'C) School', 'D) Quickly'], correct: 2, explanation: '"School" names a place.' },
      { question: '"She ___ to school every day."', options: ['A) go', 'B) goes', 'C) going', 'D) gone'], correct: 1, explanation: 'She/He/It → add -s.' },
      { question: 'Plural of "child"?', options: ['A) childs', 'B) children', 'C) childes', 'D) childrens'], correct: 1, explanation: '"Children" is irregular plural.' },
    ],
    medium: [
      { question: '"I have finished my homework" - tense?', options: ['A) Simple past', 'B) Present perfect', 'C) Past perfect', 'D) Future'], correct: 1, explanation: 'have + past participle = present perfect.' },
      { question: 'Passive of "She writes a letter"?', options: ['A) A letter writes', 'B) A letter is written by her', 'C) A letter was written', 'D) She is written'], correct: 1, explanation: 'Object + is/are + past participle + by + subject.' },
    ],
    hard: [
      { question: 'Type of conditional: "If it rains, I will stay home"', options: ['A) Zero', 'B) First', 'C) Second', 'D) Third'], correct: 1, explanation: 'First conditional: real/possible future situation.' },
      { question: '"Despite studying hard, he failed" - "Despite" introduces?', options: ['A) Result', 'B) Contrast/concession', 'C) Reason', 'D) Condition'], correct: 1, explanation: '"Despite" shows contrast/concession.' },
    ],
  },
  social_studies: {
    easy: [
      { question: 'Capital of Egypt?', options: ['A) Alexandria', 'B) Luxor', 'C) Cairo', 'D) Aswan'], correct: 2, explanation: 'Cairo is the capital of Egypt.' },
      { question: 'Longest river in Africa?', options: ['A) Congo', 'B) Niger', 'C) Zambezi', 'D) Nile'], correct: 3, explanation: 'The Nile is 6,650 km long.' },
      { question: 'Who built the pyramids?', options: ['A) Romans', 'B) Greeks', 'C) Ancient Egyptians', 'D) Arabs'], correct: 2, explanation: 'Ancient Egyptians built the pyramids as royal tombs.' },
    ],
    medium: [
      { question: 'Year of 1952 Egyptian Revolution?', options: ['A) 1948', 'B) 1952', 'C) 1956', 'D) 1973'], correct: 1, explanation: 'July 23, 1952 - Free Officers Movement.' },
      { question: 'The Suez Canal was nationalized in?', options: ['A) 1952', 'B) 1954', 'C) 1956', 'D) 1967'], correct: 2, explanation: 'President Nasser nationalized Suez Canal in July 1956.' },
    ],
    hard: [
      { question: 'Egypt\'s total area (approximately)?', options: ['A) 500,000 km²', 'B) 750,000 km²', 'C) 1,002,450 km²', 'D) 1,500,000 km²'], correct: 2, explanation: 'Egypt covers about 1,002,450 km².' },
    ],
  },
};

// ── Conversational AI Engine ────────────────────────────
const GREETING_RESPONSES = [
  "👋 Welcome back! I'm Najah AI — your personal tutor for all Egyptian school subjects. I can help with **Math, Science, Arabic, English, Social Studies**, and more. What would you like to study today?",
  "✨ Hello! Ready to learn? I cover everything from Grade 1 to Secondary 3 — the full Egyptian curriculum. Ask me anything!",
  "📚 Hi there! I'm your AI study companion. Whether it's algebra, grammar, history, or physics — I've got you covered. What subject are we tackling?",
];
const THANKS_RESPONSES = [
  "😊 You're welcome! Keep up the great work. Is there anything else you'd like to explore?",
  "🎓 Happy to help! Remember, consistency is the key to success. What's next?",
  "💪 Glad I could help! Don't hesitate to ask more questions.",
];

function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function detectSubject(message) {
  const m = message.toLowerCase();
  const subjectMap = [
    ['mathematics', /\b(math|algebra|geometry|calculus|equation|fraction|number|رياضيات|معادلة|حساب|هندسة|جبر|مشتقة|تكامل|مثلثات|إحصاء)\b/],
    ['science', /\b(science|physics|chemistry|biology|cell|atom|force|energy|علوم|فيزياء|كيمياء|أحياء|ذرة|خلية|قوة)\b/],
    ['arabic', /\b(arabic|عربي|نحو|صرف|إعراب|جملة|فعل|اسم|ضمير|أدب|شعر|بلاغة)\b/],
    ['english', /\b(english|grammar|tense|sentence|vocabulary|verb|noun|tenses|conditional|passive|conjunction)\b/],
    ['social_studies', /\b(history|geography|civics|egypt|تاريخ|جغرافيا|مصر|ثورة|نيل|فرعون|اجتماعيات)\b/],
    ['islamic_studies', /\b(islam|quran|prayer|fasting|hajj|إسلام|قرآن|صلاة|صوم|حج|سيرة|حديث)\b/],
    ['biology', /\b(biology|cells|genetics|evolution|أحياء|خلايا|وراثة|تطور)\b/],
    ['chemistry', /\b(chemistry|element|compound|acid|base|كيمياء|عنصر|مركب|حمض|قاعدة)\b/],
    ['physics', /\b(physics|velocity|acceleration|wave|فيزياء|سرعة|تسارع|موجة)\b/],
  ];
  for (const [subj, regex] of subjectMap) {
    if (regex.test(m)) return subj;
  }
  return 'general';
}

function detectTopic(message, subject) {
  const m = message.toLowerCase();
  if (subject === 'mathematics') {
    if (/fraction|كسر|كسور/.test(m)) return 'fractions';
    if (/algebra|جبر|equation|معادلة/.test(m)) return 'algebra';
    if (/geometry|هندسة|area|مساحة|perimeter|محيط|triangle|مثلث|circle|دائرة/.test(m)) return 'geometry';
    if (/calculus|مشتق|تكامل|derivative|integral/.test(m)) return 'calculus';
    if (/trig|sin|cos|tan|مثلثات/.test(m)) return 'trigonometry';
    if (/statistic|إحصاء|mean|median|mode/.test(m)) return 'statistics';
    if (/probability|احتمال/.test(m)) return 'probability';
  }
  if (subject === 'science') {
    if (/photosynthesis|بناء ضوئي/.test(m)) return 'photosynthesis';
    if (/cell|خلية/.test(m)) return 'cells';
    if (/force|newton|قوة|نيوتن/.test(m)) return 'forces';
    if (/electricity|كهرباء|ohm|volt/.test(m)) return 'electricity';
    if (/wave|موجة|frequency|sound|light/.test(m)) return 'waves';
    if (/heat|thermodynamics|temperature|حرارة/.test(m)) return 'thermodynamics';
    if (/mechanic|velocity|acceleration|momentum/.test(m)) return 'mechanics';
  }
  if (subject === 'arabic') {
    if (/نحو|إعراب|جملة|فاعل|مفعول/.test(m)) return 'parsing';
    if (/فعل|ماضي|مضارع|أمر/.test(m)) return 'verb_types';
    if (/بلاغة|تشبيه|استعارة|كناية/.test(m)) return 'rhetorical';
    if (/اسم|معرفة|نكرة|جمع/.test(m)) return 'nouns';
  }
  if (subject === 'english') {
    if (/tense|past|present|future/.test(m)) return 'tenses';
    if (/passive|active voice/.test(m)) return 'passive_voice';
    if (/conditional|if clause/.test(m)) return 'conditionals';
    if (/noun|verb|adjective|adverb|part of speech/.test(m)) return 'parts_of_speech';
  }
  return null;
}

function getCurriculumInfo(subject, topic, language) {
  const isAr = language === 'ar';
  // Try to find in CURRICULUM
  let facts = null;
  if (subject === 'mathematics' && topic && CURRICULUM.mathematics.concepts[topic]) {
    facts = CURRICULUM.mathematics.concepts[topic];
  } else if (subject === 'science') {
    const levels = ['primary', 'preparatory', 'secondary'];
    for (const lvl of levels) {
      if (CURRICULUM.science[lvl]?.concepts?.[topic]) {
        facts = CURRICULUM.science[lvl].concepts[topic];
        break;
      }
    }
  } else if (subject === 'arabic' && topic && CURRICULUM.arabic.grammar[topic]) {
    facts = CURRICULUM.arabic.grammar[topic];
  } else if (subject === 'english' && topic && CURRICULUM.english.grammar[topic]) {
    facts = CURRICULUM.english.grammar[topic];
  } else if (subject === 'social_studies') {
    facts = CURRICULUM.social_studies.egypt_history.slice(0, 6);
  } else if (subject === 'islamic_studies') {
    facts = CURRICULUM.islamic_studies.pillars;
  }

  if (!facts || !facts.length) return null;

  const intro = isAr
    ? `📚 **هذا ما أعرفه عن ${topic || subject}:**\n\n`
    : `📚 **Here's a starting point about ${topic || subject}:**\n\n`;

  const explanation = facts.slice(0, 3).map((f, i) => `${i + 1}. ${f}`).join('\n');

  const socraticPrompt = isAr
    ? `\n\n🧠 **تفكير نقدي (Socratic Scaffolding):** بناءً على هذه المعلومات، كيف يمكنك تطبيق ذلك في الحياة العملية؟ أو ماذا تعتقد أنه سيحدث إذا تغير أحد هذه العوامل؟ شاركني أفكارك!`
    : `\n\n🧠 **Critical Thinking (Socratic Scaffolding):** Based on these concepts, how would you apply this in a real-world scenario? Or what do you think happens if we change one of these factors? Tell me your thoughts!`;

  return intro + explanation + socraticPrompt;
}

// ── Main Chat Function ──────────────────────────────────
function generateChatResponse(message, history = [], language = 'en') {
  const m = message.toLowerCase().trim();
  const isAr = language === 'ar';
  const subject = detectSubject(m);
  const topic = detectTopic(m, subject);

  // Greetings
  if (/^(hi|hello|hey|good|مرحبا|السلام|أهلا|صباح|مساء)\b/.test(m)) {
    return pickRandom(GREETING_RESPONSES);
  }
  // Thanks
  if (/\b(thank|شكر|شكراً|ممتاز|أحسنت)\b/.test(m)) {
    return pickRandom(THANKS_RESPONSES);
  }
  // Bye
  if (/\b(bye|goodbye|مع السلامة|وداعاً|إلى اللقاء)\b/.test(m)) {
    return isAr ? '👋 مع السلامة! استمر في التعلم.' : '👋 Goodbye! Keep studying! You\'ve got this! 🎓';
  }

  // Curriculum-specific Socratic Scaffolding
  const info = getCurriculumInfo(subject, topic, language);
  if (info) {
    return info;
  }

  // Subject detected, no specific topic
  if (subject !== 'general') {
    const subjectLabels = {
      mathematics: isAr ? 'الرياضيات' : 'Mathematics',
      science: isAr ? 'العلوم' : 'Science',
      arabic: 'اللغة العربية',
      english: 'English Language',
      social_studies: isAr ? 'الدراسات الاجتماعية' : 'Social Studies',
      islamic_studies: isAr ? 'التربية الإسلامية' : 'Islamic Studies',
      biology: isAr ? 'الأحياء' : 'Biology',
      chemistry: isAr ? 'الكيمياء' : 'Chemistry',
      physics: isAr ? 'الفيزياء' : 'Physics',
    };
    const label = subjectLabels[subject] || subject;
    return isAr
      ? `📖 يمكنني مساعدتك في **${label}**. ما الموضوع المحدد الذي تريد معرفته؟ مثلاً: المعادلات، الفعل والفاعل، قوانين نيوتن...`
      : `📖 I can help you with **${label}**! What specific topic would you like to explore? For example: equations, tenses, Newton's laws, cell structure...`;
  }

  // Handle math expressions directly
  if (/^[\d\s\+\-\*\/\^\(\)\.=x]+$/.test(m) || /(\d+\s*[\+\-\*\/]\s*\d+)/.test(m)) {
    try {
      // Simple safe eval for arithmetic
      const expr = m.replace(/x/gi, '*').replace(/[^0-9+\-*/().\s]/g, '');
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + expr + ')')();
      if (typeof result === 'number' && isFinite(result)) {
        return isAr
          ? `أرى أنك تحاول حل مسألة رياضية. الناتج هو **${result}**. \nلكن الأهم من الناتج هو طريقة الحل! هل يمكنك شرح الخطوات التي استخدمتها للوصول إلى هذا الرقم؟ (أسلوب سقراطي)`
          : `I see you are solving a math problem. The final result is **${result}**. \nHowever, the process is more important than the answer! Can you explain the steps you would take to reach this? (Socratic Approach)`;
      }
    } catch { }
  }

  // Study help
  if (/\b(study|plan|schedule|how to study|خطة|كيف أذاكر)\b/.test(m)) {
    return isAr
      ? '📅 لإنشاء خطة دراسية مخصصة، افتح تبويب **"التخطيط التكتيكي"** في صفحة الذكاء الاصطناعي.\n💡 **نصيحة**: الدراسة المتباعدة (Spaced Repetition) هي الأسلوب العلمي الأكثر فعالية للحفظ والفهم!'
      : '📅 To create a personalized study plan, open the **Study Plan** tab in the AI section.\n💡 **Pro tip**: Spaced repetition is scientifically proven as the most effective study technique — review material after 1 day, 3 days, 1 week, 1 month!';
  }

  // Quiz request
  if (/\b(quiz|test|practice|أسئلة|اختبر|اختبار)\b/.test(m)) {
    return isAr
      ? '📝 استخدم تبويب **"التقييمات"** في صفحة الذكاء الاصطناعي لتوليد اختبار تفاعلي في أي مادة ومستوى!'
      : '📝 Head to the **Assessments** tab in the AI section to generate an interactive quiz in any subject and difficulty level!';
  }

  // Fallback — conversational (Socratic Inquiry)
  const fallbacks = isAr
    ? [
      '🤔 هذا مثير للاهتمام. ما الذي يجعلك تفكر في هذا؟ دعنا نستكشف الموضوع خطوة بخطوة.',
      '💡 أنا هنا لتوجيهك بدلاً من إعطائك إجابات مباشرة. ما هي معلوماتك الحالية عن هذا الموضوع؟',
      '📚 كمعلم سقراطي، أود أن أسألك أولاً: كيف تعرف هذا المفهوم بكلماتك الخاصة؟',
    ]
    : [
      '🤔 That is very interesting. What makes you think of that? Let\'s explore this step-by-step.',
      '💡 I am here to guide you rather than just giving direct answers. What do you already know about this topic?',
      '📚 As your Socratic tutor, I want to ask you first: how would you define this concept in your own words?',
    ];
  return pickRandom(fallbacks);
}

// ── Quiz Generator ──────────────────────────────────────
function generateQuiz({ subject = 'mathematics', difficulty = 'medium', count = 5, language = 'en' }) {
  const subj = subject.toLowerCase();
  const diff = difficulty.toLowerCase();
  const bank = QUESTION_BANKS[subj]?.[diff]
    || QUESTION_BANKS[subj]?.medium
    || QUESTION_BANKS.mathematics.medium;

  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const questions = [];
  while (questions.length < Math.min(count, 20)) {
    questions.push(...shuffled.slice(0, Math.min(count - questions.length, shuffled.length)));
  }
  return { subject: subj, difficulty, language, count: questions.slice(0, count).length, questions: questions.slice(0, count) };
}

// ── PDF Summarizer ──────────────────────────────────────
function summarizeText(text, language = 'en', pages = 1) {
  const STOP_EN = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'this', 'that', 'and', 'or', 'but', 'so', 'as', 'from', 'into', 'it', 'he', 'she', 'they', 'we', 'you', 'i', 'his', 'her', 'their', 'our']);
  const STOP_AR = new Set(['في', 'من', 'إلى', 'على', 'هو', 'هي', 'هم', 'مع', 'كان', 'كانت', 'وإلى', 'وفي', 'ومن', 'أن', 'إن', 'لا', 'ما', 'هذا', 'هذه', 'ذلك', 'تلك']);
  const stopwords = language === 'ar' ? STOP_AR : STOP_EN;
  if (!text || text.trim().length < 50) return language === 'ar' ? 'لا يوجد نص كافٍ للتلخيص.' : 'Not enough text to summarize.';

  const sentences = text.match(/[^.!?؟\n]{20,}[.!?؟]?/g) || [text];
  const words = text.toLowerCase().split(/\s+/);
  const tf = {};
  words.forEach(w => { const c = w.replace(/[^a-zأ-ي]/g, ''); if (c.length > 3 && !stopwords.has(c)) tf[c] = (tf[c] || 0) + 1; });

  const scored = sentences.map(s => ({
    s: s.trim(),
    score: s.toLowerCase().split(/\s+/).reduce((acc, w) => acc + (tf[w.replace(/[^a-zأ-ي]/g, '')] || 0), 0) / Math.max(s.split(/\s+/).length, 1),
  }));

  const topN = Math.max(4, Math.min(8, Math.ceil(sentences.length * 0.20)));
  const topSet = new Set([...scored].sort((a, b) => b.score - a.score).slice(0, topN).map(x => x.s));
  const summary = scored.filter(x => topSet.has(x.s)).map(x => x.s).join(' ');
  const keyTerms = Object.entries(tf).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w);

  return language === 'ar'
    ? `📋 **ملخص المستند (${pages} صفحة)**\n\n${summary}\n\n🔑 **المصطلحات الرئيسية:** ${keyTerms.join('، ')}`
    : `📋 **Document Summary (${pages} pages)**\n\n${summary}\n\n🔑 **Key Terms:** ${keyTerms.join(', ')}`;
}

// ── Study Plan Generator ────────────────────────────────
function generateStudyPlan({ subject, daysUntil, dailyHours = 2, currentLevel = 'beginner', language = 'en' }) {
  const isAr = language === 'ar';
  const topicsMap = {
    mathematics: ['Arithmetic', 'Algebra', 'Geometry', 'Trigonometry', 'Statistics', 'Calculus', 'Problem Solving', 'Review'],
    science: ['Basic Concepts', 'Physics', 'Chemistry', 'Biology', 'Lab Work', 'Applications', 'Review'],
    arabic: ['النحو والإعراب', 'الصرف', 'البلاغة', 'الأدب', 'الفهم القرائي', 'التعبير', 'المراجعة'],
    english: ['Grammar', 'Vocabulary', 'Reading', 'Writing', 'Speaking', 'Listening', 'Review'],
    social_studies: ['Ancient Egypt', 'Modern History', 'Geography', 'Civics', 'Review'],
  };
  const topics = topicsMap[subject?.toLowerCase()] || ['Introduction', 'Core Concepts', 'Practice', 'Review', 'Assessment'];
  const phases = [
    { name: isAr ? 'تأسيس' : 'Foundation', pct: 0.25, type: 'study' },
    { name: isAr ? 'فهم' : 'Understanding', pct: 0.30, type: 'study' },
    { name: isAr ? 'تطبيق' : 'Practice', pct: 0.25, type: 'practice' },
    { name: isAr ? 'مراجعة' : 'Review', pct: 0.15, type: 'review' },
    { name: isAr ? 'اختبار' : 'Assessment', pct: 0.05, type: 'test' },
  ];
  const today = new Date();
  const plan = [];
  for (let day = 1; day <= Math.min(daysUntil, 30); day++) {
    const date = new Date(today);
    date.setDate(today.getDate() + day - 1);
    const dateStr = date.toISOString().split('T')[0];
    const isRest = day % 7 === 0;
    if (isRest) {
      plan.push({ day, date: dateStr, sessions: [{ time: '10:00', duration: 30, topic: isAr ? 'مراجعة خفيفة' : 'Light Review', goal: isAr ? 'استرح' : 'Rest and consolidate', type: 'rest' }] });
      continue;
    }
    const phaseIdx = Math.min(Math.floor((day / daysUntil) * phases.length), phases.length - 1);
    const phase = phases[phaseIdx];
    const sessions = [];
    const n = Math.max(1, Math.min(Number(dailyHours) || 2, 4));
    for (let s = 0; s < n; s++) {
      const hour = 9 + (s * 2);
      sessions.push({ time: `${String(hour).padStart(2, '0')}:00`, duration: 60, topic: topics[(Math.floor((day - 1) / daysUntil * topics.length) + s) % topics.length], goal: `${phase.name}`, type: phase.type });
    }
    plan.push({ day, date: dateStr, sessions });
  }
  const tipsByLevel = {
    beginner: isAr ? ['ابدأ بالأساسيات', 'استخدم الصور والمخططات', 'راجع يومياً 20 دقيقة'] : ['Start with fundamentals', 'Use diagrams and visuals', 'Review 20 minutes daily'],
    intermediate: isAr ? ['ركز على نقاط ضعفك', 'حل أوراق امتحانات سابقة', 'علّم غيرك ما تعلمته'] : ['Focus on weak areas', 'Solve past exam papers', 'Teach others to reinforce learning'],
    advanced: isAr ? ['ادرس الحالات الاستثنائية', 'اربط المفاهيم ببعضها', 'حل مسائل أصعب'] : ['Study edge cases', 'Connect concepts across topics', 'Challenge yourself with harder problems'],
  };
  return { subject, daysUntil, dailyHours, currentLevel, plan, tips: tipsByLevel[currentLevel] || tipsByLevel.beginner, totalHours: Math.floor(daysUntil * (Number(dailyHours) || 2) * 6 / 7), weakAreas: [] };
}

// ── Capabilities ────────────────────────────────────────
function getCapabilities() {
  return {
    engine: 'Najah Internal AI v2.0 (DeepTutor Socratic Engine)',
    alwaysAvailable: true, requiresApiKey: false,
    features: {
      chat: { supported: true, quality: 'Excellent', notes: 'DeepTutor Socratic Pedagogy, Cognitive Scaffolding' },
      quiz: { supported: true, quality: 'Excellent', notes: 'Math, Science, Arabic, English, Social Studies' },
      summary: { supported: true, quality: 'Good', notes: 'TF-IDF extraction from uploaded PDFs' },
      studyPlan: { supported: true, quality: 'Excellent', notes: 'Personalized plans for all subjects' },
    },
    subjects: ['mathematics', 'science', 'arabic', 'english', 'social_studies', 'islamic_studies', 'biology', 'chemistry', 'physics'],
    grades: { primary: '1-6', preparatory: '7-9', secondary: '10-12' },
    languages: ['en', 'ar'],
  };
}

module.exports = { generateChatResponse, generateQuiz, summarizeText, generateStudyPlan, getCapabilities };
