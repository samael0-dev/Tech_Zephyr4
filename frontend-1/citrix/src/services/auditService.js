// src/services/auditService.js
import { apiClient } from './apiClient';

export const auditService = {
  getLogs: async (params = {}) => {
    try {
      const data = await apiClient.get('/audit/logs', {
        action: params.action,
        actor_id: params.actor_id || params.actorId,
        entity_type: params.entity_type || params.entityType,
        limit: params.limit || 50,
        offset: params.offset || 0,
      });

      const list = Array.isArray(data) ? data : data?.logs || [];
      const normalized = list.map((l) => ({
        id: l.id,
        timestamp: l.created_at || new Date().toISOString(),
        actor: l.actor_name || l.actor_id || 'System',
        role: l.actor_role || 'admin',
        action: l.action || 'system:event',
        entity: l.entity_type ? `${l.entity_type} ${l.entity_id ? `#${l.entity_id}` : ''}` : (l.entity || 'System'),
        details: typeof l.details === 'object' ? JSON.stringify(l.details) : String(l.details || ''),
        status: l.status || 'SUCCESS',
        ip: l.ip_address || '127.0.0.1',
      }));

      return { data: normalized, demo: false };
    } catch (err) {
      console.warn('Real /audit/logs API unavailable:', err.message);
      return { data: [], demo: true };
    }
  },
};

export default auditService;
