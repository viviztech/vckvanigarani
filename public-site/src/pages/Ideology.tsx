import Reveal from '../components/Reveal';

// Summarized in our own words from the party's published ideology page —
// not a verbatim copy of that page's essay text.
const pillars: { title: string; description: string }[] = [
  {
    title: 'சாதி ஒழிப்பு',
    description:
      'இந்து சாதிய அடுக்கு முறையையும் தீண்டாமையையும் முற்றிலும் வேரறுக்க அம்பேத்கரின் "கற்பி, ஒன்று சேர், போராடு" எனும் நெறியைப் பின்பற்றுதல்.',
  },
  {
    title: 'சமூக நீதி மற்றும் சமத்துவம்',
    description:
      'தலித்துகள், பழங்குடியினர், பிற்படுத்தப்பட்டோர், சிறுபான்மையினர் என அனைத்து விளிம்புநிலை மக்களின் சமூக, பொருளாதார, அரசியல் உரிமைகளுக்காகப் போராடுதல்.',
  },
  {
    title: 'பகுத்தறிவு மற்றும் சுயமரியாதை',
    description:
      'பெரியாரின் பகுத்தறிவுக் கொள்கைகளைப் பின்பற்றி, மூடநம்பிக்கைகளை நிராகரித்து, அறிவியல் மனப்பான்மை கொண்ட சுயமரியாதைச் சமூகத்தை உருவாக்குதல்.',
  },
  {
    title: 'உழைக்கும் மக்களின் விடுதலை',
    description:
      'சாதி, மொழி, மதம், பாலினம் என பல்வேறு காரணங்களால் ஒடுக்கப்பட்டு சிதறடிக்கப்பட்ட உழைக்கும் மக்களின் முழுமையான விடுதலைக்காகப் பாடுபடுதல்.',
  },
  {
    title: 'மண்ணுரிமை மற்றும் தொழிலாளர் நலன்',
    description:
      'நிலமற்ற விவசாயத் தொழிலாளர்களை சாதிய அடக்குமுறையிலிருந்து மீட்டு, அமைப்புசாராத் தொழிலாளர்களுக்கு நியாயமான ஊதியமும் அடிப்படை உரிமைகளும் பெற்றுத் தருதல்.',
  },
  {
    title: 'பெண் விடுதலை',
    description: 'பெண்களின் கல்வி, பொருளாதார சுதந்திரம், சமூக உரிமைகள் ஆகியவற்றை உறுதி செய்து, ஒடுக்குமுறைகளை எதிர்த்து முழுமையான பெண் விடுதலையை நிலைநாட்டுதல்.',
  },
  {
    title: 'மதச்சார்பின்மை',
    description: 'மதவாத அரசியலைத் தீர்க்கமாக எதிர்த்து, அரசியலமைப்புச் சட்டம் உறுதி செய்யும் மதச்சார்பின்மையையும் அனைவரின் சம உரிமையையும் நிலைநாட்டுதல்.',
  },
  {
    title: 'சனநாயகப் பாதுகாப்பு',
    description: 'சுதந்திரமான, நேர்மையான தேர்தல்கள் மூலம் மக்களால் தேர்ந்தெடுக்கப்படும் உண்மையான மக்களாட்சியை நிலைநாட்டுதல்.',
  },
  {
    title: 'தமிழ்த் தேசியம்',
    description: 'தமிழ் மக்களின் மொழி, பண்பாடு, கலாச்சார அடையாளங்களைப் பாதுகாத்து, சாதியற்ற சமத்துவ தமிழ்ச் சமுதாயத்தை உருவாக்குதல்.',
  },
];

const influences: { name: string; note: string; photo: string }[] = [
  { name: 'கௌதம புத்தர்', note: 'சடங்குகளுக்குப் பதிலாக அறமும் நல்லறமும் வழிபாட்டிற்குரியவை என போதித்த ஆதிகால புரட்சியாளர்.', photo: '/assets/images/buddha.jpg' },
  {
    name: 'டாக்டர் பி. ஆர். அம்பேத்கர்',
    note: 'இந்திய அரசியலமைப்புச் சட்டத்தின் தலைமைச் சிற்பியும், ஒடுக்கப்பட்ட மக்களின் உரிமைகளுக்காக வாழ்நாள் முழுவதும் போராடிய தலைவரும்.',
    photo: '/assets/images/ambedkar.jpg',
  },
  {
    name: 'தந்தை பெரியார்',
    note: 'சுயமரியாதை இயக்கத்தையும் திராவிடர் கழகத்தையும் தோற்றுவித்த, பகுத்தறிவையும் சமூக நீதியையும் முன்னெடுத்த சீர்திருத்தவாதி.',
    photo: '/assets/images/periyar.jpg',
  },
  {
    name: 'ரெட்டைமலை சீனிவாசன்',
    note: 'அம்பேத்கருக்கு முன்னோடியாக ஒடுக்கப்பட்டோரின் உரிமைகளுக்காகப் போராடிய, மெட்ராஸ் சட்ட மேலவை உறுப்பினராக இருந்த தலைவர்.',
    photo: '/assets/images/thatha.jpg',
  },
  {
    name: 'பண்டித அயோத்திதாசர்',
    note: 'தென்னிந்தியாவின் முதல் சாதி எதிர்ப்புப் போராளிகளில் ஒருவர், தமிழறிஞர், சமூக சீர்திருத்த எழுத்தாளர்.',
    photo: '/assets/images/pandithar.jpg',
  },
  {
    name: 'கார்ல் மார்க்ஸ்',
    note: 'வர்க்கப் போராட்டம் மற்றும் பொருளாதார சமத்துவம் குறித்த கோட்பாடுகளை முன்வைத்த சிந்தனையாளர், சமூகநீதி இயக்கங்களுக்கு அறிவுசார் அடித்தளமிட்டவர்.',
    photo: '/assets/images/marx.jpg',
  },
  {
    name: 'மேதகு பிரபாகரன்',
    note: 'தமிழீழ விடுதலைக்காக வாழ்நாள் முழுவதும் போராடிய, உலகத் தமிழர்களால் தமிழ்த் தேசியத் தலைவராகக் கருதப்படுபவர்.',
    photo: '/assets/images/prabakaran.jpg',
  },
];

export default function Ideology() {
  return (
    <section className="max-w-6xl mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Ideology</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">கட்சியின் பிரதான கொள்கைகள்</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          சாதி ஒழிப்பு, சமூக நீதி, பகுத்தறிவு ஆகியவற்றை அடிப்படையாகக் கொண்டு விடுதலைச் சிறுத்தைகள் கட்சி செயல்படும் முக்கியக் கொள்கைகள்.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-16">
        {pillars.map((point, i) => (
          <Reveal key={point.title} delayMs={(i % 3) * 90}>
            <div className="group bg-white border border-gray-100 rounded-2xl shadow-sm p-6 h-full card-elegant">
              <h3 className="text-lg font-bold text-blue-950 mb-2 group-hover:text-red-600 transition-colors duration-300">{point.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{point.description}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">Inspirations</span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-blue-950">கொள்கை ஆசான்கள்</h2>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {influences.map((person, i) => (
          <Reveal key={person.name} delayMs={(i % 3) * 90}>
            <div className="group bg-white border border-gray-100 rounded-2xl shadow-sm p-6 h-full flex gap-4 items-start card-elegant">
              <div className="img-zoom w-16 h-16 rounded-full flex-shrink-0 border-2 border-white shadow">
                <img src={person.photo} alt={person.name} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-700 mb-1.5">{person.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{person.note}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
