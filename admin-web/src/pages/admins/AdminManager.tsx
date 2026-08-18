import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bearersApi } from '../../services/bearers';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { adminScopesApi } from '../../services/adminScopes';
import { ApiError } from '../../services/api-client';
import type { AdminRole, Bearer } from '../../types';

const ROLE_LABELS: Record<AdminRole, string> = {
  SUPER_ADMIN: 'Super Admin — every jurisdiction',
  STATE_ADMIN: 'State Admin',
  DISTRICT_ADMIN: 'District Admin',
  LOCAL_ADMIN: 'Local Admin — Block / Municipality / Town Panchayat',
};

export default function AdminManager() {
  const queryClient = useQueryClient();
  const { data: scopes, isLoading } = useQuery({ queryKey: ['admin-scopes'], queryFn: adminScopesApi.list });

  // --- pick a bearer ---
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);
  const { data: searchResults } = useQuery({
    queryKey: ['bearers', 'search', debouncedQuery],
    queryFn: () => bearersApi.search({ query: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
  });

  const [selectedBearer, setSelectedBearer] = useState<Bearer | null>(null);

  // --- role + scope ---
  const [role, setRole] = useState<AdminRole>('DISTRICT_ADMIN');
  const [districtId, setDistrictId] = useState('');
  const [localUnitId, setLocalUnitId] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: administrativeUnits } = useQuery({
    queryKey: ['jurisdictions', 'ADMINISTRATIVE'],
    queryFn: () => jurisdictionsApi.list({ tree: 'ADMINISTRATIVE' }),
  });

  const stateUnit = useMemo(() => administrativeUnits?.find((u) => u.type === 'STATE'), [administrativeUnits]);
  const districtOptions = useMemo(
    () => administrativeUnits?.filter((u) => u.type === 'DISTRICT' && u.status === 'ACTIVE') ?? [],
    [administrativeUnits],
  );
  const localUnitOptions = useMemo(
    () =>
      administrativeUnits?.filter(
        (u) =>
          u.parentId === districtId &&
          (['BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT'] as const).includes(u.type as never) &&
          u.status === 'ACTIVE',
      ) ?? [],
    [administrativeUnits, districtId],
  );

  useEffect(() => {
    setLocalUnitId('');
  }, [districtId]);

  const scopeJurisdictionUnitId =
    role === 'SUPER_ADMIN' ? undefined : role === 'STATE_ADMIN' ? stateUnit?.id : role === 'DISTRICT_ADMIN' ? districtId : localUnitId;

  const canSubmit = Boolean(selectedBearer) && (role === 'SUPER_ADMIN' || Boolean(scopeJurisdictionUnitId));

  const grantMutation = useMutation({
    mutationFn: adminScopesApi.grant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-scopes'] });
      setSelectedBearer(null);
      setQuery('');
      setDistrictId('');
      setLocalUnitId('');
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not grant this role.'),
  });

  const revokeMutation = useMutation({
    mutationFn: adminScopesApi.revoke,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-scopes'] }),
  });

  const submit = () => {
    if (!selectedBearer) return;
    grantMutation.mutate({ bearerId: selectedBearer.id, role, scopeJurisdictionUnitId });
  };

  return (
    <div>
      <h2>Admins</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Grant a bearer admin access to a jurisdiction — Super Admin sees and edits everything; State/District/Local
        Admin are restricted to their own jurisdiction and everything below it. Super Admin only.
      </p>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>Grant a role</h3>

        {selectedBearer ? (
          <div className="field">
            <label>Bearer</label>
            <p>
              <strong>{selectedBearer.fullName}</strong>{' '}
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                {selectedBearer.phone} · {selectedBearer.membershipNo}
              </span>{' '}
              <button className="secondary" style={{ fontSize: 12 }} onClick={() => setSelectedBearer(null)}>
                Change
              </button>
            </p>
          </div>
        ) : (
          <div className="field" style={{ position: 'relative' }}>
            <label>Bearer</label>
            <input placeholder="Search by name, phone, or membership number…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {searchResults && query.trim().length >= 2 && (
              <div style={{ border: '1px solid var(--border)', borderRadius: 4, marginTop: 4, maxHeight: 220, overflowY: 'auto' }}>
                {searchResults.length === 0 && <p style={{ fontSize: 13, padding: 8, color: 'var(--text-muted)' }}>No bearers match.</p>}
                {searchResults.map((b) => (
                  <div
                    key={b.id}
                    style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                    onClick={() => {
                      setSelectedBearer(b);
                      setQuery('');
                    }}
                  >
                    <strong>{b.fullName}</strong>{' '}
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {b.phone} · {b.membershipNo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="admin-role">Role</label>
          <select id="admin-role" value={role} onChange={(e) => setRole(e.target.value as AdminRole)}>
            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>

        {role === 'STATE_ADMIN' && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Scope: {stateUnit?.name ?? 'Loading…'}</p>
        )}

        {(role === 'DISTRICT_ADMIN' || role === 'LOCAL_ADMIN') && (
          <div className="field">
            <label htmlFor="admin-district">District</label>
            <select id="admin-district" value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">Select…</option>
              {districtOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {role === 'LOCAL_ADMIN' && districtId && (
          <div className="field">
            <label htmlFor="admin-local-unit">Block / Municipality / Town Panchayat</label>
            <select id="admin-local-unit" value={localUnitId} onChange={(e) => setLocalUnitId(e.target.value)}>
              <option value="">Select…</option>
              {localUnitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
        <button className="primary" disabled={!canSubmit || grantMutation.isPending} onClick={submit}>
          Grant role
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>Current admins</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Bearer</th>
                <th>Role</th>
                <th>Scope</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {scopes?.map((s) => (
                <tr key={s.adminBearerId}>
                  <td>
                    {s.adminBearer?.fullName} <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{s.adminBearer?.phone}</span>
                  </td>
                  <td>{ROLE_LABELS[s.role]}</td>
                  <td>{s.scopeJurisdictionUnit?.name ?? '—'}</td>
                  <td>
                    <button
                      className="secondary"
                      onClick={() => {
                        if (window.confirm(`Revoke admin access for ${s.adminBearer?.fullName ?? 'this bearer'}?`)) {
                          revokeMutation.mutate(s.adminBearerId);
                        }
                      }}
                    >
                      Revoke
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
