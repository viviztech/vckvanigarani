import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { newsApi } from '../../services/news';
import { ApiError } from '../../services/api-client';

/** FR-003/FR-004, Story 3: drafts are invisible to bearers and unnotified until published (T019). */
export default function Drafts() {
  const navigate = useNavigate();
  const { data: drafts, isLoading, error } = useQuery({ queryKey: ['news', 'drafts'], queryFn: newsApi.drafts });

  return (
    <div>
      <h2>Drafts</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Saved drafts — edit any number of times with no notification sent until you publish.
      </p>

      {isLoading && <p>Loading…</p>}
      {error && <p className="error-text">{error instanceof ApiError ? error.message : 'Could not load drafts.'}</p>}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Target</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {drafts?.map((post) => (
              <tr key={post.id}>
                <td>{post.title}</td>
                <td>{post.targetEveryone ? 'Everyone' : post.jurisdictions.map((j) => j.jurisdictionUnit.name).join(', ')}</td>
                <td>{new Date(post.updatedAt).toLocaleString()}</td>
                <td>
                  <button className="secondary" onClick={() => navigate(`/news?edit=${post.id}`)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {drafts?.length === 0 && (
              <tr>
                <td colSpan={4}>No drafts.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
