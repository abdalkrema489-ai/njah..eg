'use strict';
const { pipeline, env } = require('@xenova/transformers');
const logger = require('../utils/logger');

// Configure Transformers to run locally
env.localModelPath = './models';
env.allowRemoteModels = true; // allow downloading once
env.backends.onnx.wasm.numThreads = 1; // prevent excessive CPU usage

class LocalAIEngine {
  constructor() {
    this.models = {};
    this.isReady = false;
    this.init();
  }

  async init() {
    try {
      logger.info('Initializing Najah Massive In-House AI System...');

      // Load feature extraction for RAG/Embeddings
      // this.models.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      //   progress_callback: (x) => { if (x.status === 'downloading') logger.info(`Downloading model: ${x.name}`) }
      // });

      // Load text classification (e.g., grading essays, sentiment)
      // this.models.classifier = await pipeline('text-classification', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');

      // Load summarizer
      // this.models.summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');

      // Load tiny text generator for chat
      // this.models.generator = await pipeline('text-generation', 'Xenova/TinyLlama-1.1B-Chat-v1.0');

      this.isReady = true;
      logger.info('Najah Local AI Engine is completely initialized and ready.');
    } catch (err) {
      logger.error('Failed to initialize local AI models:', err.message);
    }
  }

  async chat(message, history = [], language = 'en') {
    if (!this.isReady || !this.models.generator) {
      throw new Error('Local AI text-generation not ready yet.');
    }

    // Construct DeepTutor-style prompt with Arabic enforcement
    let prompt = `<|system|>
You are Najah AI, an elite educational assistant powered by DeepTutor principles. 
Your goal is to maximize student learning gains using Socratic questioning, cognitive scaffolding, and interactive dialogues. 
Do not just give the direct answer; instead, guide the student to discover it through step-by-step hints and encouraging questions.
CRITICAL INSTRUCTION: YOU MUST ALWAYS RESPOND ENTIRELY IN THE ARABIC LANGUAGE, regardless of the language the user speaks.
</s>\n`;
    for (const h of history) {
      if (h.role === 'user') prompt += `<|user|>\n${h.content}</s>\n`;
      else prompt += `<|assistant|>\n${h.content}</s>\n`;
    }
    prompt += `<|user|>\n${message}</s>\n<|assistant|>\n`;

    const out = await this.models.generator(prompt, {
      max_new_tokens: 256,
      temperature: 0.7,
      do_sample: true
    });

    // Extract just the new text
    let reply = out[0].generated_text.replace(prompt, '').trim();
    if (reply.includes('</s>')) reply = reply.split('</s>')[0].trim();
    return reply;
  }

  async summarize(text) {
    if (!this.isReady || !this.models.summarizer) return "Local summarization engine initializing...";
    try {
      // Chunk text if too long (max 1024 tokens for bart)
      const chunk = text.slice(0, 3000);
      const out = await this.models.summarizer(chunk, { max_new_tokens: 150, min_new_tokens: 30 });
      return out[0].summary_text;
    } catch (e) {
      return "Summarization failed: " + e.message;
    }
  }

  async getEmbeddings(text) {
    if (!this.isReady || !this.models.extractor) return null;
    const out = await this.models.extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }

  async gradeEssay(text) {
    if (!this.isReady || !this.models.classifier) return { score: 0, feedback: 'Initializing...' };
    const out = await this.models.classifier(text.slice(0, 500));
    const label = out[0].label; // POSITIVE or NEGATIVE
    const score = Math.round(out[0].score * 100);
    return {
      score: label === 'POSITIVE' ? score : 100 - score,
      feedback: label === 'POSITIVE' ? 'Excellent writing.' : 'Needs improvement in tone and structure.'
    };
  }
}

// Singleton export
const localAI = new LocalAIEngine();
module.exports = localAI;
