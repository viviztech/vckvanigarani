import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { bearersApi } from '../../services/bearers';
import { postsApi } from '../../services/posts';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { ApiError } from '../../services/api-client';

/** FR-009/FR-010: search/filter the directory, scoped server-side to the caller's own jurisdiction subtree. */
export default function Directory() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [postId, setPostId] = useState('');
  const [jurisdictionId, setJurisdictionId] = useState('');

  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: postsApi.list });
  const { data: jurisdictions } = useQuery({ queryKey: ['jurisdictions', 'all'], queryFn: () => jurisdictionsApi.list() });

  const {
    data: results,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['bearers', 'search', query, postId, jurisdictionId],
    queryFn: () => bearersApi.search({ query: query || undefined, postId: postId || undefined, jurisdictionId: jurisdictionId || undefined }),
  });

  return (
    <div>
      <h2>Directory</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Search across bearers by name, post, and territory — results are limited to your own jurisdiction subtree
        unless you're Super Admin. Click a bearer to view or manage their postings.
      </p>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
        <div className="field">
          <label htmlFor="d-query">Name</label>
          <input id="d-query" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" />
        </div>
        <div className="field">
          <label htmlFor="d-post">Post</label>
          <select id="d-post" value={postId} onChange={(e) => setPostId(e.target.value)}>
            <option value="">Any post</option>
            {posts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="d-jurisdiction">Jurisdiction</label>
          <select id="d-jurisdiction" value={jurisdictionId} onChange={(e) => setJurisdictionId(e.target.value)}>
            <option value="">Any jurisdiction</option>
            {jurisdictions?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p>Loading…</p>}
      {error && <p className="error-text">{error instanceof ApiError ? error.message : 'Could not search the directory.'}</p>}

      {results && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Membership No</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((b) => (
                <tr key={b.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/bearers?bearerId=${b.id}`)}>
                  <td>{b.fullName}</td>
                  <td>{b.phone}</td>
                  <td>{b.membershipNo}</td>
                  <td>
                    <span className={`pill ${b.status === 'ACTIVE' ? '' : 'inactive'}`}>{b.status}</span>
                  </td>
                </tr>
              ))}
              {results.length === 0 && (
                <tr>
                  <td colSpan={4}>No bearers match this search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
