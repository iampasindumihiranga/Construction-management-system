import { formatDate } from '../services/api';

/**
 * Builds the full conversation for an inquiry:
 * the opening message (from whoever started it) followed by all thread messages.
 * Legacy inquiries that only have a single `response` are shown as one manager reply.
 */
export function buildInquiryThread(inq) {
  if (!inq) return [];
  const initiatedBy = inq.initiatedBy || 'CLIENT';
  const opening = {
    key: `opening-${inq.id}`,
    senderRole: initiatedBy,
    senderName: initiatedBy === 'CLIENT_MANAGER' ? 'Client Manager' : (inq.client?.name || 'Client'),
    message: inq.message,
    createdAt: inq.createdAt,
  };
  const messages = Array.isArray(inq.messages) ? inq.messages : [];
  const rest = messages.length > 0
    ? messages.map((m) => ({ ...m, key: `msg-${m.id}` }))
    : (inq.response
      ? [{ key: `legacy-${inq.id}`, senderRole: 'CLIENT_MANAGER', senderName: inq.respondedBy || 'Client Manager', message: inq.response, createdAt: inq.respondedAt }]
      : []);
  return [opening, ...rest];
}

/**
 * Chat-style conversation view.
 * viewerRole: 'CLIENT' | 'CLIENT_MANAGER' — messages sent by the viewer are aligned right.
 */
export default function InquiryThread({ inquiry, viewerRole }) {
  const thread = buildInquiryThread(inquiry);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', margin: '0.75rem 0' }}>
      {thread.map((m) => {
        const mine = m.senderRole === viewerRole;
        const isManager = m.senderRole === 'CLIENT_MANAGER';
        const label = mine ? 'You' : (isManager ? (m.senderName || 'Client Manager') : (m.senderName || 'Client'));
        return (
          <div key={m.key} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <div
              style={{
                maxWidth: '82%',
                background: isManager ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${isManager ? '#bbf7d0' : '#e2e8f0'}`,
                borderLeft: !mine ? `4px solid ${isManager ? '#16a34a' : '#64748b'}` : undefined,
                borderRight: mine ? `4px solid ${isManager ? '#16a34a' : '#64748b'}` : undefined,
                borderRadius: 8,
                padding: '0.7rem 0.95rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem' }}>
                <small style={{ fontWeight: 700, color: isManager ? '#15803d' : '#334155' }}>
                  {label}{isManager && !mine ? ' (Client Manager)' : ''}
                </small>
                <small style={{ color: '#94a3b8' }}>{m.createdAt ? formatDate(m.createdAt) : ''}</small>
              </div>
              <p style={{ margin: 0, color: '#0f172a', fontSize: '0.92rem', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {m.message}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
