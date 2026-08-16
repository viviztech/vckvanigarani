import { Link } from 'react-router-dom';
import Reveal from '../components/Reveal';

const stateMembers = [
  { name: 'ந. செல்லத்துரை', role: 'முதன்மைச் செயலாளர்', photo: '/assets/members/member-from-pdf.webp' },
  { name: 'ந. செல்வராசு', role: 'மாநில ஒருங்கிணைப்பாளர்', photo: '/assets/members/selvarasu.webp' },
  { name: 'இரா. கலைவாணன்', role: 'மாநில நிதிச் செயலாளர்', photo: '/assets/members/ira-kalaivanan.webp' },
];

// Elected representatives — real names/constituencies are public factual
// information; wording below is ours, not copied from any source. MLA list
// reflects current results (2026) — only seats confirmed against the
// current results table are listed; unconfirmed seats were deliberately
// dropped rather than risk showing a stale name for a real elected official.
const electedMembers: { name: string; constituency: string; type: 'MP' | 'MLA'; photo?: string; portfolio?: string }[] = [
  { name: 'தொல். திருமாவளவன்', constituency: 'சிதம்பரம் தொகுதி', type: 'MP', photo: '/assets/members/thol-thirmavalavan.png' },
  { name: 'து. ரவிக்குமார்', constituency: 'விழுப்புரம் தொகுதி', type: 'MP', photo: '/assets/members/ravikumar.png' },
  { name: 'L.E. ஜோதிமணி', constituency: 'காட்டுமன்னார்கோவில் தொகுதி', type: 'MLA', photo: '/assets/members/jothimani.jpeg' },
  {
    name: 'வன்னி அரசு',
    constituency: 'திண்டிவனம் தொகுதி',
    type: 'MLA',
    portfolio: 'சமூக நீதித்துறை அமைச்சர்',
    photo: '/assets/members/vanniarasu.jpg',
  },
];

// Summarized in our own words — not a verbatim copy of any source's flag/emblem page.
const flagSymbols = [
  { title: 'நீலம்', description: 'ஒடுக்கப்பட்டோரின் உரிமைக் குரலைக் குறிக்கிறது.', photo: '/assets/blue.png' },
  { title: 'சிவப்பு', description: 'உழைக்கும் மக்களின் விடுதலையை வென்றெடுப்பதற்கான புரட்சிகர பாதையைக் குறிக்கிறது.', photo: '/assets/red.png' },
  {
    title: 'நட்சத்திரம்',
    description: 'ஐந்து முனை நட்சத்திரம் சமத்துவம், வறுமை ஒழிப்பு, பெண் விடுதலை, தமிழ்த் தேசியம், வல்லாதிக்க எதிர்ப்பு ஆகியவற்றைக் குறிக்கிறது.',
    photo: '/assets/star.png',
  },
  { title: 'சிறுத்தை', description: 'வீரத்தையும் அஞ்சாமையையும் குறிக்கிறது.', photo: '/assets/tiger.png' },
  { title: 'பானை', description: 'மனித குலத்தின் நாகரிக வளர்ச்சியின் அடையாளத்தைக் குறிக்கிறது.', photo: '/assets/paanai.png' },
];

type ElectedMember = (typeof electedMembers)[number];

function ElectedMemberCard({ member, delayMs }: { member: ElectedMember; delayMs: number }) {
  return (
    <Reveal delayMs={delayMs}>
      <article className="group relative overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm card-elegant">
        <span
          className={`absolute top-3 right-3 z-10 text-[10px] font-extrabold tracking-wider px-2 py-1 rounded-full ${
            member.type === 'MP' ? 'bg-red-600 text-white' : 'bg-blue-700 text-white'
          }`}
        >
          {member.type === 'MP' ? 'நாடாளுமன்றம்' : 'சட்டமன்றம்'}
        </span>
        {member.portfolio && (
          <span className="absolute top-3 left-3 z-10 text-[10px] font-extrabold tracking-wider px-2 py-1 rounded-full bg-amber-400 text-blue-950">
            அமைச்சர்
          </span>
        )}
        {member.photo ? (
          <div className="img-zoom aspect-[3/4] bg-gradient-to-br from-blue-50 to-gray-100">
            <img src={member.photo} alt={`${member.name} அவர்களின் புகைப்படம்`} loading="lazy" className="w-full h-full object-cover object-center" />
          </div>
        ) : (
          <div className="aspect-[3/4] bg-gradient-to-br from-blue-50 to-gray-100 grid place-items-center text-blue-300">
            <svg viewBox="0 0 80 80" fill="none" aria-hidden="true" className="w-20 h-20">
              <circle cx="40" cy="29" r="14" fill="currentColor" />
              <path d="M15 70c2.1-14 11.4-22 25-22s22.9 8 25 22" fill="currentColor" />
            </svg>
          </div>
        )}
        <div className="p-4 bg-blue-950 text-white">
          <h3 className="font-bold text-base">{member.name}</h3>
          <p className="text-blue-200 text-xs font-semibold mt-1">{member.constituency}</p>
          {member.portfolio && <p className="text-amber-300 text-xs font-bold mt-1.5">{member.portfolio}</p>}
        </div>
      </article>
    </Reveal>
  );
}

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden bg-blue-950">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <Reveal className="text-white">
            <p className="flex items-center gap-3 text-xs font-bold tracking-wider text-blue-200 mb-5">
              <span className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-red-500 rounded" />
              விடுதலைச் சிறுத்தைகள் கட்சி · வணிகர் அணி
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              வணிகர் அணியில் <span className="text-blue-300">இணையுங்கள்.</span>
            </h1>
            <p className="text-blue-100 text-base leading-relaxed mb-8 max-w-lg">
              அதிகாரப்பூர்வ தகவல்கள், அறிவிப்புகள் மற்றும் மாநில நிர்வாகிகள் விபரங்களை ஒரே இடத்தில் வழங்கும் எங்கள்
              இணையதளத்திற்கு வரவேற்கிறோம். உறுப்பினராக இணைந்து எங்களுடன் கைகோர்க்கவும்.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/register" className="btn btn-primary">
                உறுப்பினராக பதிவு செய்யவும்
              </Link>
              <Link to="/bearers" className="btn btn-outline">
                நிர்வாகிகள் பட்டியல்
              </Link>
            </div>
          </Reveal>

          <Reveal delayMs={150} className="relative flex justify-center">
            <div className="w-full max-w-sm aspect-[1.48] rounded-3xl border-4 border-white/90 shadow-2xl overflow-hidden rotate-3 transition-transform duration-700 hover:rotate-0 hover:scale-[1.03]">
              <img src="/assets/flag.png" alt="விடுதலைச் சிறுத்தைகள் கட்சிக் கொடி" className="w-full h-full object-cover" />
            </div>
          </Reveal>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4">
        <Reveal delayMs={250} className="relative z-10 -mt-8">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-6 py-5 flex flex-wrap items-center gap-4 justify-between transition-shadow duration-500 hover:shadow-2xl">
            <div className="flex items-center gap-4">
              <span className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 grid place-items-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <div>
                <p className="font-bold text-blue-950">உறுப்பினர் பதிவு தொடங்கியுள்ளது</p>
                <p className="text-sm text-gray-500">உங்கள் விவரங்களை சமர்ப்பிக்கவும் — நிர்வாகி உறுதிப்படுத்திய பின் உறுப்பினர் எண் வழங்கப்படும்</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-gray-400 hidden md:block">www.vckvanigarani.com</span>
          </div>
        </Reveal>
      </div>

      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 md:py-10 grid md:grid-cols-2 items-center gap-0 md:gap-8">
          <Reveal className="relative z-10 bg-gray-100 rounded-3xl p-8 md:p-10 md:mr-[-40px] shadow-lg">
            <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">About</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-5">விசிக பற்றி</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">
              சாதி ஒழிப்பு, சமூக நீதி, மதச்சார்பின்மை ஆகிய அடித்தளங்களில் நின்று, உழைக்கும் மக்களின் பொருளாதார
              மற்றும் அரசியல் உரிமைகளுக்காக பாடுபடும் தமிழ்நாட்டின் நிலைத்த அரசியல் இயக்கமாக விசிக செயல்படுகிறது.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed">
              ஒடுக்கப்பட்ட மற்றும் விளிம்புநிலை மக்களை அரசியல் பொது நீரோட்டத்தில் இணைத்து, அனைவரையும் ஒன்றிணைத்து
              சமூக ரீதியாக அதிகாரம் மிக்க மக்களாக மாற்றுவதே இதன் நோக்கம்.
            </p>
          </Reveal>
          <Reveal delayMs={150} className="relative">
            <img src="/assets/thiruma.jpg" alt="விசிக தலைமை" loading="lazy" className="w-full rounded-3xl shadow-xl" />
          </Reveal>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Elected Representatives</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-blue-950">நாடாளுமன்ற உறுப்பினர்கள் மற்றும் சட்டமன்ற உறுப்பினர்கள்</h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {electedMembers.map((member, i) => (
            <ElectedMemberCard key={member.name} member={member} delayMs={i * 90} />
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 items-end gap-8 mb-8">
          <div>
            <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">State Office Bearers</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-blue-950">மாநில நிர்வாகிகள்</h2>
          </div>
          <p className="text-gray-500 text-sm leading-relaxed">
            விசிக வணிகர் அணியின் மாநில நிர்வாகிகள் மற்றும் அவர்களின் பொறுப்பு விவரங்கள். முழு நிர்வாகிகள் பட்டியலை{' '}
            <Link to="/bearers" className="text-blue-700 font-semibold hover:underline">
              இங்கே காணலாம்
            </Link>
            .
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {stateMembers.map((member, i) => (
            <Reveal key={member.name} delayMs={i * 120}>
              <article className="group relative overflow-hidden bg-white border border-gray-100 rounded-2xl shadow-sm card-elegant">
                <div className="img-zoom aspect-[3/4] bg-gradient-to-br from-blue-50 to-gray-100">
                  <img
                    src={member.photo}
                    alt={`${member.name} அவர்களின் புகைப்படம்`}
                    loading="eager"
                    className="w-full h-full object-cover object-center"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-blue-950 text-lg group-hover:text-red-600 transition-colors duration-300">{member.name}</h3>
                  <p className="text-blue-700 text-xs font-bold mt-1">{member.role}</p>
                </div>
                <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 to-red-600 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Our Emblem</span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-blue-950">நமது கொடியின் வண்ணங்கள், நமது கட்சியின் சின்னம்</h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {flagSymbols.map((symbol, i) => (
              <Reveal key={symbol.title} delayMs={(i % 5) * 80}>
                <div className="group card-elegant bg-white border border-gray-100 rounded-2xl shadow-sm p-6 h-full text-center">
                  <div className="img-zoom w-20 h-20 mx-auto mb-4 rounded-full bg-gray-50 grid place-items-center overflow-hidden">
                    <img src={symbol.photo} alt={symbol.title} loading="lazy" className="w-full h-full object-contain p-2" />
                  </div>
                  <h3 className="text-lg font-bold text-blue-950 mb-2 group-hover:text-red-600 transition-colors duration-300">{symbol.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{symbol.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
