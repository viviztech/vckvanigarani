import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { newsApi } from '../../services/news';
import { jurisdictionsApi } from '../../services/jurisdictions';
import { ApiError } from '../../services/api-client';

/** FR-001/FR-002/FR-004: Super-Admin-only composer — draft freely, publish explicitly (T013). */
export default function PostComposer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const queryClient = useQueryClient();

  const [postId, setPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [targetEveryone, setTargetEveryone] = useState(true);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [StarterKit, Link, Image],
    content: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['news', 'edit', editId],
    queryFn: () => newsApi.getForEdit(editId!),
    enabled: Boolean(editId),
  });

  const { data: jurisdictions } = useQuery({ queryKey: ['jurisdictions', 'all'], queryFn: () => jurisdictionsApi.list() });
  const activeJurisdictions = jurisdictions?.filter((u) => u.status === 'ACTIVE') ?? [];

  useEffect(() => {
    if (!existing || !editor) return;
    setPostId(existing.id);
    setTitle(existing.title);
    setTargetEveryone(existing.targetEveryone);
    setSelectedUnitIds(existing.jurisdictions.map((j) => j.jurisdictionUnit.id));
    setStatus(existing.status);
    editor.commands.setContent(existing.bodyHtml);
  }, [existing, editor]);

  const resetForm = () => {
    setPostId(null);
    setTitle('');
    setTargetEveryone(true);
    setSelectedUnitIds([]);
    setStatus(null);
    editor?.commands.setContent('');
    setSearchParams({});
  };

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) => (prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]));
  };

  const currentInput = () => ({
    title,
    bodyHtml: editor?.getHTML() ?? '',
    targetEveryone,
    jurisdictionUnitIds: targetEveryone ? undefined : selectedUnitIds,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const input = currentInput();
      return postId ? newsApi.update(postId, input) : newsApi.create(input);
    },
    onSuccess: (post) => {
      setPostId(post.id);
      setStatus(post.status);
      setMessage('Draft saved.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['news', 'drafts'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not save the draft.'),
  });

  const publishMutation = useMutation({
    mutationFn: async () => {
      const id = postId ?? (await newsApi.create(currentInput())).id;
      if (!postId) setPostId(id);
      return newsApi.publish(id);
    },
    onSuccess: (post) => {
      setStatus(post.status);
      setMessage('Published — bearers in scope are being notified.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['news', 'drafts'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Could not publish this post.'),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => newsApi.unpublish(postId!),
    onSuccess: (post) => {
      setStatus(post.status);
      setMessage('Unpublished — removed from feeds going forward.');
    },
  });

  const republishMutation = useMutation({
    mutationFn: () => newsApi.republish(postId!),
    onSuccess: (post) => {
      setStatus(post.status);
      setMessage('Republished (no new notification sent).');
    },
  });

  const canSave = title.trim().length >= 2 && (targetEveryone || selectedUnitIds.length > 0);

  return (
    <div>
      <h2>Post Composer</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
        Drafts can be edited freely with no notification sent — publishing is the one action that notifies bearers in
        scope, and only happens once per draft.
      </p>

      {status && (
        <p>
          Status: <span className="pill">{status}</span>
          {postId && (
            <button className="secondary" style={{ marginLeft: 12 }} onClick={resetForm}>
              New post
            </button>
          )}
        </p>
      )}

      <div className="card">
        <div className="field">
          <label htmlFor="n-title">Title</label>
          <input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="field">
          <label>Body</label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 4, padding: 8, minHeight: 160 }}>
            <EditorContent editor={editor} />
          </div>
        </div>

        <div className="field">
          <label className="checkbox-row">
            <input type="checkbox" checked={targetEveryone} onChange={(e) => setTargetEveryone(e.target.checked)} />
            Target everyone
          </label>
        </div>

        {!targetEveryone && (
          <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 4, padding: 8 }}>
            {activeJurisdictions.map((unit) => (
              <label className="checkbox-row" key={unit.id}>
                <input type="checkbox" checked={selectedUnitIds.includes(unit.id)} onChange={() => toggleUnit(unit.id)} />
                {unit.name} <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>({unit.type})</span>
              </label>
            ))}
            {activeJurisdictions.length === 0 && <p style={{ fontSize: 13 }}>No jurisdiction units available.</p>}
          </div>
        )}

        {error && <p className="error-text">{error}</p>}
        {message && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{message}</p>}

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button className="secondary" disabled={!canSave || saveMutation.isPending} onClick={() => saveMutation.mutate()}>
            Save draft
          </button>
          {status !== 'PUBLISHED' && (
            <button className="primary" disabled={!canSave || publishMutation.isPending} onClick={() => publishMutation.mutate()}>
              {status === 'UNPUBLISHED' ? 'Publish as new' : 'Publish'}
            </button>
          )}
          {status === 'PUBLISHED' && (
            <button className="secondary" disabled={unpublishMutation.isPending} onClick={() => unpublishMutation.mutate()}>
              Unpublish
            </button>
          )}
          {status === 'UNPUBLISHED' && (
            <button className="secondary" disabled={republishMutation.isPending} onClick={() => republishMutation.mutate()}>
              Republish (no new notification)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
