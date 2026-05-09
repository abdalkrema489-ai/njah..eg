'use strict';
const logger = require('../../utils/logger');

class MindsetTracker {
  constructor() {
    this.isReady = false;
    // In-memory store of user mindsets
    this.userStates = new Map(); 
  }

  async init() {
    logger.info('Initializing Cognitive Core: Mindset Tracker...');
    this.isReady = true;
    logger.info('✅ Mindset Tracker ready (using fast heuristics).');
  }

  async evaluate(userId, message) {
    let state = this.userStates.get(userId) || {
      confusionLevel: 0.0,
      confidenceLevel: 0.5,
      fatigueLevel: 0.0,
      messageCount: 0
    };

    state.messageCount += 1;

    let sentimentLabel = 'NEUTRAL';
    let sentimentScore = 0.5;

    // Simple heuristic sentiment detection to replace heavy ML model
    const positiveWords = /good|great|awesome|excellent|happy|thanks|thank you|got it|understand|clear|easy|ممتاز|رائع|جيد|شكرا|فهمت|سهل/i;
    const negativeWords = /bad|terrible|awful|sad|hate|confused|hard|difficult|don't understand|frustrated|سيء|صعب|معقد|لا أفهم|محبط/i;

    if (negativeWords.test(message)) {
      sentimentLabel = 'NEGATIVE';
      sentimentScore = 0.8;
    } else if (positiveWords.test(message)) {
      sentimentLabel = 'POSITIVE';
      sentimentScore = 0.8;
    }

    // Heuristic adjustments based on message content & sentiment
    const lowerMsg = message.toLowerCase();
    
    // Confusion triggers
    if (lowerMsg.includes('don\'t understand') || lowerMsg.includes('confused') || lowerMsg.includes('hard') || lowerMsg.includes('not getting it')) {
      state.confusionLevel = Math.min(1.0, state.confusionLevel + 0.4);
      state.confidenceLevel = Math.max(0.0, state.confidenceLevel - 0.3);
    }

    // Fatigue triggers
    if (state.messageCount > 10) {
      state.fatigueLevel = Math.min(1.0, state.fatigueLevel + 0.1);
    }
    if (lowerMsg.includes('tired') || lowerMsg.includes('boring') || lowerMsg.includes('too long')) {
      state.fatigueLevel = Math.min(1.0, state.fatigueLevel + 0.5);
    }

    // Determine Dominant Emotion
    let dominantEmotion = 'neutral';
    if (sentimentLabel === 'NEGATIVE') {
      if (state.confusionLevel > 0.6) dominantEmotion = 'frustrated';
      else dominantEmotion = 'anxious';
    } else if (sentimentLabel === 'POSITIVE') {
      dominantEmotion = 'confident';
      state.confidenceLevel = Math.min(1.0, state.confidenceLevel + 0.2);
      state.confusionLevel = Math.max(0.0, state.confusionLevel - 0.2);
    }

    // Decay fatigue and confusion slightly on new messages
    state.fatigueLevel = Math.max(0.0, state.fatigueLevel - 0.05);
    state.confusionLevel = Math.max(0.0, state.confusionLevel - 0.05);

    this.userStates.set(userId, state);

    return {
      ...state,
      dominantEmotion
    };
  }
}

module.exports = MindsetTracker;
