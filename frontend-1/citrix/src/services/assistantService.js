// src/services/assistantService.js
import { apiClient } from './apiClient';
import { mockAIQuery } from './mockAdapter';

export const assistantService = {
  chat: async (message, sessionId = null) => {
    try {
      const data = await apiClient.post('/assistant/chat', {
        message,
        session_id: sessionId,
      });

      return {
        reply: data.reply,
        intent: data.intent,
        entities: data.entities || {},
        citations: data.citations || [],
        toolResult: data.tool_result,
        requiresConfirmation: Boolean(data.requires_confirmation),
        actionProposal: data.action_proposal,
        latencyMs: data.latency_ms || 0,
        demo: false,
      };
    } catch (err) {
      console.warn('Real /assistant/chat API unavailable, using fallback:', err.message);
      const fallback = await mockAIQuery(message);
      return {
        reply: fallback.data?.reply || 'Assistant currently operating in local mode.',
        intent: fallback.data?.intent || 'general_query',
        citations: fallback.data?.citations || [],
        requiresConfirmation: false,
        actionProposal: null,
        demo: true,
      };
    }
  },

  confirmAction: async (actionType, proposal, confirmed = true) => {
    return apiClient.post('/assistant/confirm-action', {
      action_type: actionType,
      proposal,
      confirmed,
    });
  },

  getDeanInsights: async () => {
    try {
      const data = await apiClient.get('/assistant/dean-insights');
      return { data, demo: false };
    } catch (err) {
      console.warn('Real /assistant/dean-insights API unavailable:', err.message);
      return { data: null, demo: true };
    }
  },

  // Backward compatibility alias for query
  query: async (text, context = {}) => {
    return assistantService.chat(text, context.sessionId);
  },
};

export default assistantService;
