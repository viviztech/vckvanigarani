import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const partyMenu = [
  { to: '/ideology', label: 'கொள்கைகள்' },
  { to: '/history', label: 'வரலாற்று மைல்கற்கள்' },
];

export default function SiteLayout() {
  const [partyOpen, setPartyOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobilePartyOpen, setMobilePartyOpen] = useState(false);
  const location = useLocation();
  const partyActive = partyMenu.some((item) => item.to === location.pathname);

  const closeAll = () => {
    setPartyOpen(false);
    setMobileOpen(false);
    setMobilePartyOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="grid grid-cols-2 h-2" aria-hidden="true">
        <span className="bg-blue-700"></span>
        <span className="bg-red-600"></span>
      </div>

      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between">
          <NavLink to="/" className="group flex items-center gap-2.5" onClick={closeAll}>
            <img
              src="/assets/vck-logo.png"
              alt="விசிக வணிகர் அணி இலச்சினை"
              className="h-10 w-10 rounded-full transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="text-lg md:text-xl font-bold text-blue-900">விசிக வணிகர் அணி</span>
          </NavLink>

          <div className="hidden md:flex md:items-center md:gap-1">
            <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              முகப்பு
            </NavLink>

            <div className="relative">
              <button
                type="button"
                className={`nav-link flex items-center gap-1 ${partyActive ? 'nav-link-active' : ''}`}
                onClick={() => setPartyOpen((v) => !v)}
                onBlur={() => setTimeout(() => setPartyOpen(false), 150)}
              >
                கட்சி
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${partyOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div className={`dropdown-panel ${partyOpen ? 'dropdown-panel-open' : 'dropdown-panel-closed'}`}>
                {partyMenu.map((item) => (
                  <NavLink key={item.to} to={item.to} className="dropdown-item" onClick={closeAll}>
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <NavLink to="/bearers" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              நிர்வாகிகள்
            </NavLink>

            <NavLink to="/news" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              செய்திகள்
            </NavLink>

            <NavLink to="/events" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
              நிகழ்வுகள்
            </NavLink>

            <NavLink to="/register" className="btn btn-primary ml-2">
              பதிவு செய்யவும்
            </NavLink>
          </div>

          <button
            type="button"
            className="md:hidden p-2 w-10 h-10 flex items-center justify-center text-gray-600 rounded-lg hover:bg-gray-100 transition-colors duration-200"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
          >
            <span className="sr-only">மெனுவைத் திற</span>
            <svg
              className={`w-6 h-6 transition-transform duration-300 ${mobileOpen ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* grid-rows 0fr->1fr trick: smooth height animation without knowing content height ahead of time. */}
        <div className={`md:hidden grid transition-[grid-template-rows] duration-300 ease-out ${mobileOpen ? 'grid-rows-[1fr] mt-3' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <ul className="flex flex-col gap-1 text-base font-medium">
              <li>
                <NavLink to="/" end className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors duration-200" onClick={closeAll}>
                  முகப்பு
                </NavLink>
              </li>
              <li>
                <button
                  type="button"
                  className="flex items-center justify-between w-full py-2 px-3 rounded hover:bg-gray-100 transition-colors duration-200"
                  onClick={() => setMobilePartyOpen((v) => !v)}
                >
                  <span>கட்சி</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-300 ${mobilePartyOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${mobilePartyOpen ? 'grid-rows-[1fr] mt-1' : 'grid-rows-[0fr]'}`}>
                  <ul className="overflow-hidden ml-4 space-y-1">
                    {partyMenu.map((item) => (
                      <li key={item.to}>
                        <NavLink to={item.to} className="block py-2 px-3 text-sm rounded hover:bg-gray-100 transition-colors duration-200" onClick={closeAll}>
                          {item.label}
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              <li>
                <NavLink to="/bearers" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors duration-200" onClick={closeAll}>
                  நிர்வாகிகள்
                </NavLink>
              </li>
              <li>
                <NavLink to="/news" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors duration-200" onClick={closeAll}>
                  செய்திகள்
                </NavLink>
              </li>
              <li>
                <NavLink to="/events" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors duration-200" onClick={closeAll}>
                  நிகழ்வுகள்
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/register"
                  className="block py-2 px-3 rounded bg-red-600 text-white font-semibold text-center hover:bg-red-700 transition-colors duration-200"
                  onClick={closeAll}
                >
                  பதிவு செய்யவும்
                </NavLink>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="bg-red-600 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 py-12 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold mb-3">விசிக வணிகர் அணி</h2>
            <p className="text-red-100 text-sm leading-relaxed max-w-md">
              விடுதலைச் சிறுத்தைகள் கட்சியின் வணிகர் அணி — உறுப்பினர்களை ஒன்றிணைத்து, அவர்களின் நலனுக்காகவும்
              அமைப்பின் வளர்ச்சிக்காகவும் செயல்படும் பிரிவு.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-bold mb-3">கட்சி</h4>
              <ul className="space-y-2 text-red-100">
                <li>
                  <NavLink to="/ideology" className="hover:text-white transition-colors duration-200">
                    கொள்கைகள்
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/history" className="hover:text-white transition-colors duration-200">
                    வரலாற்று மைல்கற்கள்
                  </NavLink>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-3">விரைவு இணைப்புகள்</h4>
              <ul className="space-y-2 text-red-100">
                <li>
                  <NavLink to="/bearers" className="hover:text-white transition-colors duration-200">
                    நிர்வாகிகள்
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/news" className="hover:text-white transition-colors duration-200">
                    செய்திகள்
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/events" className="hover:text-white transition-colors duration-200">
                    நிகழ்வுகள்
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/register" className="hover:text-white transition-colors duration-200">
                    பதிவு செய்யவும்
                  </NavLink>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/15 py-4 text-center text-xs text-red-100">
          விசிக வணிகர் அணி © {new Date().getFullYear()} — அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை
        </div>
      </footer>
    </div>
  );
}
