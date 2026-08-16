import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../../services/posts';
import { ApiError } from '../../services/api-client';
import type { JurisdictionType, OrgLevel, PostBody, PostCapability } from '../../types';

const ALL_LEVELS: OrgLevel[] = ['STATE', 'DISTRICT', 'BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT', 'VILLAGE'];
const ALL_CAPABILITIES: PostCapability[] = ['FINANCE_VIEW'];
const ELECTORAL_RULE_TYPES: JurisdictionType[] = ['PARLIAMENT_CONSTITUENCY', 'ASSEMBLY_CONSTITUENCY'];

export default function PostManager() {
  const queryClient = useQueryClient();
  const { data: posts, isLoading } = useQuery({ queryKey: ['posts'], queryFn: postsApi.list });

  const [name, setName] = useState('');
  const [body, setBody] = useState<PostBody>('MAIN');
  const [levels, setLevels] = useState<OrgLevel[]>([]);
  const [jurisdictionTypeRule, setJurisdictionTypeRule] = useState<JurisdictionType | ''>('');
  const [expandToChildren, setExpandToChildren] = useState(false);
  const [capabilities, setCapabilities] = useState<PostCapability[]>([]);
  const [rank, setRank] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setName('');
      setBody('MAIN');
      setLevels([]);
      setJurisdictionTypeRule('');
      setExpandToChildren(false);
      setCapabilities([]);
      setRank(0);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create the post.');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => postsApi.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const updateRankMutation = useMutation({
    mutationFn: ({ id, rank }: { id: string; rank: number }) => postsApi.update(id, { rank }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  const toggleLevel = (level: OrgLevel) => {
    setLevels((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]));
  };
  const toggleCapability = (cap: PostCapability) => {
    setCapabilities((prev) => (prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]));
  };

  const submit = () => {
    createMutation.mutate({
      name,
      body,
      applicableLevels: levels,
      jurisdictionTypeRule: jurisdictionTypeRule || undefined,
      jurisdictionExpandToChildren: expandToChildren,
      capabilities,
      rank,
    });
  };

  return (
    <div>
      <h2>Posts</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Titles like Organizer, Secretary, or Finance Secretary — configuration, not code (Super Admin only).
      </p>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>New post</h3>
        <div className="field">
          <label htmlFor="post-name">Name</label>
          <input id="post-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. District Finance Secretary" />
        </div>

        <div className="field">
          <label htmlFor="post-body">Organizational body</label>
          <select id="post-body" value={body} onChange={(e) => setBody(e.target.value as PostBody)}>
            <option value="MAIN">Main body</option>
            <option value="SUB">Sub-level body (e.g. a wing)</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="post-rank">Hierarchy rank (lower = higher in the org; used by the public Office Bearers listing)</label>
          <input id="post-rank" type="number" value={rank} onChange={(e) => setRank(Number(e.target.value))} />
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0' }}>Applicable levels</p>
        {ALL_LEVELS.map((level) => (
          <label className="checkbox-row" key={level}>
            <input type="checkbox" checked={levels.includes(level)} onChange={() => toggleLevel(level)} />
            {level}
          </label>
        ))}

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="jt-rule">Electoral jurisdiction rule (state-level posts only)</label>
          <select
            id="jt-rule"
            value={jurisdictionTypeRule}
            onChange={(e) => setJurisdictionTypeRule(e.target.value as JurisdictionType | '')}
          >
            <option value="">None — ordinary administrative post</option>
            {ELECTORAL_RULE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <label className="checkbox-row">
          <input type="checkbox" checked={expandToChildren} onChange={(e) => setExpandToChildren(e.target.checked)} />
          Admin picks one unit; assignment stores its children (e.g. picking one Parliament Constituency to cover all of its Assembly Constituencies)
        </label>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 4px' }}>Capability grants</p>
        {ALL_CAPABILITIES.map((cap) => (
          <label className="checkbox-row" key={cap}>
            <input type="checkbox" checked={capabilities.includes(cap)} onChange={() => toggleCapability(cap)} />
            {cap} — whoever holds this post sees finance data for their own jurisdiction
          </label>
        ))}

        {error && <p className="error-text">{error}</p>}
        <button className="primary" disabled={!name || levels.length === 0 || createMutation.isPending} onClick={submit}>
          Create post
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>Existing posts</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Body</th>
                <th>Rank</th>
                <th>Levels</th>
                <th>Electoral rule</th>
                <th>Capabilities</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts?.map((post) => (
                <tr key={post.id}>
                  <td>{post.name}</td>
                  <td>{post.body === 'SUB' ? 'Sub-level' : 'Main'}</td>
                  <td>
                    <input
                      type="number"
                      style={{ width: 60 }}
                      defaultValue={post.rank}
                      onBlur={(e) => {
                        const value = Number(e.target.value);
                        if (value !== post.rank) updateRankMutation.mutate({ id: post.id, rank: value });
                      }}
                    />
                  </td>
                  <td>{post.applicableLevels.join(', ')}</td>
                  <td>
                    {post.jurisdictionTypeRule ?? '—'}
                    {post.jurisdictionExpandToChildren ? ' (expands to children)' : ''}
                  </td>
                  <td>{post.capabilities.join(', ') || '—'}</td>
                  <td>
                    <span className={`pill ${post.active ? '' : 'inactive'}`}>{post.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => toggleActiveMutation.mutate({ id: post.id, active: !post.active })}
                    >
                      {post.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
