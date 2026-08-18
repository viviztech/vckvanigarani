import { useEffect, useMemo, useState } from 'react';
import { ApiError, publicApi, type JurisdictionUnit } from '../api';
import Reveal from '../components/Reveal';

const HOME_ADMIN_TYPES = ['BLOCK', 'MUNICIPALITY', 'TOWN_PANCHAYAT'];

export default function Register() {
  const [administrativeUnits, setAdministrativeUnits] = useState<JurisdictionUnit[] | null>(null);
  const [electoralUnits, setElectoralUnits] = useState<JurisdictionUnit[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([publicApi.jurisdictions('ADMINISTRATIVE'), publicApi.jurisdictions('ELECTORAL')])
      .then(([admin, electoral]) => {
        setAdministrativeUnits(admin);
        setElectoralUnits(electoral);
      })
      .catch(() => setLoadError('தொகுதி தரவை ஏற்ற முடியவில்லை. பக்கத்தை மீண்டும் ஏற்றவும்.'));
  }, []);

  // --- personal details ---
  const [fullName, setFullName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [idProofRef, setIdProofRef] = useState('');

  // --- home address: one linear chain, same narrowing as the admin console ---
  const [homeDistrictId, setHomeDistrictId] = useState('');
  const [homeAcId, setHomeAcId] = useState('');
  const [homeAdminUnitId, setHomeAdminUnitId] = useState('');
  const [homeVillageId, setHomeVillageId] = useState('');
  const [habitationOrStreet, setHabitationOrStreet] = useState('');
  const [address, setAddress] = useState('');

  const homeDistrictOptions = useMemo(
    () => administrativeUnits?.filter((u) => u.type === 'DISTRICT' && u.status === 'ACTIVE') ?? [],
    [administrativeUnits],
  );
  const homeAcOptions = useMemo(
    () =>
      electoralUnits?.filter((u) => u.type === 'ASSEMBLY_CONSTITUENCY' && u.districtId === homeDistrictId && u.status === 'ACTIVE') ?? [],
    [electoralUnits, homeDistrictId],
  );
  const selectedHomeAc = useMemo(() => electoralUnits?.find((u) => u.id === homeAcId), [electoralUnits, homeAcId]);
  const derivedHomePc = useMemo(() => electoralUnits?.find((u) => u.id === selectedHomeAc?.parentId), [electoralUnits, selectedHomeAc]);
  const homeAdminUnitOptions = useMemo(
    () =>
      administrativeUnits?.filter((u) => u.parentId === homeDistrictId && HOME_ADMIN_TYPES.includes(u.type) && u.status === 'ACTIVE') ?? [],
    [administrativeUnits, homeDistrictId],
  );
  const selectedHomeAdminUnit = useMemo(() => administrativeUnits?.find((u) => u.id === homeAdminUnitId), [administrativeUnits, homeAdminUnitId]);
  const homeVillageOptions = useMemo(
    () =>
      selectedHomeAdminUnit?.type === 'BLOCK'
        ? (administrativeUnits?.filter((u) => u.parentId === homeAdminUnitId && u.type === 'VILLAGE' && u.status === 'ACTIVE') ?? [])
        : [],
    [administrativeUnits, homeAdminUnitId, selectedHomeAdminUnit],
  );

  useEffect(() => setHomeAcId(''), [homeDistrictId]);
  useEffect(() => setHomeAdminUnitId(''), [homeAcId]);
  useEffect(() => setHomeVillageId(''), [homeAdminUnitId]);

  const homeAdministrativeUnitId = homeVillageId || homeAdminUnitId;

  // --- OTP ---
  const [otpSent, setOtpSent] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const sendOtp = async () => {
    setOtpError(null);
    setOtpSending(true);
    try {
      await publicApi.requestOtp(email);
      setOtpSent(true);
    } catch (err) {
      setOtpError(err instanceof ApiError ? err.message : 'குறியீட்டை அனுப்ப முடியவில்லை.');
    } finally {
      setOtpSending(false);
    }
  };

  // --- submit ---
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const canSubmit =
    fullName &&
    fatherOrHusbandName &&
    phone.length === 10 &&
    email &&
    address &&
    habitationOrStreet &&
    idProofRef &&
    homeDistrictId &&
    otpSent &&
    code.length === 6;

  const submit = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await publicApi.register({
        fullName,
        fatherOrHusbandName,
        phone: `+91${phone}`,
        email,
        code,
        address,
        habitationOrStreet,
        idProofRef,
        homeDistrictId,
        homeAdministrativeUnitId: homeAdministrativeUnitId || undefined,
        homeElectoralUnitId: homeAcId || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'பதிவை சமர்ப்பிக்க முடியவில்லை.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-16 px-4">
        <Reveal className="max-w-xl mx-auto">
          <div className="bg-white border border-gray-100 rounded-3xl shadow-xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-blue-600 to-red-600 text-white grid place-items-center animate-[pulse_2s_ease-in-out_infinite]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-blue-950 mb-3">பதிவு சமர்ப்பிக்கப்பட்டது</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              உங்கள் விவரங்களைப் பெற்றுள்ளோம். ஒரு நிர்வாகி அவற்றை சரிபார்த்து உறுதிப்படுத்திய பிறகு, உங்கள் உறுப்பினர்
              எண் வழங்கப்படும்.
            </p>
          </div>
        </Reveal>
      </section>
    );
  }

  return (
    <section className="py-14 px-4">
      <Reveal className="max-w-xl mx-auto bg-white border border-gray-100 rounded-3xl shadow-xl p-6 md:p-10">
        <h1 className="text-2xl md:text-3xl font-extrabold text-blue-950 mb-2">உறுப்பினர் பதிவு</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-7">
          கீழே உள்ள விவரங்களை நிரப்பி சமர்ப்பிக்கவும். ஒரு நிர்வாகி உறுதிப்படுத்திய பின் உங்கள் உறுப்பினர் எண்
          வழங்கப்படும்.
        </p>

        {loadError && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{loadError}</p>}

        <div className="mb-4">
          <label className="field-label" htmlFor="r-name">பெயர் (Name)</label>
          <input id="r-name" className="field-input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="field-label" htmlFor="r-father">தந்தை/கணவர் பெயர் (Father / Husband Name)</label>
          <input id="r-father" className="field-input" value={fatherOrHusbandName} onChange={(e) => setFatherOrHusbandName(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-phone">கைபேசி எண் (Mobile Number)</label>
          <div className="flex items-stretch w-full min-h-[46px] rounded-xl border border-gray-200 overflow-hidden transition-all duration-200 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600">
            <span className="flex items-center px-3 text-sm text-gray-500 bg-gray-50 border-r border-gray-200 select-none">+91</span>
            <input
              id="r-phone"
              className="flex-1 min-w-0 px-3 text-sm text-gray-900 focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              placeholder="XXXXXXXXXX"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-email">மின்னஞ்சல் (Email)</label>
          <div className="grid grid-cols-[1fr_auto] gap-2.5">
            <input
              id="r-email"
              className="field-input"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOtpSent(false);
                setCode('');
              }}
              placeholder="you@example.com"
            />
            <button
              type="button"
              className="btn border border-blue-700 text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
              disabled={!email || otpSending}
              onClick={sendOtp}
            >
              {otpSent ? 'மீண்டும் அனுப்பு' : 'குறியீடு அனுப்பு'}
            </button>
          </div>
          {otpError && <p className="text-xs text-red-600 mt-1.5">{otpError}</p>}
        </div>

        {otpSent && (
          <div className="mb-4">
            <label className="field-label" htmlFor="r-code">6-இலக்க குறியீடு (OTP)</label>
            <input id="r-code" className="field-input" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} inputMode="numeric" />
          </div>
        )}

        <div className="mb-4">
          <label className="field-label">மாநிலம் (State)</label>
          <input className="field-input bg-gray-50 text-gray-500" value="Tamil Nadu" disabled />
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-district">மாவட்டம் (District) *</label>
          <select id="r-district" className="field-input" value={homeDistrictId} onChange={(e) => setHomeDistrictId(e.target.value)}>
            <option value="">தேர்வு செய்யவும்…</option>
            {homeDistrictOptions.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {homeDistrictId && (
          <div className="mb-4">
            <label className="field-label" htmlFor="r-ac">சட்டமன்ற தொகுதி (Assembly Constituency)</label>
            <select id="r-ac" className="field-input" value={homeAcId} onChange={(e) => setHomeAcId(e.target.value)}>
              <option value="">தேர்வு செய்யவும்…</option>
              {homeAcOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {homeAcId && (
          <div className="mb-4">
            <label className="field-label">பாராளுமன்ற தொகுதி (Parliament Constituency)</label>
            <input className="field-input bg-gray-50 text-gray-500" value={derivedHomePc?.name ?? ''} disabled />
          </div>
        )}

        {homeAcId && (
          <div className="mb-4">
            <label className="field-label" htmlFor="r-admin">ஒன்றியம்/பேரூராட்சி/நகரம்/மாநகரம்</label>
            <select id="r-admin" className="field-input" value={homeAdminUnitId} onChange={(e) => setHomeAdminUnitId(e.target.value)}>
              <option value="">தேர்வு செய்யவும்…</option>
              {homeAdminUnitOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {homeAdminUnitId && selectedHomeAdminUnit?.type === 'BLOCK' && (
          <div className="mb-4">
            <label className="field-label" htmlFor="r-village">கிராமம் (Village)</label>
            <select id="r-village" className="field-input" value={homeVillageId} onChange={(e) => setHomeVillageId(e.target.value)}>
              <option value="">தேர்வு செய்யவும்…</option>
              {homeVillageOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="field-label" htmlFor="r-habitation">ஊர்/பகுதி/தெரு (Habitation/Place/Street)</label>
          <input id="r-habitation" className="field-input" value={habitationOrStreet} onChange={(e) => setHabitationOrStreet(e.target.value)} />
        </div>
        <div className="mb-4">
          <label className="field-label" htmlFor="r-address">முகவரி (Address)</label>
          <input id="r-address" className="field-input" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="field-label" htmlFor="r-idproof">வாக்காளர் அட்டை எண் (Voter ID Number)</label>
          <input id="r-idproof" className="field-input" value={idProofRef} onChange={(e) => setIdProofRef(e.target.value)} />
        </div>

        <p className="text-xs text-gray-400 mb-4">
          உறுப்பினர் எண் தானாக உருவாக்கப்படும். ஒரு நிர்வாகி உறுதிப்படுத்திய பின் அது வழங்கப்படும்.
        </p>

        {submitError && <p className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 mb-4">{submitError}</p>}

        <button
          type="button"
          className="btn btn-primary w-full justify-center disabled:opacity-50"
          disabled={!canSubmit || submitting}
          onClick={submit}
        >
          சமர்ப்பிக்கவும்
        </button>
      </Reveal>
    </section>
  );
}
