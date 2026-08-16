import { useEffect, useState } from 'react';
import { publicApi, type EventItem } from '../api';
import Reveal from '../components/Reveal';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ta-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat('en-IN').format(Math.round(n));
}

export default function Events() {
  const [items, setItems] = useState<EventItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    publicApi
      .events()
      .then(setItems)
      .catch(() => setLoadError('நிகழ்வுகளை ஏற்ற முடியவில்லை. பக்கத்தை மீண்டும் ஏற்றவும்.'));
  }, []);

  return (
    <section className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Events</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">நிகழ்வுகள்</h1>
        <p className="text-gray-500 text-sm leading-relaxed">விசிக வணிகர் அணியின் நிதிசேகரிப்பு நிகழ்வுகளும் இலக்கு முன்னேற்றமும்.</p>
      </div>

      {loadError && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-6 text-center">{loadError}</p>}

      {items === null && !loadError && <p className="text-center text-gray-400 text-sm">ஏற்றுகிறது…</p>}

      {items !== null && items.length === 0 && (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-12 text-center text-gray-400 text-sm">
          தற்போது நிகழ்வுகள் இல்லை.
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {items?.map((event, i) => {
          const pct = event.targetAmount ? Math.min(100, Math.round((event.raised / event.targetAmount) * 100)) : null;
          return (
            <Reveal key={event.id} delayMs={(i % 4) * 100}>
              <article className="group card-elegant bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden h-full flex flex-col">
                {event.bannerUrl && (
                  <div className="img-zoom h-40">
                    <img src={event.bannerUrl} alt={event.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${event.status === 'OPEN' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {event.status === 'OPEN' ? 'நடைபெறுகிறது' : 'நிறைவடைந்தது'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(event.openDate)} – {formatDate(event.closeDate)}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-blue-950 mb-2 group-hover:text-red-600 transition-colors duration-300">{event.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4 flex-1">{event.purpose}</p>

                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-lg font-extrabold text-blue-950">₹{formatAmount(event.raised)}</span>
                      {event.targetAmount && <span className="text-xs text-gray-400">இலக்கு ₹{formatAmount(event.targetAmount)}</span>}
                    </div>
                    {pct !== null && (
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-600 to-red-600 transition-all duration-1000 ease-elegant"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
