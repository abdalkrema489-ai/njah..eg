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
      { question: 'ما ناتج 144 ÷ 12؟', options: ['أ) 10', 'ب) 11', 'ج) 12', 'د) 13'], correct: 2, explanation: '144 ÷ 12 = 12.' },
      { question: 'What is 3³?', options: ['A) 6', 'B) 9', 'C) 18', 'D) 27'], correct: 3, explanation: '3³ = 3×3×3 = 27.' },
      { question: 'What is 20% of 150?', options: ['A) 20', 'B) 25', 'C) 30', 'D) 35'], correct: 2, explanation: '0.20 × 150 = 30.' },
      { question: 'Which is NOT a prime number?', options: ['A) 2', 'B) 11', 'C) 15', 'D) 17'], correct: 2, explanation: '15 = 3 × 5, not prime.' },
      { question: 'ما قيمة س في: 2س = 14؟', options: ['أ) 5', 'ب) 6', 'ج) 7', 'د) 8'], correct: 2, explanation: 'س = 14 ÷ 2 = 7.' },
      { question: 'مساحة مثلث قاعدته 8 وارتفاعه 5؟', options: ['أ) 13', 'ب) 20', 'ج) 40', 'د) 80'], correct: 1, explanation: '½ × 8 × 5 = 20.' },
      { question: 'What is √81?', options: ['A) 7', 'B) 8', 'C) 9', 'D) 10'], correct: 2, explanation: '9 × 9 = 81.' },
      { question: 'Angles of a triangle sum to?', options: ['A) 90°', 'B) 180°', 'C) 270°', 'D) 360°'], correct: 1, explanation: 'Triangle angles always sum to 180°.' },
      { question: 'ما نوع المثلث الذي زواياه 60°، 60°، 60°؟', options: ['أ) قائم', 'ب) متساوي الساقين', 'ج) متساوي الأضلاع', 'د) منفرج'], correct: 2, explanation: 'الزوايا الثلاثة متساوية → متساوي الأضلاع.' },
      { question: 'ما مقلوب العدد 4؟', options: ['أ) 0.4', 'ب) ¼', 'ج) 4', 'د) -4'], correct: 1, explanation: 'مقلوب 4 هو 1/4.' },
    ],
    medium: [
      { question: 'Solve: 3x + 6 = 18', options: ['A) x=2', 'B) x=3', 'C) x=4', 'D) x=6'], correct: 2, explanation: '3x=12, x=4.' },
      { question: 'Area of circle with r=7 (π≈3.14)?', options: ['A) 21.98', 'B) 43.96', 'C) 153.86', 'D) 307.72'], correct: 2, explanation: 'π×49≈153.86.' },
      { question: '15% of 80?', options: ['A) 8', 'B) 10', 'C) 12', 'D) 15'], correct: 2, explanation: '0.15×80=12.' },
      { question: 'Simplify 24/36', options: ['A) 1/2', 'B) 2/3', 'C) 3/4', 'D) 4/5'], correct: 1, explanation: 'GCF=12, 24÷12=2, 36÷12=3.' },
      { question: 'Rectangle 12×8 area?', options: ['A) 40', 'B) 80', 'C) 96', 'D) 104'], correct: 2, explanation: '12×8=96.' },
      { question: 'حل: 2س² = 32', options: ['أ) س=2', 'ب) س=4', 'ج) س=8', 'د) س=±4'], correct: 3, explanation: 'س² = 16، س = ±4.' },
      { question: 'Find the slope of y = 3x - 7', options: ['A) -7', 'B) 3', 'C) -3', 'D) 7'], correct: 1, explanation: 'In y=mx+b, m is the slope = 3.' },
      { question: 'log₁₀(1000) = ?', options: ['A) 2', 'B) 3', 'C) 4', 'D) 100'], correct: 1, explanation: '10³ = 1000, so log₁₀(1000) = 3.' },
      { question: 'cos(0°) = ?', options: ['A) 0', 'B) 0.5', 'C) 1', 'D) -1'], correct: 2, explanation: 'cos(0°) = 1.' },
      { question: 'Probability of rolling a 6 on a dice?', options: ['A) 1/3', 'B) 1/4', 'C) 1/6', 'D) 1/2'], correct: 2, explanation: 'One outcome out of six: 1/6.' },
      { question: 'What is 7! (7 factorial)?', options: ['A) 49', 'B) 720', 'C) 2520', 'D) 5040'], correct: 3, explanation: '7! = 7×6×5×4×3×2×1 = 5040.' },
      { question: 'ما قيمة تمييز المعادلة x²-4x+4=0؟', options: ['أ) 0', 'ب) 8', 'ج) 16', 'د) -8'], correct: 0, explanation: 'Δ = 16-16 = 0، جذر واحد.' },
      { question: 'مصفوفة 2×2 محددها: [[1,2],[3,4]]؟', options: ['أ) -2', 'ب) 2', 'ج) 10', 'د) -10'], correct: 0, explanation: 'det = (1×4)-(2×3) = 4-6 = -2.' },
      { question: 'مجموع متتالية حسابية أولها 1 وآخرها 99 وعدد حدودها 50؟', options: ['أ) 2000', 'ب) 2450', 'ج) 2500', 'د) 4950'], correct: 2, explanation: 'المجموع = (50/2)(1+99) = 2500.' },
      { question: 'ما نهاية: lim(x→∞) 1/x؟', options: ['أ) 1', 'ب) ∞', 'ج) 0', 'د) غير معرفة'], correct: 2, explanation: 'كلما كبر x، صغرت 1/x وتقترب من 0.' },
    ],
    hard: [
      { question: 'Roots of x²-5x+6=0?', options: ['A) 1,3', 'B) 2,3', 'C) 2,4', 'D) 3,4'], correct: 1, explanation: '(x-2)(x-3)=0.' },
      { question: 'sin(30°)=?', options: ['A) 0', 'B) 0.5', 'C) √2/2', 'D) 1'], correct: 1, explanation: 'sin(30°)=1/2=0.5.' },
      { question: 'f(x)=2x²-3x+1, f(3)=?', options: ['A) 8', 'B) 10', 'C) 12', 'D) 16'], correct: 1, explanation: '2(9)-3(3)+1=10.' },
      { question: '∫2x dx = ?', options: ['A) x', 'B) 2', 'C) x²+C', 'D) 2x²+C'], correct: 2, explanation: '∫2x dx = x² + C.' },
      { question: 'مشتقة f(x) = sin(3x)؟', options: ['أ) cos(3x)', 'ب) 3cos(3x)', 'ج) -3cos(3x)', 'د) sin(3x)'], correct: 1, explanation: 'd/dx[sin(ax)] = a·cos(ax).' },
      { question: 'sin²θ + cos²θ = ?', options: ['A) 0', 'B) 1', 'C) 2', 'D) sin(2θ)'], correct: 1, explanation: 'Pythagorean identity: always equals 1.' },
      { question: 'مجموع متسلسلة هندسية لا نهائية: a=8, r=½؟', options: ['أ) 8', 'ب) 12', 'ج) 16', 'د) 24'], correct: 2, explanation: 'S∞ = a/(1-r) = 8/(½) = 16.' },
    ],
  },
  physics: {
    easy: [
      { question: 'وحدة قياس القوة في النظام الدولي؟', options: ['أ) جول', 'ب) واط', 'ج) نيوتن', 'د) باسكال'], correct: 2, explanation: 'القوة تقاس بالنيوتن (N).' },
      { question: 'أي منهم عازل للكهرباء؟', options: ['أ) نحاس', 'ب) فضة', 'ج) بلاستيك', 'د) حديد'], correct: 2, explanation: 'البلاستيك مادة عازلة.' },
      { question: 'سرعة الضوء في الفراغ تقريباً؟', options: ['أ) 3×10⁶ م/ث', 'ب) 3×10⁸ م/ث', 'ج) 3×10¹⁰ م/ث', 'د) 3×10¹² م/ث'], correct: 1, explanation: 'c = 3×10⁸ م/ث.' },
      { question: 'Which quantity is a vector?', options: ['A) Speed', 'B) Mass', 'C) Temperature', 'D) Force'], correct: 3, explanation: 'Force has magnitude AND direction.' },
      { question: 'قانون أوم يربط بين؟', options: ['أ) الجهد والمقاومة والتيار', 'ب) القوة والكتلة والتسارع', 'ج) الطاقة والشغل والزمن', 'د) الضغط والحجم والحرارة'], correct: 0, explanation: 'V = I × R.' },
      { question: 'ما وحدة الضغط؟', options: ['أ) نيوتن', 'ب) باسكال', 'ج) جول', 'د) واط'], correct: 1, explanation: 'الضغط = القوة ÷ المساحة، وحدته الباسكال (Pa).' },
      { question: 'أي نوع من الطاقة تمتلكها كرة متحركة؟', options: ['أ) طاقة وضع', 'ب) طاقة حركية', 'ج) طاقة كيميائية', 'د) طاقة نووية'], correct: 1, explanation: 'KE = ½mv².' },
      { question: 'What happens to resistance when temperature increases in a conductor?', options: ['A) Decreases', 'B) Stays same', 'C) Increases', 'D) Becomes zero'], correct: 2, explanation: 'Resistance increases with temperature.' },
    ],
    medium: [
      { question: 'جسم كتلته 10kg تسارعه 3m/s² — القوة المؤثرة؟', options: ['أ) 13N', 'ب) 30N', 'ج) 300N', 'د) 3N'], correct: 1, explanation: 'F = ma = 10 × 3 = 30N.' },
      { question: 'شغل قوة 50N تحرّك جسم 4m في اتجاهها؟', options: ['أ) 12.5J', 'ب) 54J', 'ج) 200J', 'د) 400J'], correct: 2, explanation: 'W = F×d = 50×4 = 200J.' },
      { question: 'تردد موجة طولها 2m وسرعتها 340m/s؟', options: ['أ) 68Hz', 'ب) 170Hz', 'ج) 340Hz', 'د) 680Hz'], correct: 1, explanation: 'f = v/λ = 340/2 = 170Hz.' },
      { question: 'قانون نيوتن الثالث يعني؟', options: ['أ) F=ma', 'ب) لكل فعل رد فعل مساوٍ ومضاد', 'ج) الجسم يستمر في حركته', 'د) الطاقة تتحول ولا تفنى'], correct: 1, explanation: 'لكل فعل رد فعل مساوٍ ومضاد.' },
      { question: 'زخم جسم 5kg يتحرك 10m/s؟', options: ['أ) 2 kg.m/s', 'ب) 15 kg.m/s', 'ج) 50 kg.m/s', 'د) 500 kg.m/s'], correct: 2, explanation: 'p = mv = 5×10 = 50 kg.m/s.' },
      { question: 'Kinetic energy of 4kg at 10m/s?', options: ['A) 40J', 'B) 200J', 'C) 400J', 'D) 800J'], correct: 1, explanation: 'KE = ½mv² = ½×4×100 = 200J.' },
      { question: 'ارتفاع جسم 2kg بـ 5m — طاقة الوضع؟ (g=10)', options: ['أ) 10J', 'ب) 25J', 'ج) 70J', 'د) 100J'], correct: 3, explanation: 'PE = mgh = 2×10×5 = 100J.' },
      { question: 'At what angle does maximum range occur in projectile?', options: ['A) 30°', 'B) 45°', 'C) 60°', 'D) 90°'], correct: 1, explanation: 'Maximum range at 45°.' },
    ],
    hard: [
      { question: 'جسم في دائرة قطرها 4m سرعته 6m/s — تسارعه المركزي؟', options: ['أ) 9m/s²', 'ب) 18m/s²', 'ج) 36m/s²', 'د) 3m/s²'], correct: 0, explanation: 'a = v²/r = 36/4 = 9 m/s².' },
      { question: 'Charge on electron?', options: ['A) +1.6×10⁻¹⁹C', 'B) -1.6×10⁻¹⁹C', 'C) 9.1×10⁻³¹C', 'D) 0'], correct: 1, explanation: 'Electron charge = -1.6×10⁻¹⁹ C.' },
      { question: 'مبدأ عدم اليقين لهايزنبرغ يقول يستحيل قياس؟', options: ['أ) الطاقة والزمن', 'ب) الموضع والزخم', 'ج) الجهد والتيار', 'د) القوة والإزاحة'], correct: 1, explanation: 'Δx·Δp ≥ ℏ/2.' },
      { question: 'مقاومتان 3Ω و6Ω على التوازي — المقاومة الكلية؟', options: ['أ) 2Ω', 'ب) 4.5Ω', 'ج) 9Ω', 'د) 18Ω'], correct: 0, explanation: '1/R = 1/3+1/6 = 1/2، R=2Ω.' },
    ],
  },
  chemistry: {
    easy: [
      { question: 'الصيغة الكيميائية لثاني أكسيد الكربون؟', options: ['أ) CO', 'ب) CO₂', 'ج) C₂O', 'د) C₂O₃'], correct: 1, explanation: 'CO₂ = ذرة كربون + ذرتا أكسجين.' },
      { question: 'الرمز الكيميائي للذهب؟', options: ['أ) Go', 'ب) Gd', 'ج) Au', 'د) Ag'], correct: 2, explanation: 'Au من اللاتينية Aurum.' },
      { question: 'What is the pH of pure water?', options: ['A) 5', 'B) 6', 'C) 7', 'D) 8'], correct: 2, explanation: 'Pure water is neutral: pH = 7.' },
      { question: 'أي الآتي حمض؟', options: ['أ) NaOH', 'ب) Ca(OH)₂', 'ج) HCl', 'د) NH₃'], correct: 2, explanation: 'HCl يعطي H⁺ في المحلول.' },
      { question: 'Chemical formula for table salt?', options: ['A) NaOH', 'B) NaCl', 'C) KCl', 'D) CaCl₂'], correct: 1, explanation: 'Table salt = Sodium Chloride = NaCl.' },
      { question: 'كم عدد إلكترونات ذرة الأكسجين (عددها الذري 8)؟', options: ['أ) 6', 'ب) 8', 'ج) 10', 'د) 16'], correct: 1, explanation: 'عدد الإلكترونات = العدد الذري = 8.' },
      { question: 'ما نوع التفاعل: A + B → AB؟', options: ['أ) تحليل', 'ب) تكاثف', 'ج) تركيب', 'د) إحلال'], correct: 2, explanation: 'عنصران يتحدان → تفاعل تركيب.' },
      { question: 'درجة انصهار الجليد عند ضغط جوي؟', options: ['أ) -10°C', 'ب) 0°C', 'ج) 4°C', 'د) 100°C'], correct: 1, explanation: 'الجليد ينصهر عند 0°C.' },
    ],
    medium: [
      { question: 'كتلة مولية CO₂؟', options: ['أ) 28 g/mol', 'ب) 32 g/mol', 'ج) 44 g/mol', 'د) 48 g/mol'], correct: 2, explanation: 'C=12، O₂=32، المجموع=44 g/mol.' },
      { question: 'In a redox reaction, the reducing agent?', options: ['A) Gains electrons', 'B) Loses electrons', 'C) Gains protons', 'D) Loses protons'], correct: 1, explanation: 'Reducing agent LOSES electrons (gets oxidized).' },
      { question: 'أيون Na⁺ يختلف عن ذرة Na في؟', options: ['أ) عدد البروتونات', 'ب) عدد النيوترونات', 'ج) عدد الإلكترونات', 'د) العدد الكتلي'], correct: 2, explanation: 'Na⁺ فقد إلكتروناً واحداً.' },
      { question: 'موازنة: H₂ + O₂ → H₂O الصحيحة؟', options: ['أ) H₂+O₂→H₂O', 'ب) H₂+O→H₂O', 'ج) 2H₂+O₂→2H₂O', 'د) H₄+O₂→2H₂O'], correct: 2, explanation: '2H₂ + O₂ → 2H₂O متوازنة.' },
      { question: 'Electrolysis of water produces?', options: ['A) H₂ only', 'B) O₂ only', 'C) H₂ at cathode, O₂ at anode', 'D) H₂ at anode, O₂ at cathode'], correct: 2, explanation: 'Cathode (−): H₂, Anode (+): O₂.' },
      { question: 'وصف الرابطة الأيونية؟', options: ['أ) مشاركة إلكترونات', 'ب) انتقال إلكترونات من فلز لأمفلز', 'ج) تجاذب بين جزيئات', 'د) تشارك أزواج إلكترونية'], correct: 1, explanation: 'انتقال إلكترون من الفلز للأمفلز.' },
      { question: 'تفاعل CaCO₃ → CaO + CO₂ نوعه؟', options: ['أ) تركيب', 'ب) تحليل حراري', 'ج) إحلال', 'د) إحلال مزدوج'], correct: 1, explanation: 'مركب واحد ينتج مادتين → تحليل.' },
    ],
    hard: [
      { question: 'ترتيب الإلكترونات في ذرة الحديد (Z=26)؟', options: ['أ) [Ar] 3d⁶ 4s²', 'ب) [Ar] 3d⁸', 'ج) [Ar] 4s² 3d⁴', 'د) [Ne] 3d⁶ 4s²'], correct: 0, explanation: 'Fe: [Ar] 3d⁶ 4s².' },
      { question: 'في التفاعل A→products، تضاعف تركيز A وتضاعف المعدل 4 مرات — رتبة التفاعل؟', options: ['أ) صفر', 'ب) 1', 'ج) 2', 'د) 3'], correct: 2, explanation: '4=2ⁿ → n=2.' },
      { question: 'معادلة فانت هوف لضغط التناضح؟', options: ['أ) π=nRT', 'ب) π=MRT', 'ج) π=cRT', 'د) π=PV/n'], correct: 1, explanation: 'π = MRT حيث M = المولارية.' },
    ],
  },
  biology: {
    easy: [
      { question: 'عضية الخلية المسؤولة عن إنتاج الطاقة؟', options: ['أ) النواة', 'ب) الريبوسوم', 'ج) الميتوكوندريا', 'د) الفجوة العصارية'], correct: 2, explanation: 'الميتوكوندريا تنتج ATP.' },
      { question: 'التمثيل الضوئي يحدث في؟', options: ['أ) الميتوكوندريا', 'ب) البلاستيدة الخضراء', 'ج) النواة', 'د) الجدار الخلوي'], correct: 1, explanation: 'البلاستيدة الخضراء تحتوي الكلوروفيل.' },
      { question: 'ما وظيفة الكريات الحمراء؟', options: ['أ) مقاومة الأمراض', 'ب) التخثر', 'ج) نقل الأكسجين', 'د) إنتاج الهرمونات'], correct: 2, explanation: 'الهيموجلوبين ينقل O₂.' },
      { question: 'What carries genetic information from DNA to ribosomes?', options: ['A) tRNA', 'B) rRNA', 'C) mRNA', 'D) DNA polymerase'], correct: 2, explanation: 'mRNA carries the genetic code to ribosomes.' },
      { question: 'كم عدد كروموسومات الإنسان الطبيعية؟', options: ['أ) 23', 'ب) 46', 'ج) 48', 'د) 92'], correct: 1, explanation: '46 كروموسوماً (23 زوجاً).' },
      { question: 'The process of meiosis produces?', options: ['A) 2 diploid cells', 'B) 4 haploid cells', 'C) 2 haploid cells', 'D) 4 diploid cells'], correct: 1, explanation: 'Meiosis produces 4 genetically unique haploid cells.' },
      { question: 'أي الآتي لا يحتوي نواة خلوية؟', options: ['أ) خلية نباتية', 'ب) بكتيريا', 'ج) خلية حيوانية', 'د) فطريات'], correct: 1, explanation: 'البكتيريا بدائية النواة.' },
      { question: 'أطول مرحلة في الانقسام المتساوي؟', options: ['أ) الطور التمهيدي', 'ب) الطور الاستوائي', 'ج) الطور الانفصالي', 'د) الطور النهائي'], correct: 0, explanation: 'Prophase هو الأطول.' },
    ],
    medium: [
      { question: 'ما الفرق بين الطفرة الجينية وطفرة الكروموسوم؟', options: ['أ) لا فرق', 'ب) الجينية تغيير في قاعدة، الكروموسومية تغيير في عدد/بنية', 'ج) الجينية أخطر دائماً', 'د) الكروموسومية أندر دائماً'], correct: 1, explanation: 'الجينية: تغيير في DNA. الكروموسومية: هيكلي أو عددي.' },
      { question: 'What is the role of tRNA in translation?', options: ['A) Carries DNA', 'B) Reads mRNA codons', 'C) Brings amino acids to the ribosome', 'D) Unwinds the double helix'], correct: 2, explanation: 'tRNA carries amino acids to the ribosome.' },
      { question: 'متلازمة داون سببها؟', options: ['أ) فقدان كروموسوم 21', 'ب) زيادة كروموسوم 21', 'ج) طفرة جينية', 'د) تغيير بنية الكروموسوم'], correct: 1, explanation: 'Trisomy 21 — ثلاث نسخ من الكروموسوم 21.' },
      { question: 'إنزيمات الهضم تُفرَز أساساً من؟', options: ['أ) الكبد والكلى', 'ب) البنكرياس والأمعاء الدقيقة', 'ج) المعدة والقولون', 'د) الغدة الدرقية'], correct: 1, explanation: 'البنكرياس والأمعاء الدقيقة المصدر الرئيسي.' },
      { question: 'الصمامات في القلب وظيفتها؟', options: ['أ) ضخ الدم', 'ب) تبادل الغازات', 'ج) منع ارتداد الدم', 'د) تصفية الدم'], correct: 2, explanation: 'صمامات القلب تمنع الدم من التدفق للخلف.' },
    ],
    hard: [
      { question: 'مرحلة G1 في دورة الخلية تتميز بـ؟', options: ['أ) تضاعف DNA', 'ب) النمو وتخليق البروتينات', 'ج) انقسام النواة', 'د) انفصال الكروماتيدات'], correct: 1, explanation: 'G1: نمو الخلية وتحضيرها.' },
      { question: 'The allosteric inhibition of enzymes means?', options: ['A) Substrate binds active site', 'B) Inhibitor binds non-active site', 'C) Temperature denatures enzyme', 'D) pH destroys enzyme'], correct: 1, explanation: 'Allosteric inhibitors bind non-active sites changing enzyme shape.' },
      { question: 'ما المقصود بالطيف الانبعاثي للذرة؟', options: ['أ) الضوء الممتص', 'ب) الضوء المنبعث عند انتقال إلكترونات لمستويات أعلى', 'ج) الضوء المنبعث عند انتقال إلكترونات لمستويات أدنى', 'د) الضوء الكلي الصادر'], correct: 2, explanation: 'انتقال الإلكترون لمستوى أقل → انبعاث فوتون.' },
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
    if (/متتالية|sequence|series|حسابية|هندسية/.test(m)) return 'sequences';
    if (/لوغاريتم|logarithm|\blog\b/.test(m)) return 'logarithms';
    if (/مصفوفة|matrix|matrices/.test(m)) return 'matrices';
    if (/متجه|vector/.test(m)) return 'vectors';
    if (/نهاية|limit|lim\b/.test(m)) return 'limits';
    if (/عدد مركب|complex number/.test(m)) return 'complex';
    if (/ثنائي|binomial|باسكال|pascal/.test(m)) return 'binomial';
  }
  if (subject === 'physics') {
    if (/نيوتن|newton|قانون الحركة/.test(m)) return 'newton';
    if (/ضوء|انعكاس|انكسار|optics|reflection|refraction/.test(m)) return 'optics';
    if (/كهرباء|electric|تيار|voltage|مقاومة|ohm|volt/.test(m)) return 'electricity';
    if (/مغناطيس|magnetic|electro/.test(m)) return 'magnetism';
    if (/زخم|momentum|كمية تحرك/.test(m)) return 'momentum';
    if (/ضغط|pressure|باسكال/.test(m)) return 'pressure';
    if (/موجة|wave|frequency|sound|light/.test(m)) return 'waves';
    if (/حرارة|thermodynamics|temperature/.test(m)) return 'thermodynamics';
  }
  if (subject === 'chemistry') {
    if (/جدول دوري|periodic|عنصر|element/.test(m)) return 'periodic';
    if (/حمض|acid|قاعدة|base|pH/.test(m)) return 'acids';
    if (/عضوي|organic|ألكان|alkane|ألكين|alkene/.test(m)) return 'organic';
    if (/رابطة|bond|ionic|covalent|تساهمي|أيوني/.test(m)) return 'bonding';
    if (/تفاعل|reaction|معادلة كيميائية/.test(m)) return 'reactions';
    if (/تأكسد|oxidation|اختزال|reduction|redox/.test(m)) return 'redox';
  }
  if (subject === 'biology') {
    if (/خلية|cell|غشاء|membrane/.test(m)) return 'cells';
    if (/وراثة|genetics|DNA|جين|gene|كروموسوم/.test(m)) return 'genetics';
    if (/هضم|digest|إنزيم|enzyme/.test(m)) return 'digestion';
    if (/دورة دموية|blood|قلب|heart|circulation/.test(m)) return 'circulation';
    if (/تنفس|respiration|رئة|lung/.test(m)) return 'respiration';
    if (/عصبي|nervous|مخ|brain|neuron/.test(m)) return 'nervous';
    if (/تكاثر|reproduction|جنسي|بذرة/.test(m)) return 'reproduction';
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
    if (/ضمير|pronoun/.test(m)) return 'pronouns';
    if (/أدوات|particle|حرف جر|حروف/.test(m)) return 'particles';
    if (/مفعول|object|تمييز|حال/.test(m)) return 'objects';
  }
  if (subject === 'english') {
    if (/tense|past|present|future/.test(m)) return 'tenses';
    if (/passive|مبني.*مجهول/.test(m)) return 'passive_voice';
    if (/conditional|if.clause/.test(m)) return 'conditionals';
    if (/noun|verb|adjective|adverb|part of speech/.test(m)) return 'parts_of_speech';
    if (/reported|indirect.*speech/.test(m)) return 'reported_speech';
    if (/article|\ba\b|\ban\b|\bthe\b/.test(m)) return 'articles';
    if (/preposition|\bin\b|\bon\b|\bat\b|\bfor\b/.test(m)) return 'prepositions';
  }
  return null;
}

// ── Complex Question Handler ─────────────────────────────
function handleComplexQuestion(message, language) {
  const isAr = language === 'ar';
  const m = message.toLowerCase();

  // "الفرق بين X وY" / "compare X and Y"
  const cmpAr = m.match(/(?:ما\s+)?(?:هو\s+)?الفرق\s+بين\s+(.+?)\s+و(?:ال)?(.+)/);
  const cmpEn = m.match(/(?:compare|difference\s+between)\s+(.+?)\s+(?:and|vs\.?)\s+(.+)/i);
  if (cmpAr || cmpEn) {
    const [, a, b] = cmpAr || cmpEn;
    const sA = detectSubject(a), tA = detectTopic(a, sA);
    const sB = detectSubject(b), tB = detectTopic(b, sB);
    const infoA = getCurriculumInfo(sA, tA, language);
    const infoB = getCurriculumInfo(sB, tB, language);
    if (infoA || infoB) {
      return isAr
        ? `📊 **مقارنة: ${a.trim()} مقابل ${b.trim()}**\n\n**${a.trim()}:**\n${infoA || 'لا توجد معلومات كافية'}\n\n---\n\n**${b.trim()}:**\n${infoB || 'لا توجد معلومات كافية'}\n\n🧠 **تحدي:** ما أهم فرق لاحظته بين المفهومين؟`
        : `📊 **Comparison: ${a.trim()} vs ${b.trim()}**\n\n**${a.trim()}:**\n${infoA || 'Insufficient info'}\n\n---\n\n**${b.trim()}:**\n${infoB || 'Insufficient info'}\n\n🧠 **Challenge:** What is the most important difference you noticed?`;
    }
  }

  // "احسب / solve / calculate"
  if (/احسب|حوّل|أوجد|solve|calculate|find the|evaluate/i.test(m)) {
    return isAr
      ? `🔢 **أسلوب حل المسائل — خطوة بخطوة:**\n\n**1️⃣ المعطيات:** ما الأرقام والبيانات المذكورة؟\n**2️⃣ المطلوب:** ماذا يُطلب إيجاده بالضبط؟\n**3️⃣ القانون:** ما القانون أو القاعدة المناسبة؟\n**4️⃣ التعويض:** عوّض القيم في القانون\n**5️⃣ التحقق:** هل الإجابة منطقية؟\n\n✏️ **الآن:** اكتب لي المسألة كاملة وسأرشدك خطوة بخطوة.`
      : `🔢 **Problem-Solving Method — Step by Step:**\n\n**1️⃣ Given:** What numbers/data are provided?\n**2️⃣ Required:** What exactly needs to be found?\n**3️⃣ Formula:** Which law or formula applies?\n**4️⃣ Substitute:** Plug the values in\n**5️⃣ Verify:** Does the answer make sense?\n\n✏️ **Now:** Write the full problem and I'll guide you step by step.`;
  }

  // "اشرح ... واعطني مثال"
  if (/اشرح\s+(.+)|explain\s+(.+)/i.test(m) && /مثال|example/i.test(m)) {
    const match = m.match(/اشرح\s+(.+)|explain\s+(.+)/i);
    const term = match ? (match[1] || match[2]).split(/و|and|with/)[0].trim() : '';
    const subj = detectSubject(term);
    const top  = detectTopic(term, subj);
    const info = getCurriculumInfo(subj, top, language);
    if (info) {
      return info + (isAr
        ? '\n\n📝 **مثال تطبيقي:** حاول الآن صياغة مثال من عندك على هذا المفهوم وأرسله لي لأراجعه معك.'
        : '\n\n📝 **Your Turn:** Try creating your own example of this concept and send it — I\'ll review it with you.');
    }
  }

  // "ما هو / what is"
  if (/ما\s+(?:هو|هي|معنى|تعريف)\s+(.+)|what\s+is\s+(.+)|define\s+(.+)/i.test(m)) {
    const match = m.match(/ما\s+(?:هو|هي|معنى|تعريف)\s+(.+)|what\s+is\s+(.+)|define\s+(.+)/i);
    const term  = (match[1] || match[2] || match[3] || '').trim();
    if (term.length > 2) {
      const subj = detectSubject(term);
      const top  = detectTopic(term, subj);
      const info = getCurriculumInfo(subj, top, language);
      if (info) return info;
    }
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

  // Complex question handler — runs before simple topic detection
  const complexResponse = handleComplexQuestion(message, language);
  if (complexResponse) return complexResponse;

  const subject = detectSubject(m);
  const topic = detectTopic(m, subject);

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

  // Shuffle once — no repetition
  const shuffled = [...bank].sort(() => Math.random() - 0.5);
  const finalCount = Math.min(count, shuffled.length);
  const questions  = shuffled.slice(0, finalCount);

  return {
    subject: subj, difficulty, language,
    count: questions.length,
    questions,
    warning: count > shuffled.length
      ? (language === 'ar'
        ? `عرض ${questions.length} سؤال فقط — البنك لا يحتوي على ${count} أسئلة مختلفة في هذه المادة.`
        : `Showing ${questions.length} questions — bank has fewer than ${count} unique questions for this subject.`)
      : null,
  };
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
