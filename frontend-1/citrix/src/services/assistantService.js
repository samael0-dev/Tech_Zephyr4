// src/services/assistantService.js
import { apiClient } from './apiClient';

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
      console.error('Real /assistant/chat API error:', err.message);
      throw err;
    }
  },

  confirmAction: async (actionType, proposal, confirmed = true) => {
    // Map any conversational/freeform action types to the two backend supported action types:
    // 'create_booking' or 'apply_disruption'
    let normalizedType = actionType;
    if (actionType && !['create_booking', 'apply_disruption'].includes(actionType)) {
      const lower = String(actionType).toLowerCase();
      if (lower.includes('disrupt') || lower.includes('resched') || lower.includes('leave') || lower.includes('unavail')) {
        normalizedType = 'apply_disruption';
      } else {
        // default to create_booking for bookings, room reservations, venue requests, etc.
        normalizedType = 'create_booking';
      }
    }

    return apiClient.post('/assistant/confirm-action', {
      action_type: normalizedType,
      proposal,
      confirmed,
    });
  },

  getDeanInsights: async () => {
    try {
      const data = await apiClient.get('/assistant/dean-insights');
      return { data, demo: false };
    } catch (err) {
      console.error('Real /assistant/dean-insights API error:', err.message);
      throw err;
    }
  },

  // Backward compatibility alias for query
  query: async (text, context = {}) => {
    return assistantService.chat(text, context.sessionId);
  },
};

export default assistantService;
