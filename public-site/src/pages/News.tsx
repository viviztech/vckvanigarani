import { useEffect, useState } from 'react';
import { publicApi, type NewsItem } from '../api';
import Reveal from '../components/Reveal';

function excerpt(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ta-IN', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function News() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    publicApi
      .news()
      .then(setItems)
      .catch(() => setLoadError('செய்திகளை ஏற்ற முடியவில்லை. பக்கத்தை மீண்டும் ஏற்றவும்.'));
  }, []);

  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">News</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">செய்திகள்</h1>
        <p className="text-gray-500 text-sm leading-relaxed">விசிக வணிகர் அணியின் அறிவிப்புகளும் அண்மைச் செய்திகளும்.</p>
      </div>

      {loadError && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 text-center">{loadError}</p>}

      {items === null && !loadError && <p className="text-center text-gray-400 text-sm">ஏற்றுகிறது…</p>}

      {items !== null && items.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm">
          தற்போது செய்திகள் இல்லை.
        </div>
      )}

      <div className="space-y-5">
        {items?.map((item, i) => {
          const open = openId === item.id;
          return (
            <Reveal key={item.id} delayMs={(i % 5) * 80}>
              <article className="card-elegant bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
                <p className="text-xs font-bold text-blue-700 mb-1.5">{formatDate(item.publishedAt)}</p>
                <h2 className="text-lg font-bold text-blue-950 mb-2">{item.title}</h2>
                {open ? (
                  <div className="text-sm text-gray-600 leading-relaxed prose-sm" dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                ) : (
                  <p className="text-sm text-gray-500 leading-relaxed">{excerpt(item.bodyHtml)}</p>
                )}
                <button
                  type="button"
                  className="mt-3 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors duration-200"
                  onClick={() => setOpenId(open ? null : item.id)}
                >
                  {open ? 'குறைவாகக் காட்டு' : 'மேலும் படிக்க'}
                </button>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
