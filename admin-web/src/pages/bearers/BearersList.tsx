import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { bearersApi } from '../../services/bearers';
import { ApiError } from '../../services/api-client';

/** Full roster — every bearer, including those not yet posted, unlike Directory (post-holders only). */
export default function BearersList() {
  const navigate = useNavigate();
  const { data: bearers, isLoading, error } = useQuery({ queryKey: ['bearers', 'list'], queryFn: bearersApi.list });

  return (
    <div>
      <h2>All bearers</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Every bearer in your jurisdiction, including those not yet assigned to a post. Click one to view or manage
        their postings.
      </p>

      {isLoading && <p>Loading…</p>}
      {error && <p className="error-text">{error instanceof ApiError ? error.message : 'Could not load bearers.'}</p>}

      {bearers && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Membership No</th>
                <th>Home address</th>
                <th>Current posting(s)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bearers.map((b) => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bearers?bearerId=${b.id}`)}>
                  <td>{b.fullName}</td>
                  <td>{b.phone}</td>
                  <td>{b.membershipNo}</td>
                  <td>{b.homeAdministrativeUnit?.name ?? '—'}</td>
                  <td>
                    {b.assignments.length === 0
                      ? '— unposted —'
                      : b.assignments.map((a) => a.post?.name ?? a.postId).join(', ')}
                  </td>
                  <td>
                    <span className={`pill ${b.status === 'ACTIVE' ? '' : 'inactive'}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
              {bearers.length === 0 && (
                <tr>
                  <td colSpan={6}>No bearers yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
