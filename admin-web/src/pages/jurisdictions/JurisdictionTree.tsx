import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { ApiError } from '../../services/api-client';
import type { JurisdictionTree as TreeKind, JurisdictionType, JurisdictionUnit } from '../../types';

interface TreeNode extends JurisdictionUnit {
  children: TreeNode[];
}

function buildTree(units: JurisdictionUnit[]): TreeNode[] {
  const byId = new Map<string, TreeNode>(units.map((u) => [u.id, { ...u, children: [] }]));
  const roots: TreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function TreeNodeRow({ node, depth, onAddChild }: { node: TreeNode; depth: number; onAddChild: (parent: TreeNode) => void }) {
  const [open, setOpen] = useState(depth < 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', paddingLeft: depth * 20 }}>
        {node.children.length > 0 ? (
          <button className="secondary" style={{ padding: '2px 8px' }} onClick={() => setOpen((o) => !o)}>
            {open ? '−' : '+'}
          </button>
        ) : (
          <span style={{ width: 26 }} />
        )}
        <span style={{ fontWeight: node.type === 'STATE' ? 600 : 400 }}>{node.name}</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{node.type}</span>
        {node.status === 'RETIRED' && <span className="pill inactive">Retired</span>}
        <button className="secondary" style={{ padding: '2px 8px', marginLeft: 'auto' }} onClick={() => onAddChild(node)}>
          + child
        </button>
      </div>
      {open && node.children.map((child) => (
        <TreeNodeRow key={child.id} node={child} depth={depth + 1} onAddChild={onAddChild} />
      ))}
    </div>
  );
}

/** Mirrors backend REQUIRED_PARENT_TYPE (jurisdiction-path.util.ts), inverted: parent type -> allowed child types. */
const ALLOWED_CHILD_TYPES: Record<TreeKind, Partial<Record<JurisdictionType, JurisdictionType[]>>> = {
  ADMINISTRATIVE: {
    STATE: ['DISTRICT'],
    DISTRICT: ['BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT'],
  },
  ELECTORAL: {
    STATE: ['PARLIAMENT_CONSTITUENCY'],
    PARLIAMENT_CONSTITUENCY: ['ASSEMBLY_CONSTITUENCY'],
  },
};

export default function JurisdictionTree() {
  const queryClient = useQueryClient();
  const [tree, setTree] = useState<TreeKind>('ADMINISTRATIVE');
  const { data: units, isLoading } = useQuery({
    queryKey: ['jurisdictions', tree],
    queryFn: () => jurisdictionsApi.list({ tree }),
  });

  const [addingUnder, setAddingUnder] = useState<TreeNode | 'root' | null>(null);
  const [newType, setNewType] = useState<JurisdictionType | ''>('');
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roots = useMemo(() => buildTree(units ?? []), [units]);

  const createMutation = useMutation({
    mutationFn: jurisdictionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jurisdictions', tree] });
      setAddingUnder(null);
      setNewType('');
      setNewName('');
      setError(null);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not create the jurisdiction unit.'),
  });

  const startAdd = (parent: TreeNode | 'root') => {
    setAddingUnder(parent);
    setNewType('');
    setNewName('');
    setError(null);
  };

  const availableTypes: JurisdictionType[] =
    addingUnder === 'root' ? ['STATE'] : addingUnder ? (ALLOWED_CHILD_TYPES[tree][addingUnder.type] ?? []) : [];

  const submit = () => {
    if (!newType || !newName) return;
    createMutation.mutate({
      tree,
      type: newType,
      name: newName,
      parentId: addingUnder === 'root' || !addingUnder ? undefined : addingUnder.id,
    });
  };

  return (
    <div>
      <h2>Jurisdictions</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Two independent trees, per the constitution — they only ever cross-reference through a post's jurisdiction rule, never merge.
      </p>

      <div className="checkbox-row" style={{ marginBottom: 16 }}>
        <button className={tree === 'ADMINISTRATIVE' ? 'primary' : 'secondary'} onClick={() => setTree('ADMINISTRATIVE')}>
          Administrative
        </button>
        <button className={tree === 'ELECTORAL' ? 'primary' : 'secondary'} onClick={() => setTree('ELECTORAL')}>
          Electoral
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <p>Loading…</p>
        ) : roots.length === 0 ? (
          <p>
            No {tree.toLowerCase()} tree yet.{' '}
            <button className="secondary" onClick={() => startAdd('root')}>
              Create the {tree === 'ADMINISTRATIVE' ? 'State' : 'State (electoral)'} root
            </button>
          </p>
        ) : (
          roots.map((root) => <TreeNodeRow key={root.id} node={root} depth={0} onAddChild={(n) => startAdd(n)} />)
        )}
      </div>

      {addingUnder && (
        <div className="card">
          <h3 style={{ fontSize: 15 }}>
            Add under {addingUnder === 'root' ? `(new ${tree.toLowerCase()} tree root)` : addingUnder.name}
          </h3>
          <div className="field">
            <label htmlFor="unit-type">Type</label>
            <select id="unit-type" value={newType} onChange={(e) => setNewType(e.target.value as JurisdictionType)}>
              <option value="">Select type</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="unit-name">Name</label>
            <input id="unit-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="primary" disabled={!newType || !newName || createMutation.isPending} onClick={submit}>
            Create
          </button>{' '}
          <button className="secondary" onClick={() => setAddingUnder(null)}>
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
