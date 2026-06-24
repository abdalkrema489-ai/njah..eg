'use strict';
// ══════════════════════════════════════════════════════════════
// NAJAH GEMINI AI SERVICE  — Google Gemini 2.0 Flash Engine
// ══════════════════════════════════════════════════════════════
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const logger = require('../utils/logger');
const mem0   = require('./mem0Service');

// ── Init ─────────────────────────────────────────────────────
let genAI = null;
let model  = null;
let modelStream = null;

// ── System Prompt (v7 — Full Professional Educator Persona) ──
const SYSTEM_PROMPT = `
أنت **نجاح AI** (Najah AI) — مساعد تعليمي ذكي ومتخصص تم بناؤه خصيصاً للطلاب والمعلمين في مصر والوطن العربي.

═══════════════════════════════════════
الهوية والشخصية
═══════════════════════════════════════
اسمك: نجاح AI
طبيعتك: أستاذ مصري ذكي، دافئ، صبور، ومتحمس للتعليم
لغتك الأساسية: العربية الفصحى المبسطة مع لمسات من العامية المصرية اللطيفة
أسلوبك: مثل أفضل أستاذ مصري — يشرح ببساطة، يضرب أمثلة من الواقع، ويحتفل بكل إنجاز صغير

ردودك العاطفية:
- عند الصواب: "ممتاز! ده كلام! 🎉" أو "Excellent! You got it perfectly!"
- عند الخطأ: "قريب جداً! بس في نقطة صغيرة..." (أبداً ما تقول "غلط")
- عند الارتباك: "لا تقلق خالص، خليني أشرح بطريقة مختلفة خالص"
- عند الإحباط: "أنا أفهم إن الموضوع ده صعب، بس أنت قادر عليه وأنا هنا معاك"

═══════════════════════════════════════
قواعد اللغة المطلقة
═══════════════════════════════════════
1. إذا كتب الطالب بالعربية (أي شكل) → أجب بالعربية الكاملة
2. إذا كتب بالإنجليزية → أجب بالإنجليزية الكاملة
3. إذا خلط اللغتين → اتبع اللغة السائدة في سؤاله
4. الوحدات العلمية تبقى بالإنجليزي دائماً (kg, m, s, Hz, mol)

═══════════════════════════════════════
أسلوب التدريس الاحترافي
═══════════════════════════════════════
القاعدة الذهبية: لا تعطِ الإجابة مباشرة — علّم الطالب كيف يصل إليها.

1. للأسئلة المفاهيمية:
   أ. ابدأ بـ"الصورة الكبيرة" في جملة واحدة
   ب. اشرح بمثال من الحياة اليومية المصرية
   ج. اعطِ الشرح التقني بعد الفهم العام
   د. اختم بسؤال تحقق

2. للمسائل الرياضية والعلمية:
   أ. اقرأ المسألة وحدد المعطيات والمطلوب
   ب. اختر القانون المناسب واشرح لماذا
   ج. حل خطوة بخطوة مع شرح كل خطوة
   د. تحقق من الإجابة
   هـ. قدم مسألة مشابهة للتدريب

3. للواجبات المنزلية:
   - لا تعطِ الإجابة الكاملة أبداً
   - بدلاً: "الخطوة الأولى تبدأ بـ... جرب تكمل من هنا"

4. للمدرسين:
   - كن أكثر رسمية وتقنية
   - استخدم مصطلحات تربوية (Bloom's Taxonomy, Differentiated Instruction)
   - قدم خيارات متعددة لا حلاً واحداً

═══════════════════════════════════════
المناهج المغطاة
═══════════════════════════════════════
[المدرسة]: رياضيات، فيزياء، كيمياء، أحياء، جيولوجيا، عربي، إنجليزي، دراسات اجتماعية، دين
[الجامعة]: هندسة، طب، علوم حاسب، اقتصاد، آداب، قانون، صيدلة

═══════════════════════════════════════
التنسيق
═══════════════════════════════════════
استخدم دائماً: **Bold** للمصطلحات، ## للعناوين، قوائم مرقمة للخطوات،
\`code\` للمعادلات القصيرة، جداول markdown للمقارنات.
للمعادلات الرياضية: استخدم LaTeX: $..$ للـ inline و $$...$$ للمستقلة.

ما يجب تجنبه دائماً:
- لا تقل "لا أعرف" — قل "دعني أساعدك بأفضل ما أعرف..."
- لا تعطِ إجابات الامتحانات مباشرة
- لا تكتب محتوى مسيء أو خارج إطار التعليم
`;

function wrapModel(originalModel, options) {
  return new Proxy(originalModel, {
    get(target, prop, receiver) {
      if (prop === 'generateContent') {
        return async function(...args) {
          try {
            return await target.generateContent(...args);
          } catch (err) {
            const isRetryable = err.status === 429 || err.status === 503 ||
              err.message?.includes('quota') || err.message?.includes('QUOTA') ||
              err.message?.includes('overloaded') || err.message?.includes('RESOURCE_EXHAUSTED');
            if (isRetryable) {
              logger.warn('Retryable error on gemini-2.0-flash, falling back to gemini-1.5-flash for generateContent:', err.message);
              const fallback = genAI.getGenerativeModel({
                ...options,
                model: 'gemini-1.5-flash'
              });
              return await fallback.generateContent(...args);
            }
            logger.error('Non-retryable Gemini error in generateContent. Reason:', err.message, 'Status:', err.status);
            throw err;
          }
        };
      }
      if (prop === 'startChat') {
        return function(chatOptions) {
          const chatSession = target.startChat(chatOptions);
          return new Proxy(chatSession, {
            get(chatTarget, chatProp, chatReceiver) {
              if (chatProp === 'sendMessage') {
                return async function(...args) {
                  try {
                    return await chatTarget.sendMessage(...args);
                  } catch (err) {
                    const isRetryable = err.status === 429 || err.status === 503 ||
                      err.message?.includes('quota') || err.message?.includes('QUOTA') ||
                      err.message?.includes('overloaded') || err.message?.includes('RESOURCE_EXHAUSTED');
                    if (isRetryable) {
                      logger.warn('Retryable error on gemini-2.0-flash, falling back to gemini-1.5-flash for sendMessage:', err.message);
                      const fallbackModel = genAI.getGenerativeModel({
                        ...options,
                        model: 'gemini-1.5-flash'
                      });
                      const fallbackChat = fallbackModel.startChat(chatOptions);
                      return await fallbackChat.sendMessage(...args);
                    }
                    logger.error('Non-retryable Gemini error in sendMessage. Reason:', err.message, 'Status:', err.status);
                    throw err;
                  }
                };
              }
              if (chatProp === 'sendMessageStream') {
                return async function(...args) {
                  try {
                    return await chatTarget.sendMessageStream(...args);
                  } catch (err) {
                    const isRetryable = err.status === 429 || err.status === 503 ||
                      err.message?.includes('quota') || err.message?.includes('QUOTA') ||
                      err.message?.includes('overloaded') || err.message?.includes('RESOURCE_EXHAUSTED');
                    if (isRetryable) {
                      logger.warn('Retryable error on gemini-2.0-flash, falling back to gemini-1.5-flash for sendMessageStream:', err.message);
                      const fallbackModel = genAI.getGenerativeModel({
                        ...options,
                        model: 'gemini-1.5-flash'
                      });
                      const fallbackChat = fallbackModel.startChat(chatOptions);
                      return await fallbackChat.sendMessageStream(...args);
                    }
                    logger.error('Non-retryable Gemini error in sendMessageStream. Reason:', err.message, 'Status:', err.status);
                    throw err;
                  }
                };
              }
              const value = Reflect.get(chatTarget, chatProp, chatReceiver);
              return typeof value === 'function' ? value.bind(chatTarget) : value;
            }
          });
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    }
  });
}

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const originalGetGenerativeModel = genAI.getGenerativeModel.bind(genAI);
    genAI.getGenerativeModel = function(options) {
      const originalModel = originalGetGenerativeModel(options);
      if (options.model === 'gemini-2.0-flash') {
        return wrapModel(originalModel, options);
      }
      return originalModel;
    };

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];

    model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings,
      generationConfig: {
        temperature:     0.72,
        topK:            50,
        topP:            0.93,
        maxOutputTokens: 4096,
        candidateCount:  1,
      },
    });

    modelStream = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      safetySettings,
      generationConfig: {
        temperature:     0.72,
        topK:            50,
        topP:            0.93,
        maxOutputTokens: 4096,
        candidateCount:  1,
      },
    });

    logger.info('✅ Gemini 2.0 Flash initialized');
  } catch (err) {
    logger.error('❌ Gemini init error:', err.message);
  }
} else {
  logger.warn('⚠️  GEMINI_API_KEY not set — Gemini AI unavailable');
}



// ── Build contextual user prefix ─────────────────────────────
function buildContextualPrompt(user, extras = {}) {
  if (!user) return '';
  const uniGrades = ['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Postgrad'];
  const level  = uniGrades.includes(user.grade) || user.institution_type === 'university' ? 'جامعي' : 'مدرسي';
  const roleAr = user.role === 'teacher' ? 'مدرس/أستاذ' : `طالب ${level}`;
  return [
    `[CONTEXT — لا تذكر هذا للمستخدم]`,
    `المستخدم: ${user.name || 'مجهول'}`,
    `الدور: ${roleAr}`,
    `الصف/الفرقة: ${user.grade || 'غير محدد'}`,
    `المؤسسة: ${user.school || user.institution || 'غير محددة'}`,
    `نقاط XP: ${user.xp_points || 0}`,
    `المستوى: ${user.level || 1}`,
    extras.subject ? `المادة الحالية: ${extras.subject}` : '',
    extras.topic   ? `الموضوع: ${extras.topic}`           : '',
    extras.mode    ? `وضع AI: ${extras.mode}`             : '',
    `التاريخ والوقت: ${new Date().toLocaleString('ar-EG', { timeZone: 'Africa/Cairo' })}`,
    '[END CONTEXT]',
    '',
  ].filter(Boolean).join('\n');
}


// ── Build history for Gemini ───────────────────────────────────
function buildHistory(messages = []) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'model')
    .map(m => ({
      role:  (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }))
    .filter(m => m.parts[0].text.trim().length > 0);
}

// ── Chat (non-streaming) ──────────────────────────────────────
async function chat(message, history = [], language = 'en', userId = null) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  // 1. Retrieve student memories relevant to this message
  const memoryContext = await mem0.getRelevantMemories(userId, message);

  // 2. Build a dynamic model with memory injected into system instruction
  const dynamicModel = memoryContext
    ? genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_PROMPT + memoryContext,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
        generationConfig: { temperature: 0.72, topK: 50, topP: 0.93, maxOutputTokens: 4096, candidateCount: 1 },
      })
    : model;

  const hist = buildHistory(history);
  try {
    const chatSession = dynamicModel.startChat({ history: hist });
    const result = await chatSession.sendMessage(message);
    const text   = result.response.text();

    // 3. Save to memory in background (non-blocking)
    mem0.saveMemory(userId, message, text).catch(() => {});

    return text;
  } catch (err) {
    if (err.message?.includes('quota') || err.message?.includes('QUOTA') || err.message?.includes('429')) {
      logger.warn('Gemini 2.0 quota error, falling back to gemini-1.5-flash');
      const safetySettings = [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ];
      const generationConfig = { temperature: 0.72, topK: 50, topP: 0.93, maxOutputTokens: 4096, candidateCount: 1 };
      // Try gemini-1.5-flash first, then gemini-1.5-flash-8b as last resort
      const fallbackModels = ['gemini-1.5-flash', 'gemini-1.5-flash-8b'];
      for (const fallbackName of fallbackModels) {
        try {
          const fallbackModel = genAI.getGenerativeModel({
            model: fallbackName,
            systemInstruction: SYSTEM_PROMPT + (memoryContext || ''),
            safetySettings,
            generationConfig,
          });
          const fallbackChat = fallbackModel.startChat({ history: hist });
          const result = await fallbackChat.sendMessage(message);
          const text = result.response.text();
          mem0.saveMemory(userId, message, text).catch(() => {});
          return { text, model: `${fallbackName}-fallback` };
        } catch (fallbackErr) {
          logger.warn(`Fallback ${fallbackName} also failed:`, fallbackErr.message);
        }
      }
    }
    throw err;
  }
}

// ── Chat (streaming) ──────────────────────────────────────────
async function chatStream(message, history = [], res, userId = null) {
  if (!modelStream) {
    res.write(`data: ${JSON.stringify({ error: 'GEMINI_NOT_AVAILABLE' })}\n\n`);
    res.end();
    return;
  }

  // 1. Retrieve student memories
  const memoryContext = await mem0.getRelevantMemories(userId, message);

  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  ];
  const generationConfig = { temperature: 0.72, topK: 50, topP: 0.93, maxOutputTokens: 4096, candidateCount: 1 };
  const systemInstruction = SYSTEM_PROMPT + (memoryContext || '');
  const hist = buildHistory(history);

  // Waterfall: try each model in order until one streams successfully
  const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'];

  for (const modelName of modelsToTry) {
    try {
      // Use genAI directly to avoid proxy recursion
      const GoogleGenerativeAI = genAI.constructor;
      const rawGenAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const tryModel = rawGenAI.getGenerativeModel({ model: modelName, systemInstruction, safetySettings, generationConfig });

      // Pre-flight call — if quota error occurs, it will throw BEFORE we start iterating chunks
      const result = await tryModel.startChat({ history: hist }).sendMessageStream(message);

      let fullText = '';
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true, fullText, provider: modelName })}\n\n`);
      res.end();
      mem0.saveMemory(userId, message, fullText).catch(() => {});
      return fullText;

    } catch (err) {
      const errMsg = err.message || '';
      const isRetryable =
        !errMsg ||                                       // empty message = transient network hiccup
        err.status === 429 || err.status === 503 ||
        errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('QUOTA') ||
        errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('overloaded');
      if (isRetryable) {
        logger.warn(`Retryable error on ${modelName} stream (status=${err.status ?? 'n/a'} msg='${errMsg || 'empty'}'), trying next fallback...`);
        if (res.writableEnded) return; // already finished — bail
        continue;
      }
      // Non-retryable error — log full details then rethrow
      logger.error(`Gemini stream non-retryable error on ${modelName}: status=${err.status ?? 'n/a'} msg=${errMsg}`);
      throw err;
    }
  }

  // All Gemini models exhausted — throw so controller falls back to internalAI
  throw new Error('GEMINI_ALL_QUOTA_EXCEEDED');
}

// ── Summarize text ────────────────────────────────────────────
async function summarize(text, language = 'en', pages = 1) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const lang = language === 'ar' ? 'Arabic' : 'English';
  const prompt = language === 'ar'
    ? `أنت مساعد تعليمي متمكن. يرجى تلخيص هذا المحتوى التعليمي (${pages} صفحة) بشكل منظم باللغة العربية:

**يجب أن يتضمن الملخص:**
1. **الفكرة الرئيسية** في جملة واحدة
2. **النقاط الأساسية** (5-8 نقاط)  
3. **المصطلحات المهمة** وتعريفاتها
4. **ما يجب حفظه** للامتحان

المحتوى:
${text.slice(0, 12000)}`
    : `You are an expert educational assistant. Summarize this educational content (${pages} pages) in a well-structured way in English:

**The summary must include:**
1. **Main Idea** in one sentence
2. **Key Points** (5-8 bullet points)
3. **Important Terms** with definitions
4. **What to memorize** for the exam

Content:
${text.slice(0, 12000)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Generate Quiz ─────────────────────────────────────────────
async function generateQuiz({ subject, topic, difficulty = 'medium', count = 10, language = 'en', context = '' }) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const prompt = language === 'ar'
    ? `أنشئ بالضبط ${count} سؤال اختيار متعدد باللغة العربية عن مادة ${subject}${topic ? ` - موضوع: ${topic}` : ''} بمستوى صعوبة: ${difficulty}.
أرجع JSON فقط بهذا التنسيق:
{"questions":[{"question":"...","options":["أ) ...","ب) ...","ج) ...","د) ..."],"correct":0,"explanation":"اشرح هنا لماذا هذه الإجابة صحيحة بالتفصيل"}]}
لا تضف أي نص قبل أو بعد JSON.${context ? '\n\nالمحتوى المرجعي:\n' + context : ''}`
    : `Create exactly ${count} multiple-choice questions in English about ${subject}${topic ? ` - topic: ${topic}` : ''} at ${difficulty} difficulty for Egyptian school students.
Return ONLY valid JSON in this exact format:
{"questions":[{"question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"Explain clearly why this answer is correct"}]}
No text before or after the JSON.${context ? '\n\nReference content:\n' + context : ''}`;

  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();
  // Strip markdown code fences if present
  const clean  = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Study Plan ────────────────────────────────────────────────
async function generateStudyPlan({ subject, daysUntil, dailyHours = 2, currentLevel = 'beginner', language = 'en', history = '' }) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const prompt = language === 'ar'
    ? `أنشئ خطة دراسية مخصصة لطالب مصري يدرس "${subject}":
- عدد الأيام المتاحة: ${daysUntil} يوم
- ساعات الدراسة يومياً: ${dailyHours} ساعة
- المستوى الحالي: ${currentLevel}
${history ? '- سجل الدراسة السابق: ' + history : ''}

أرجع JSON فقط:
{"plan":[{"day":1,"date":"YYYY-MM-DD","sessions":[{"time":"HH:MM","duration":60,"topic":"...","goal":"...","type":"study|review|practice|rest"}]}],"tips":["..."],"totalHours":N,"weakAreas":["..."]}`
    : `Create a personalized study plan for an Egyptian student studying "${subject}":
- Days available: ${daysUntil}
- Daily hours: ${dailyHours}
- Current level: ${currentLevel}
${history ? '- Study history: ' + history : ''}

Return ONLY valid JSON:
{"plan":[{"day":1,"date":"YYYY-MM-DD","sessions":[{"time":"HH:MM","duration":60,"topic":"...","goal":"...","type":"study|review|practice|rest"}]}],"tips":["..."],"totalHours":N,"weakAreas":["..."]}`;

  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();
  const clean  = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Web Search (grounded) ────────────────────────────────────
async function searchAndAnswer(query, language = 'en') {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const lang = language === 'ar' ? 'Arabic' : 'English';
  const prompt = language === 'ar'
    ? `أجب على هذا السؤال بمعلومات دقيقة وحديثة، مع ذكر المصادر إن أمكن:

"${query}"

اشرح بشكل واضح ومنظم باللغة العربية، مع أمثلة عملية.`
    : `Answer this question with accurate, up-to-date information, citing sources where possible:

"${query}"

Explain clearly and in an organized way in English, with practical examples.`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ googleSearch: {} }]
    });
    return result.response.text();
  } catch (err) {
    logger.warn('Gemini Google Search tool failed, falling back to basic prompt:', err.message);
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}

// ── Answer from file context ──────────────────────────────────
async function answerFromContext(question, context, language = 'en') {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const prompt = language === 'ar'
    ? `بناءً على محتوى الملف التالي، أجب على السؤال بشكل مفصل ومنظم باللغة العربية:

**السؤال:** ${question}

**محتوى الملف:**
${context.slice(0, 10000)}`
    : `Based on the following file content, answer the question in detail and in an organized way in English:

**Question:** ${question}

**File content:**
${context.slice(0, 10000)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── YouTube summarize ─────────────────────────────────────────
async function summarizeYoutube(transcript, language = 'en') {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');

  const prompt = language === 'ar'
    ? `لخص هذا الفيديو التعليمي بشكل منظم باللغة العربية:

**يجب أن يتضمن الملخص:**
1. 🎯 **الهدف الرئيسي** للفيديو
2. 📌 **النقاط الأساسية** (مرقمة)
3. 💡 **الأفكار المهمة** التي يجب تذكرها
4. 📝 **ملاحظات للدراسة**

النص:
${transcript.slice(0, 15000)}`
    : `Summarize this educational video in a well-structured way in English:

**The summary must include:**
1. 🎯 **Main Goal** of the video
2. 📌 **Key Points** (numbered)
3. 💡 **Important Ideas** to remember
4. 📝 **Study Notes**

Transcript:
${transcript.slice(0, 15000)}`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Generate follow-up suggestions ───────────────────────────
async function generateFollowUps(lastMessage, lastReply, language = 'en') {
  if (!model) return [];
  try {
    const prompt = language === 'ar'
      ? `بعد أن شرحت: "${lastReply.slice(0, 200)}"
اقترح 3 أسئلة متابعة قصيرة يمكن أن يسألها الطالب. أرجع JSON فقط: {"suggestions":["...","...","..."]}`
      : `After explaining: "${lastReply.slice(0, 200)}"
Suggest 3 short follow-up questions the student might ask. Return ONLY JSON: {"suggestions":["...","...","..."]}`;

    const result = await model.generateContent(prompt);
    const text   = result.response.text().trim();
    const clean  = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);
    return parsed.suggestions || [];
  } catch { return []; }
}

// ── Generate Lesson Plan (Teacher AI) ────────────────────────
async function generateLessonPlan({ subject, grade, topic, duration = 45, style = 'mixed' } = {}) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');
  const prompt = `أنت خبير تربوي متخصص. أعدّ خطة درس كاملة ومهنية بتنسيق Markdown:

المادة: ${subject}
الصف: ${grade}
الموضوع: ${topic}
المدة: ${duration} دقيقة
أسلوب التدريس: ${style}

اتبع هذا الهيكل بالضبط:
## بيانات الدرس
## الأهداف التعليمية (حسب Bloom's Taxonomy — 3-5 أهداف)
## المتطلبات القبلية
## الوسائل والأدوات
## خطوات الدرس
  ### التمهيد (5 دقائق)
  ### العرض والشرح
  ### التطبيق والنشاط
  ### التقييم والختام
## الواجب المنزلي
## ملاحظات للمعلم`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

// ── Generate Exam Questions (Teacher AI) ──────────────────────
async function generateExamQuestions({ subject, grade, topic, count = 10, levels = {} } = {}) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');
  const prompt = `ولّد ${count} سؤال امتحاني في:
المادة: ${subject} | الصف: ${grade} | الموضوع: ${topic}

التوزيع:
- ${levels.easy    || '30%'} سهلة (تذكر ومعرفة)
- ${levels.medium  || '40%'} متوسطة (فهم وتطبيق)
- ${levels.hard    || '20%'} صعبة (تحليل وتركيب)
- ${levels.critical|| '10%'} تفكير ناقد وإبداعي

أعد JSON array صالح فقط بهذا التنسيق:
[{"question":"نص السؤال","type":"MCQ|TrueFalse|Short|Essay","options":["..."],"answer":"الإجابة الصحيحة","difficulty":"easy|medium|hard|critical","score":2}]
لا تضف أي نص قبل أو بعد JSON.`;
  const result = await model.generateContent(prompt);
  const text  = result.response.text().trim();
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Grade Essay (Teacher AI) ──────────────────────────────────
async function gradeEssay({ essay, criteria, maxScore = 10, language = 'ar' } = {}) {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');
  const prompt = language === 'ar'
    ? `قيّم هذا المقال/الإجابة وأعطِ درجة من ${maxScore}:
معايير التقييم: ${criteria || 'المحتوى، الإبداع، اللغة'}
النص: ${essay}
أعد JSON: {"score": N, "feedback": "تغذية راجعة مفصلة", "strengths": ["نقطة قوة"], "improvements": ["اقتراح تحسين"]}`
    : `Grade this essay/answer, score out of ${maxScore}:
Criteria: ${criteria || 'Content, Creativity, Language'}
Text: ${essay}
Return JSON: {"score": N, "feedback": "detailed feedback", "strengths": ["strength"], "improvements": ["suggestion"]}`;
  const result = await model.generateContent(prompt);
  const text  = result.response.text().trim();
  const clean = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Analyze Image (Vision AI) ─────────────────────────────────
async function analyzeImage(base64, prompt = 'Describe this image in detail.', mimeType = 'image/jpeg') {
  if (!model) throw new Error('GEMINI_NOT_AVAILABLE');
  const result = await model.generateContent([
    prompt,
    { inlineData: { mimeType, data: base64.replace(/^data:image\/\w+;base64,/, '') } },
  ]);
  return result.response.text();
}

// ── Availability check ────────────────────────────────────────
function isAvailable() { return !!model; }
function getModelName() { return 'gemini-2.0-flash'; }

module.exports = {
  chat,
  chatStream,
  summarize,
  generateQuiz,
  generateStudyPlan,
  searchAndAnswer,
  answerFromContext,
  summarizeYoutube,
  generateFollowUps,
  generateLessonPlan,
  generateExamQuestions,
  gradeEssay,
  analyzeImage,
  buildContextualPrompt,
  isAvailable,
  getModelName,
};
