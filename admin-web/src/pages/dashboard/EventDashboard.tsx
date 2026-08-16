import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '../../services/events';
import { dashboardApi } from '../../services/dashboard';
import { ApiError } from '../../services/api-client';

export default function EventDashboard() {
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const [eventId, setEventId] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const {
    data: dashboard,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['dashboard', eventId],
    queryFn: () => dashboardApi.get(eventId),
    enabled: Boolean(eventId),
  });

  const exportCsv = async () => {
    setExportError(null);
    try {
      const blob = await dashboardApi.exportCsv(eventId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event-${eventId}-dashboard.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof ApiError ? err.message : 'Could not export the CSV.');
    }
  };

  return (
    <div>
      <h2>Collection Dashboard</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Totals are computed live from the contribution ledger — nothing here is a stored, editable figure. Visible to
        Super Admin, scoped admins, and anyone currently holding a Finance Secretary post for their own jurisdiction.
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="d-event">Event</label>
          <select id="d-event" value={eventId} onChange={(e) => setEventId(e.target.value)}>
            <option value="">Select an event</option>
            {events?.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {eventId && isLoading && <p>Loading…</p>}
      {eventId && error && (
        <p className="error-text">{error instanceof ApiError ? error.message : 'Could not load the dashboard.'}</p>
      )}

      {dashboard && (
        <>
          <div className="summary" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Raised</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>₹{dashboard.raised.toLocaleString('en-IN')}</div>
            </div>
            <div className="card">
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Target</div>
              <div style={{ fontSize: 28, fontWeight: 600 }}>
                {dashboard.target ? `₹${dashboard.target.toLocaleString('en-IN')}` : '—'}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15 }}>By post</h3>
            <table>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>Contributors</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.byPost.map((row) => (
                  <tr key={row.postId}>
                    <td>{row.postName}</td>
                    <td>{row.contributorCount}</td>
                    <td>₹{row.totalAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
                {dashboard.byPost.length === 0 && (
                  <tr>
                    <td colSpan={3}>No verified contributions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, margin: 0 }}>
                Paid ({dashboard.paid.length}) / Unpaid ({dashboard.unpaid.length})
              </h3>
              <button className="secondary" onClick={exportCsv}>
                Export CSV
              </button>
            </div>
            {exportError && <p className="error-text">{exportError}</p>}
            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Membership No</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.paid.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="pill">Paid</span>
                    </td>
                    <td>{b.fullName}</td>
                    <td>{b.phone}</td>
                    <td>{b.membershipNo}</td>
                  </tr>
                ))}
                {dashboard.unpaid.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="pill inactive">Unpaid</span>
                    </td>
                    <td>{b.fullName}</td>
                    <td>{b.phone}</td>
                    <td>{b.membershipNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
