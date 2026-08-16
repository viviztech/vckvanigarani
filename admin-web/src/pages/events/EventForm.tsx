import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../../services/events';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { ApiError } from '../../services/api-client';

const today = () => new Date().toISOString().slice(0, 10);
const inTwoWeeks = () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function EventForm() {
  const queryClient = useQueryClient();
  const { data: events, isLoading } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: administrativeUnits } = useQuery({
    queryKey: ['jurisdictions', 'ADMINISTRATIVE'],
    queryFn: () => jurisdictionsApi.list({ tree: 'ADMINISTRATIVE' }),
  });

  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [scopeIds, setScopeIds] = useState<string[]>([]);
  const [openDate, setOpenDate] = useState(today());
  const [closeDate, setCloseDate] = useState(inTwoWeeks());
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setTitle('');
      setPurpose('');
      setTargetAmount('');
      setScopeIds([]);
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create the event.'),
  });

  const closeMutation = useMutation({
    mutationFn: eventsApi.close,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
  });

  const toggleScope = (id: string) => {
    setScopeIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const submit = () => {
    createMutation.mutate({
      title,
      purpose,
      targetAmount: targetAmount ? Number(targetAmount) : undefined,
      jurisdictionScopeIds: scopeIds,
      openDate,
      closeDate,
    });
  };

  return (
    <div>
      <h2>Events</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Only Super Admin can create or close an event. Every contribution is verified by Razorpay's webhook — nothing
        here marks a payment as paid on its own.
      </p>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>New event</h3>
        <div className="field">
          <label htmlFor="e-title">Title</label>
          <input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-purpose">Purpose</label>
          <input id="e-purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-target">Target amount (optional, ₹)</label>
          <input id="e-target" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} />
        </div>

        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0' }}>
          Applicable territory — pick the State root for statewide, or specific units.
        </p>
        <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
          {administrativeUnits?.map((unit) => (
            <label className="checkbox-row" key={unit.id}>
              <input type="checkbox" checked={scopeIds.includes(unit.id)} onChange={() => toggleScope(unit.id)} />
              {unit.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({unit.type})</span>
            </label>
          ))}
        </div>

        <div className="field" style={{ marginTop: 12 }}>
          <label htmlFor="e-open">Open date</label>
          <input id="e-open" type="date" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-close">Close date</label>
          <input id="e-close" type="date" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
        </div>

        {error && <p className="error-text">{error}</p>}
        <button
          className="primary"
          disabled={!title || !purpose || scopeIds.length === 0 || createMutation.isPending}
          onClick={submit}
        >
          Create event
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15 }}>Events</h3>
        {isLoading ? (
          <p>Loading…</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Target</th>
                <th>Open</th>
                <th>Close</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {events?.map((event) => (
                <tr key={event.id}>
                  <td>{event.title}</td>
                  <td>{event.targetAmount ? `₹${event.targetAmount}` : '—'}</td>
                  <td>{event.openDate.slice(0, 10)}</td>
                  <td>{event.closeDate.slice(0, 10)}</td>
                  <td>
                    <span className={`pill ${event.status === 'OPEN' ? '' : 'inactive'}`}>{event.status}</span>
                  </td>
                  <td>
                    {event.status === 'OPEN' && (
                      <button className="secondary" onClick={() => closeMutation.mutate(event.id)}>
                        Close
                      </button>
                    )}
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
