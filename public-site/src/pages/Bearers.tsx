import { useEffect, useMemo, useState } from 'react';
import { publicApi, type DirectoryEntry, type JurisdictionUnit, type Post } from '../api';
import Reveal from '../components/Reveal';

export default function Bearers() {
  const [entries, setEntries] = useState<DirectoryEntry[] | null>(null);
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [districts, setDistricts] = useState<JurisdictionUnit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [postFilter, setPostFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  useEffect(() => {
    Promise.all([publicApi.bearersDirectory(), publicApi.posts(), publicApi.jurisdictions('ADMINISTRATIVE')])
      .then(([directory, allPosts, administrativeUnits]) => {
        setEntries(directory);
        setPosts([...allPosts].sort((a, b) => a.rank - b.rank));
        setDistricts(administrativeUnits.filter((u) => u.type === 'DISTRICT' && u.status === 'ACTIVE'));
      })
      .catch(() => setLoadError('நிர்வாகிகள் பட்டியலை ஏற்ற முடியவில்லை. பக்கத்தை மீண்டும் ஏற்றவும்.'));
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    return entries.filter((e) => {
      const matchesPost = !postFilter || e.post.id === postFilter;
      // Administrative units (Block/Village/Municipality/...) carry the district
      // in their own `path`; electoral units (AC) carry it via the districtId
      // cross-reference instead — check both, same as the admin console does.
      const matchesDistrict =
        !districtFilter ||
        e.jurisdictions.some((j) => j.id === districtFilter || j.path.includes(districtFilter) || j.districtId === districtFilter);
      return matchesPost && matchesDistrict;
    });
  }, [entries, postFilter, districtFilter]);

  const grouped = useMemo(() => {
    if (!posts) return [];
    const byPost = new Map<string, DirectoryEntry[]>();
    filtered.forEach((e) => {
      const list = byPost.get(e.post.id) ?? [];
      list.push(e);
      byPost.set(e.post.id, list);
    });
    // Show every post that matches the current filter, even ones with no
    // one currently assigned — the org structure is real even when a post
    // is vacant, and a totally blank page reads as broken rather than empty.
    return posts
      .filter((p) => !postFilter || p.id === postFilter)
      .map((p) => ({ post: p, entries: byPost.get(p.id) ?? [] }));
  }, [filtered, posts, postFilter]);

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Office Bearers</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">நிர்வாகிகள் பட்டியல்</h1>
        <p className="text-gray-500 text-sm leading-relaxed">பொறுப்பு வரிசைப்படி (மாநிலம் → மாவட்டம் → ஒன்றியம்/நகரம்) நிர்வாகிகளைத் தேடலாம்.</p>
      </div>

      {loadError && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 text-center">{loadError}</p>}

      <Reveal className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 mb-8 grid sm:grid-cols-2 gap-4 transition-shadow duration-300 hover:shadow-md">
        <div>
          <label className="field-label" htmlFor="filter-post">பொறுப்பு</label>
          <select id="filter-post" className="field-input" value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
            <option value="">அனைத்தும்</option>
            {posts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="filter-district">மாவட்டம்</label>
          <select id="filter-district" className="field-input" value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)}>
            <option value="">அனைத்தும்</option>
            {districts?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </Reveal>

      {(entries === null || posts === null) && !loadError && <p className="text-center text-gray-400 text-sm">ஏற்றுகிறது…</p>}

      {entries !== null && posts !== null && grouped.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm">
          பொருந்தக்கூடிய நிர்வாகிகள் இல்லை.
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(({ post, entries: postEntries }, i) => (
          <Reveal key={post.id} delayMs={(i % 5) * 80}>
            <div>
              <h2 className="text-lg font-bold text-blue-950 mb-3">{post.name}</h2>
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm divide-y divide-gray-100 overflow-hidden transition-shadow duration-300 hover:shadow-md">
                {postEntries.length === 0 ? (
                  <div className="px-5 py-3.5 text-sm text-gray-400">இதுவரை நியமிக்கப்படவில்லை</div>
                ) : (
                  postEntries.map((entry) => (
                    <div
                      key={entry.assignmentId}
                      className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 transition-colors duration-200 hover:bg-blue-50/60"
                    >
                      <span className="font-semibold text-gray-800">{entry.fullName}</span>
                      <span className="text-sm text-gray-500">{entry.jurisdictions.map((j) => j.name).join(', ') || '—'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
