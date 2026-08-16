import Reveal from '../components/Reveal';

// Summarized in our own words from the party's published history timeline —
// not a verbatim copy of that page's text.
const timeline: { year: string; description: string; photo: string }[] = [
  { year: '1972', description: 'மகாராஷ்டிராவில் J.V. பவார், நம்தியோ தாசர், ராஜா தாலே ஆகியோரால் தலித் பேந்தர்ஸ் இயக்கம் தொடங்கப்பட்டது.', photo: '/assets/history/1.jpg' },
  { year: '1977', description: 'தலித் பேந்தர்ஸ் இயக்கத்திலிருந்து பிரிந்து ஒரு தனிக் குழு புதிதாக உருவானது.', photo: '/assets/history/2.jpg' },
  { year: '1982', description: 'தலித் பேந்தர்ஸ் இயக்கத்தின் தமிழ்நாடு கிளை A. மாலைச்சாமியால் தொடங்கப்பட்டது.', photo: '/assets/history/3.jpg' },
  { year: '1988', description: 'இரா. திருமாவளவன், அரசு தடயவியல் அதிகாரியாகப் பணிபுரிந்த காலத்தில் A. மாலைச்சாமியுடன் முதன்முறையாக இணைந்தார்.', photo: '/assets/history/4.jpg' },
  { year: '1989', description: 'இயக்கத் தொடக்க காலத் தலைவர் A. மாலைச்சாமி மறைந்தார்.', photo: '/assets/history/5.jpg' },
  { year: '1990', description: 'திருமாவளவன் இயக்கத் தலைவராகப் பொறுப்பேற்றார்; இயக்கம் "விடுதலைச் சிறுத்தைகள்" என பெயர் மாற்றப்பட்டது.', photo: '/assets/history/6.jpg' },
  { year: '1999', description: 'கட்சி முதன்முறையாக நாடாளுமன்றத் தேர்தலில் போட்டியிட்டது — சிதம்பரம் தொகுதியில் திருமாவளவன் இரண்டாமிடம் பிடித்தார்.', photo: '/assets/history/7.jpg' },
  { year: '2001', description: 'திருமாவளவன் தமிழ்நாடு சட்டப்பேரவைத் தேர்தலில் மங்களூர் தொகுதியில் வெற்றி பெற்று முதன்முறையாக சட்டமன்ற உறுப்பினரானார்.', photo: '/assets/history/8.jpg' },
  { year: '2002', description: 'மாநிலத்தின் மத மாற்றத் தடைச் சட்டத்தை எதிர்த்து இயக்கத்தினர் தமிழ்ப் பெயர்களை ஏற்றுக்கொண்டனர்.', photo: '/assets/history/9.jpg' },
  { year: '2004', description: 'கட்சித் தலைவர் சட்டமன்ற உறுப்பினர் பதவியிலிருந்து விலகினார்.', photo: '/assets/history/10.jpg' },
  { year: '2006', description: 'சட்டப்பேரவைத் தேர்தலில் அதிமுக கூட்டணியில் இரண்டு இடங்களில் கட்சி வெற்றி பெற்றது.', photo: '/assets/history/11.jpg' },
  { year: '2009', description: 'திமுக கூட்டணியில் சிதம்பரம் நாடாளுமன்றத் தொகுதியில் திருமாவளவன் பெரும் வாக்கு வித்தியாசத்தில் வெற்றி பெற்றார்.', photo: '/assets/history/12.jpg' },
  { year: '2013', description: 'ஆந்திரப் பிரதேசத்தில் கட்சியின் கிளை தொடங்கப்பட்டது.', photo: '/assets/history/13.jpg' },
  { year: '2016', description: 'கட்சியின் சொந்த தொலைக்காட்சி சேவை தொடங்கப்பட்டது.', photo: '/assets/history/14.jpg' },
  { year: '2018', description: 'கட்சித் தலைவரால் எழுதப்பட்ட ஒரு நூல் வெளியிடப்பட்டது.', photo: '/assets/history/15.jpg' },
  { year: '2019', description: 'நாடாளுமன்றப் பொதுத் தேர்தலில் மதசார்பற்ற முற்போக்குக் கூட்டணியில் இரண்டு இடங்களில் கட்சி வெற்றி பெற்றது.', photo: '/assets/history/16.jpg' },
  { year: '2020', description: 'மனுதர்ம சாஸ்திரத்தைத் தடை செய்யக் கோரி தமிழகம் முழுவதும் கட்சி ஆர்ப்பாட்டங்களை நடத்தியது.', photo: '/assets/history/17.jpg' },
  { year: '2021', description: 'சட்டப்பேரவைத் தேர்தலில் திமுக கூட்டணியில் நான்கு தொகுதிகளில் கட்சி வெற்றி பெற்றது.', photo: '/assets/history/18.jpg' },
  {
    year: '2024',
    description:
      'நாடாளுமன்றத் தேர்தலில் மீண்டும் இரண்டு இடங்களில் வெற்றி பெற்றது; தொடர்ச்சியான தேர்தல் வெற்றிகளுக்குப் பிறகு இந்தியத் தேர்தல் ஆணையம் கட்சியை தமிழ்நாட்டின் அங்கீகரிக்கப்பட்ட மாநிலக் கட்சியாக அறிவித்தது.',
    photo: '/assets/history/19.jpg',
  },
];

export default function History() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="block text-xs font-extrabold tracking-wider text-red-600 uppercase mb-2">History</span>
        <h1 className="text-3xl md:text-4xl font-extrabold text-blue-950 mb-4">வரலாற்று மைல்கற்கள்</h1>
        <p className="text-gray-500 text-sm leading-relaxed">1972 முதல் விடுதலைச் சிறுத்தைகள் கட்சியின் வளர்ச்சிப் பயணத்தில் முக்கியக் கட்டங்கள்.</p>
      </div>

      <ol className="relative border-l-2 border-gray-100 ml-3 sm:ml-4">
        {timeline.map((entry, i) => (
          <Reveal key={entry.year} delayMs={(i % 6) * 70}>
            <li className="mb-10 ml-7 sm:ml-10 list-none">
              <span className="absolute -left-[9px] sm:-left-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-red-600 border-4 border-white shadow" style={{ marginTop: 14 }} />
              <div className="group bg-white border border-gray-100 rounded-3xl shadow-sm p-4 sm:p-5 flex gap-5 items-center card-elegant">
                <div className="img-zoom w-28 h-28 sm:w-36 sm:h-36 rounded-2xl flex-shrink-0 shadow-md">
                  <img src={entry.photo} alt={`${entry.year} ஆண்டு நிகழ்வு`} loading="lazy" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-blue-950 group-hover:text-red-600 transition-colors duration-300">
                    {entry.year}
                  </h3>
                  <p className="text-sm sm:text-[15px] text-gray-500 leading-relaxed mt-1.5">{entry.description}</p>
                </div>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
