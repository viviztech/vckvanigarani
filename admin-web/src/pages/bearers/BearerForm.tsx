import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { bearersApi } from '../../services/bearers';
import { postsApi } from '../../services/posts';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { assignmentsApi } from '../../services/assignments';
import { ApiError } from '../../services/api-client';
import type { JurisdictionUnit } from '../../types';

const today = () => new Date().toISOString().slice(0, 10);

export default function BearerForm() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- Step 1: create (or reference) a bearer ---
  const [fullName, setFullName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [habitationOrStreet, setHabitationOrStreet] = useState('');
  const [idProofRef, setIdProofRef] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // The bearer whose postings the lower half of the page is managing —
  // either just-created, or picked via the search box, or deep-linked from
  // the Directory (?bearerId=...). One id, one detail fetch (below), used
  // by both "current postings" and "assign to a post".
  const [contextBearerId, setContextBearerId] = useState<string | null>(() => searchParams.get('bearerId'));

  // Search-based lookup for an existing bearer, replacing raw id paste.
  const [existingQuery, setExistingQuery] = useState('');
  const [debouncedExistingQuery, setDebouncedExistingQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedExistingQuery(existingQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [existingQuery]);
  const { data: existingResults } = useQuery({
    queryKey: ['bearers', 'search', debouncedExistingQuery],
    queryFn: () => bearersApi.search({ query: debouncedExistingQuery }),
    enabled: debouncedExistingQuery.length >= 2,
  });

  const selectExistingBearer = (id: string) => {
    setContextBearerId(id);
    setExistingQuery('');
    setCreateResultMessage(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('bearerId', id);
      return next;
    });
  };
  const clearContextBearer = () => {
    setContextBearerId(null);
    setCreateResultMessage(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('bearerId');
      return next;
    });
  };

  // Full detail (incl. assignment history) for whichever bearer is in
  // context — this is the single source of truth for the "current
  // postings" table and the "assign to a post" header below.
  const {
    data: bearerDetail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ['bearers', contextBearerId],
    queryFn: () => bearersApi.getOne(contextBearerId!),
    enabled: Boolean(contextBearerId),
  });

  // Home address — one linear chain: District -> Assembly Constituency ->
  // Parliament Constituency (derived, not picked — AC's own parent already
  // determines it) -> Block/Town Panchayat/Municipality/Corporation ->
  // Village. Independent of any post/assignment jurisdiction (where a
  // bearer lives vs. where they're posted can differ). Both full trees are
  // fetched once and filtered client-side — same pattern
  // Directory.tsx/CoverageReport.tsx already use — so every step is
  // instant with no extra round-trips.
  const { data: administrativeUnits } = useQuery({
    queryKey: ['jurisdictions', 'ADMINISTRATIVE'],
    queryFn: () => jurisdictionsApi.list({ tree: 'ADMINISTRATIVE' }),
  });
  const { data: electoralUnits } = useQuery({
    queryKey: ['jurisdictions', 'ELECTORAL'],
    queryFn: () => jurisdictionsApi.list({ tree: 'ELECTORAL' }),
  });

  const [homeDistrictId, setHomeDistrictId] = useState('');
  const [homeAcId, setHomeAcId] = useState('');
  const [homeAdminUnitId, setHomeAdminUnitId] = useState(''); // Block / Municipality (incl. Corporations) / Town Panchayat
  const [homeVillageId, setHomeVillageId] = useState(''); // only when homeAdminUnitId is a BLOCK

  const homeDistrictOptions = useMemo(
    () => administrativeUnits?.filter((u) => u.type === 'DISTRICT' && u.status === 'ACTIVE') ?? [],
    [administrativeUnits],
  );
  // Filtered by district via JurisdictionUnit.districtId — a cross-tree
  // reference recorded per Assembly Constituency at seed time (real ECI
  // delimitation data, not derived from the tree structure itself, since
  // District and AC live in independent trees with no parent-child link).
  const homeAcOptions = useMemo(
    () =>
      electoralUnits?.filter((u) => u.type === 'ASSEMBLY_CONSTITUENCY' && u.districtId === homeDistrictId && u.status === 'ACTIVE') ?? [],
    [electoralUnits, homeDistrictId],
  );
  // The Parliament Constituency is derived from the chosen AC's own parent
  // — never a separate pick, so it can never disagree with the AC.
  const selectedHomeAc = useMemo(() => electoralUnits?.find((u) => u.id === homeAcId), [electoralUnits, homeAcId]);
  const derivedHomePc = useMemo(
    () => electoralUnits?.find((u) => u.id === selectedHomeAc?.parentId),
    [electoralUnits, selectedHomeAc],
  );
  const homeAdminUnitOptions = useMemo(
    () =>
      administrativeUnits?.filter(
        (u) =>
          u.parentId === homeDistrictId &&
          (['BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT'] as JurisdictionUnit['type'][]).includes(u.type) &&
          u.status === 'ACTIVE',
      ) ?? [],
    [administrativeUnits, homeDistrictId],
  );
  const selectedHomeAdminUnit = useMemo(
    () => administrativeUnits?.find((u) => u.id === homeAdminUnitId),
    [administrativeUnits, homeAdminUnitId],
  );
  const homeVillageOptions = useMemo(
    () =>
      selectedHomeAdminUnit?.type === 'BLOCK'
        ? (administrativeUnits?.filter((u) => u.parentId === homeAdminUnitId && u.type === 'VILLAGE' && u.status === 'ACTIVE') ?? [])
        : [],
    [administrativeUnits, homeAdminUnitId, selectedHomeAdminUnit],
  );

  // Each level resets everything narrower than it when it changes.
  useEffect(() => {
    setHomeAcId('');
  }, [homeDistrictId]);
  useEffect(() => {
    setHomeAdminUnitId('');
  }, [homeAcId]);
  useEffect(() => {
    setHomeVillageId('');
  }, [homeAdminUnitId]);

  // The FK actually sent to the API is whichever unit is most specific.
  const homeAdministrativeUnitId = homeVillageId || homeAdminUnitId;
  const homeElectoralUnitId = homeAcId;

  const [createResultMessage, setCreateResultMessage] = useState<string | null>(null);

  const createBearerMutation = useMutation({
    mutationFn: bearersApi.create,
    onSuccess: (bearer) => {
      selectExistingBearer(bearer.id);
      setCreateError(null);
      setCreateResultMessage(
        bearer.matchedExisting
          ? `This phone number already belonged to ${bearer.fullName} — their details were updated instead of creating a duplicate.`
          : `${bearer.fullName} created.`,
      );
      setFullName('');
      setFatherOrHusbandName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setHabitationOrStreet('');
      setIdProofRef('');
      setHomeDistrictId('');
      setHomeAcId('');
      setHomeAdminUnitId('');
      setHomeVillageId('');
    },
    onError: (err) => setCreateError(err instanceof ApiError ? err.message : 'Could not create the bearer.'),
  });

  // --- Step 2: assign to a post + jurisdiction ---
  const { data: posts } = useQuery({ queryKey: ['posts'], queryFn: postsApi.list });
  const [postId, setPostId] = useState('');
  const selectedPost = useMemo(() => posts?.find((p) => p.id === postId), [posts, postId]);

  const tree = selectedPost?.jurisdictionTypeRule ? 'ELECTORAL' : 'ADMINISTRATIVE';
  const { data: jurisdictionUnits } = useQuery({
    queryKey: ['jurisdictions', tree],
    queryFn: () => jurisdictionsApi.list({ tree }),
    enabled: Boolean(selectedPost),
  });

  const eligibleUnits: JurisdictionUnit[] = useMemo(() => {
    if (!selectedPost || !jurisdictionUnits) return [];
    if (selectedPost.jurisdictionTypeRule) {
      return jurisdictionUnits.filter((u) => u.type === selectedPost.jurisdictionTypeRule && u.status === 'ACTIVE');
    }
    return jurisdictionUnits.filter(
      (u) => selectedPost.applicableLevels.includes(u.type as never) && u.status === 'ACTIVE',
    );
  }, [selectedPost, jurisdictionUnits]);

  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(today());
  const [assignError, setAssignError] = useState<string | null>(null);

  const toggleUnit = (id: string) => {
    if (selectedPost?.jurisdictionExpandToChildren) {
      setSelectedUnitIds([id]); // exactly one — the post expands it to children server-side
      return;
    }
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const assignMutation = useMutation({
    mutationFn: assignmentsApi.create,
    onSuccess: () => {
      setSelectedUnitIds([]);
      setAssignError(null);
      setPostId('');
      queryClient.invalidateQueries({ queryKey: ['bearers', contextBearerId] });
    },
    onError: (err) => setAssignError(err instanceof ApiError ? err.message : 'Could not create the assignment.'),
  });

  const closeMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => assignmentsApi.close(id, today()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bearers', contextBearerId] });
      queryClient.invalidateQueries({ queryKey: ['jurisdictions'] });
    },
  });

  return (
    <div>
      <h2>Bearers</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Bearers never self-register — every profile is created here by an admin, and the level picker below lets Super
        Admin place someone at State, District, Block, Municipality, Town Panchayat, or a constituency in one flow.
      </p>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>New bearer</h3>
        <div className="field">
          <label htmlFor="b-name">பெயர் (Name)</label>
          <input id="b-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="b-father-husband">தந்தை/கணவர் பெயர் (Father / Husband Name)</label>
          <input id="b-father-husband" value={fatherOrHusbandName} onChange={(e) => setFatherOrHusbandName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="b-phone">கைபேசி எண் (Mobile Number)</label>
          <input id="b-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91XXXXXXXXXX" />
        </div>
        <div className="field">
          <label htmlFor="b-email">மின்னஞ்சல் (Email) — login OTP is sent here</label>
          <input id="b-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '12px 0 4px' }}>
          Home address — independent of any post's jurisdiction below (where they live, not necessarily where they're
          posted). One linear chain: each field only appears once the one before it is picked. District is required
          (it determines the membership ID); everything below it is optional.
        </p>

        <div className="field">
          <label>மாநிலம் (State)</label>
          <input value="Tamil Nadu" disabled />
        </div>

        <div className="field">
          <label htmlFor="b-home-district">மாவட்டம் (District) *</label>
          <select id="b-home-district" value={homeDistrictId} onChange={(e) => setHomeDistrictId(e.target.value)}>
            <option value="">Select…</option>
            {homeDistrictOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {homeDistrictId && (
          <div className="field">
            <label htmlFor="b-home-ac">சட்டமன்ற தொகுதி (Assembly Constituency)</label>
            <select id="b-home-ac" value={homeAcId} onChange={(e) => setHomeAcId(e.target.value)}>
              <option value="">Select…</option>
              {homeAcOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {homeAcId && (
          <div className="field">
            <label>பாராளுமன்ற தொகுதி (Parliament Constituency)</label>
            <input value={derivedHomePc?.name ?? ''} disabled />
          </div>
        )}

        {homeAcId && (
          <div className="field">
            <label htmlFor="b-home-admin">ஒன்றியம்/பேரூராட்சி/நகரம்/மாநகரம் (Block/Town Panchayat/Municipality/Corporation)</label>
            <select id="b-home-admin" value={homeAdminUnitId} onChange={(e) => setHomeAdminUnitId(e.target.value)}>
              <option value="">Select…</option>
              {homeAdminUnitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {homeAdminUnitId && selectedHomeAdminUnit?.type === 'BLOCK' && (
          <div className="field">
            <label htmlFor="b-home-village">கிராமம் (Village)</label>
            <select id="b-home-village" value={homeVillageId} onChange={(e) => setHomeVillageId(e.target.value)}>
              <option value="">Select…</option>
              {homeVillageOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
            {homeVillageOptions.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                No villages seeded for this block yet — leave blank for now.
              </p>
            )}
          </div>
        )}

        <div className="field">
          <label htmlFor="b-habitation">ஊர்/பகுதி/தெரு (Habitation/Place/Street)</label>
          <input id="b-habitation" value={habitationOrStreet} onChange={(e) => setHabitationOrStreet(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="b-address">முகவரி (Address)</label>
          <input id="b-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="b-idproof">வாக்காளர் அட்டை எண் (Voter ID Number)</label>
          <input id="b-idproof" value={idProofRef} onChange={(e) => setIdProofRef(e.target.value)} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Membership number is generated automatically (VCK-VGA-&lt;district&gt;-00001) once the bearer is created —
          that's why District (above) is required even though the rest of the address chain is optional. If this
          phone number already belongs to a bearer, their existing record is updated instead of creating a
          duplicate. Email must be unique — it's how this bearer logs in.
        </p>
        {createError && <p className="error-text">{createError}</p>}
        {createResultMessage && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{createResultMessage}</p>}
        <button
          className="primary"
          disabled={
            !fullName ||
            !fatherOrHusbandName ||
            !phone ||
            !email ||
            !address ||
            !habitationOrStreet ||
            !idProofRef ||
            !homeDistrictId ||
            createBearerMutation.isPending
          }
          onClick={() =>
            createBearerMutation.mutate({
              fullName,
              fatherOrHusbandName,
              phone,
              email,
              address,
              habitationOrStreet,
              idProofRef,
              homeDistrictId,
              homeAdministrativeUnitId: homeAdministrativeUnitId || undefined,
              homeElectoralUnitId: homeElectoralUnitId || undefined,
            })
          }
        >
          Create bearer
        </button>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 16 }}>
          Managing postings for an existing bearer instead? Search by name, phone, or membership number:
        </p>
        <div className="field" style={{ position: 'relative' }}>
          <input
            placeholder="Search existing bearers…"
            value={existingQuery}
            onChange={(e) => setExistingQuery(e.target.value)}
          />
          {existingResults && existingQuery.trim().length >= 2 && (
            <div
              style={{
                border: '1px solid var(--border)',
                borderRadius: 4,
                marginTop: 4,
                maxHeight: 220,
                overflowY: 'auto',
              }}
            >
              {existingResults.length === 0 && (
                <p style={{ fontSize: 13, padding: 8, color: 'var(--text-muted)' }}>No bearers match.</p>
              )}
              {existingResults.map((b) => (
                <div
                  key={b.id}
                  style={{ padding: 8, cursor: 'pointer', borderBottom: '1px solid var(--border)' }}
                  onClick={() => selectExistingBearer(b.id)}
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
      </div>

      {contextBearerId && (
        <div className="card">
          {detailLoading && <p>Loading bearer…</p>}
          {detailError && <p className="error-text">Could not load this bearer.</p>}
          {bearerDetail && (
            <>
              <h3 style={{ fontSize: 15 }}>
                {bearerDetail.fullName}{' '}
                <button className="secondary" style={{ fontSize: 12, marginLeft: 8 }} onClick={clearContextBearer}>
                  Change bearer
                </button>
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {bearerDetail.phone} · {bearerDetail.membershipNo}
              </p>

              <h4 style={{ fontSize: 14, marginTop: 12 }}>Current & past postings</h4>
              <table>
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Jurisdiction</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bearerDetail.assignments.map((a) => (
                    <tr key={a.id}>
                      <td>{a.post?.name ?? a.postId}</td>
                      <td>{a.jurisdictions.map((j) => j.jurisdictionUnit.name).join(', ')}</td>
                      <td>{a.startDate.slice(0, 10)}</td>
                      <td>{a.endDate ? a.endDate.slice(0, 10) : '—'}</td>
                      <td>
                        <span className={`pill ${a.status === 'ACTIVE' ? '' : 'inactive'}`}>{a.status}</span>
                      </td>
                      <td>
                        {a.status === 'ACTIVE' && (
                          <button className="secondary" onClick={() => closeMutation.mutate({ id: a.id })}>
                            Close (reassign)
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bearerDetail.assignments.length === 0 && (
                    <tr>
                      <td colSpan={6}>No postings yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </>
          )}

          <h3 style={{ fontSize: 15, marginTop: 16 }}>Assign to a post</h3>

          <div className="field">
            <label htmlFor="a-post">Post</label>
            <select id="a-post" value={postId} onChange={(e) => setPostId(e.target.value)}>
              <option value="">Select a post</option>
              {posts?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {selectedPost && (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {selectedPost.jurisdictionExpandToChildren
                  ? 'Pick exactly one unit — the assignment will cover its children automatically.'
                  : 'Pick one or more jurisdiction units.'}
              </p>
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
                {eligibleUnits.length === 0 && <p style={{ fontSize: 13 }}>No eligible jurisdiction units found yet.</p>}
                {eligibleUnits.map((unit) => (
                  <label className="checkbox-row" key={unit.id}>
                    <input
                      type={selectedPost.jurisdictionExpandToChildren ? 'radio' : 'checkbox'}
                      name="unit"
                      checked={selectedUnitIds.includes(unit.id)}
                      onChange={() => toggleUnit(unit.id)}
                    />
                    {unit.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({unit.type})</span>
                  </label>
                ))}
              </div>

              <div className="field" style={{ marginTop: 12 }}>
                <label htmlFor="a-start">Start date</label>
                <input id="a-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              {assignError && <p className="error-text">{assignError}</p>}
              <button
                className="primary"
                disabled={selectedUnitIds.length === 0 || assignMutation.isPending}
                onClick={() =>
                  assignMutation.mutate({
                    bearerId: contextBearerId!,
                    postId: selectedPost.id,
                    jurisdictionUnitIds: selectedUnitIds,
                    startDate,
                  })
                }
              >
                Create assignment
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
