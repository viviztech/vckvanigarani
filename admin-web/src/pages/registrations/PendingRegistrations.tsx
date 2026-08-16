import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { pendingRegistrationsApi } from '../../services/pendingRegistrations';
import { ApiError } from '../../services/api-client';

/** The approval queue — a public submission lands here, never as a Bearer directly (Constitution Principle V). Approve is the actual creation moment. */
export default function PendingRegistrations() {
  const queryClient = useQueryClient();
  const { data: registrations, isLoading, error } = useQuery({
    queryKey: ['pending-registrations'],
    queryFn: pendingRegistrationsApi.list,
  });

  const [lastApproved, setLastApproved] = useState<{ id: string; bearerId: string; membershipNo: string } | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const approveMutation = useMutation({
    mutationFn: pendingRegistrationsApi.approve,
    onSuccess: (result) => {
      setActionError(null);
      setLastApproved({ id: result.registration.id, bearerId: result.bearerId, membershipNo: result.membershipNo });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
      queryClient.invalidateQueries({ queryKey: ['bearers'] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Could not approve this registration.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => pendingRegistrationsApi.reject(id, reason),
    onSuccess: () => {
      setActionError(null);
      setRejectingId(null);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
    },
    onError: (err) => setActionError(err instanceof ApiError ? err.message : 'Could not reject this registration.'),
  });

  const pending = registrations?.filter((r) => r.status === 'PENDING') ?? [];
  const reviewed = registrations?.filter((r) => r.status !== 'PENDING') ?? [];

  return (
    <div>
      <h2>Registrations</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Submissions from the public registration form on the website. Nothing here is a Bearer yet — approving one
        is what creates the Bearer and assigns its membership ID; rejecting discards it.
      </p>

      {isLoading && <p>Loading…</p>}
      {error && <p className="error-text">{error instanceof ApiError ? error.message : 'Could not load registrations.'}</p>}
      {actionError && <p className="error-text">{actionError}</p>}

      {lastApproved && (
        <div className="card" style={{ background: 'var(--surface-accent, #eef6ee)' }}>
          Approved — membership ID <strong>{lastApproved.membershipNo}</strong>.{' '}
          <Link to={`/bearers?bearerId=${lastApproved.bearerId}`}>Assign them a posting →</Link>
        </div>
      )}

      <div className="card">
        <h3 style={{ fontSize: 15 }}>Pending ({pending.length})</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>District</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.fullName}</td>
                <td>{r.phone}</td>
                <td>{r.homeDistrict?.name ?? '—'}</td>
                <td>{new Date(r.submittedAt).toLocaleDateString()}</td>
                <td style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="primary"
                    disabled={approveMutation.isPending}
                    onClick={() => approveMutation.mutate(r.id)}
                  >
                    Approve
                  </button>
                  <button className="secondary" onClick={() => setRejectingId(r.id)}>
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={5}>No pending registrations.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {rejectingId && (
        <div className="card">
          <h3 style={{ fontSize: 15 }}>Reject registration</h3>
          <div className="field">
            <label htmlFor="reject-reason">Reason (optional)</label>
            <input id="reject-reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="primary"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: rejectingId, reason: rejectReason || undefined })}
            >
              Confirm reject
            </button>
            <button className="secondary" onClick={() => setRejectingId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15 }}>Reviewed</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {reviewed.map((r) => (
                <tr key={r.id}>
                  <td>{r.fullName}</td>
                  <td>{r.phone}</td>
                  <td>
                    <span className={`pill ${r.status === 'APPROVED' ? '' : 'inactive'}`}>{r.status}</span>
                  </td>
                  <td>{r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
