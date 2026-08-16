import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { postsApi } from '../../services/posts';
import { reportsApi } from '../../services/reports';
import { ApiError } from '../../services/api-client';

/** FR-012/FR-013: which jurisdiction units of a post's relevant type have no active holder, and which have more than one. */
export default function CoverageReport() {
  const [postId, setPostId] = useState('');
  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: postsApi.list });

  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['coverage', postId],
    queryFn: () => reportsApi.coverage(postId),
    enabled: Boolean(postId),
  });

  return (
    <div>
      <h2>Coverage Report</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Select a post to see every jurisdiction unit of its relevant type with no active holder, and any unit covered
        by more than one holder at once (allowed — e.g. during a handover — but flagged here rather than hidden).
      </p>

      <div className="card">
        <div className="field">
          <label htmlFor="c-post">Post</label>
          <select id="c-post" value={postId} onChange={(e) => setPostId(e.target.value)}>
            <option value="">Select a post</option>
            {posts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && <p>Loading…</p>}
      {error && <p className="error-text">{error instanceof ApiError ? error.message : 'Could not load the coverage report.'}</p>}

      {report && (
        <>
          <div className="card">
            <h3 style={{ fontSize: 15 }}>Unfilled ({report.unfilled.length})</h3>
            {report.unfilled.length === 0 ? (
              <p>No gaps — every unit has an active holder.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {report.unfilled.map((u) => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15 }}>Overlapping ({report.overlapping.length})</h3>
            {report.overlapping.length === 0 ? (
              <p>No overlaps.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Holders</th>
                  </tr>
                </thead>
                <tbody>
                  {report.overlapping.map(({ unit, bearers }) => (
                    <tr key={unit.id}>
                      <td>{unit.name}</td>
                      <td>{bearers.map((b) => b.fullName).join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
