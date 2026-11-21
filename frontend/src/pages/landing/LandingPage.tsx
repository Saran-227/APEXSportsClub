import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './landing.css';

interface CourtItem {
  id: string;
  name: string;
  sport: string;
  category: 'racket' | 'team' | 'golf-pool';
  rate: number;
  badge: string;
  isPrime?: boolean;
  bgImage: string;
  specs: string;
  features: string[];
}

const COURTS_DATA: CourtItem[] = [
  {
    id: 'court-black-padel',
    name: 'COURT BLACK PADEL',
    sport: 'ARENA 01 • PADEL',
    category: 'racket',
    rate: 1400,
    badge: 'LIVE • OPEN',
    bgImage: '/assets/court-black-bg.jpg',
    specs: 'Matte black steel framework with 12mm anti-reflective panoramic glass. Mondo Supercourt XN turf for crisp trajectory and high contrast.',
    features: ['Panoramic Glass', 'Mondo Black Turf', '400W LED Pro'],
  },
  {
    id: 'pebble-beach-golf',
    name: 'PEBBLE BEACH GOLF BAY',
    sport: 'ARENA 02 • GOLF',
    category: 'golf-pool',
    rate: 2400,
    badge: 'TRACKMAN 4K',
    isPrime: true,
    bgImage: '/assets/court-golf.jpg',
    specs: 'Private high-definition simulator suite powered by TrackMan dual radar. 200+ championship courses, optical swing tracking, and real turf putting green.',
    features: ['Foresight Ultra 4K', 'Pebble Beach 18-Hole', 'TaylorMade Gear'],
  },
  {
    id: 'floodlit-cricket',
    name: 'FLOODLIT CRICKET ARENA',
    sport: 'ARENA 03 • CRICKET',
    category: 'team',
    rate: 1800,
    badge: 'FLOODLIT ARENA',
    bgImage: '/assets/court-cricket.jpg',
    specs: 'Tournament-spec indoor turf box cricket pitch with high-tension perimeter safety netting, calibrated bounce turf, and programmable robotic bowling machine.',
    features: ['AstroTurf Pitch', 'Automated Bowling Arm', 'High-Lux Stadium LED'],
  },
  {
    id: 'apex-football',
    name: 'APEX FOOTBALL TURF',
    sport: 'ARENA 04 • FOOTBALL',
    category: 'team',
    rate: 2200,
    badge: '5-A-SIDE • PRO',
    bgImage: '/assets/court-football.jpg',
    specs: 'FIFA Quality Pro rubber-infill turf arena with dynamic rebound boards, goal-line electronic sensors, and shock-pad sublayers for joint protection.',
    features: ['FIFA Quality Pro', 'Fast-Rebound Cage', 'Full Netting Enclosure'],
  },
  {
    id: 'grand-slam-tennis',
    name: 'GRAND SLAM TENNIS COURT',
    sport: 'ARENA 05 • TENNIS',
    category: 'racket',
    rate: 1600,
    badge: 'GRAND SLAM SPEC',
    isPrime: true,
    bgImage: '/assets/court-tennis.jpg',
    specs: 'Professional acrylic hard court with US Open multi-layer cushioning system. Anti-glare optical lighting with baseline ball-tracking cameras.',
    features: ['Cushioned Acrylic', 'Championship Netting', 'Slow/Medium Pace'],
  },
  {
    id: 'bwf-badminton',
    name: 'BWF BADMINTON ARENA',
    sport: 'ARENA 06 • BADMINTON',
    category: 'racket',
    rate: 900,
    badge: 'BWF CERTIFIED',
    bgImage: '/assets/court-badminton.jpg',
    specs: '5.0mm BWF approved synthetic green courts over sprung Canadian maple timber. Laminar airflow HVAC prevents shuttlecock drift during fast drives.',
    features: ['BWF Approved Mats', 'Zero-Drift Airflow', 'Yonex Post & Net'],
  },
  {
    id: 'olympic-table-tennis',
    name: 'OLYMPIC TABLE TENNIS',
    sport: 'ARENA 07 • TABLE TENNIS',
    category: 'racket',
    rate: 600,
    badge: 'ITTF APPROVED',
    bgImage: '/assets/court-table-tennis.jpg',
    specs: 'Dual ITTF 25mm tournament blue tables with non-glare surface finish. Taraflex sports flooring and high-speed robotic ball feeder for spin drills.',
    features: ['25mm Match Table', 'Taraflex Floor', 'Drill Robot Bay'],
  },
  {
    id: 'hydro-lap-pool',
    name: 'HYDRO LAP POOL & SPA',
    sport: 'ARENA 08 • AQUATIC',
    category: 'golf-pool',
    rate: 1200,
    badge: 'HYDRO RECOVERY',
    isPrime: true,
    bgImage: '/assets/court-pool.jpg',
    specs: '25-meter temperature-controlled 4-lane lap pool with dark stone architectural surround. Integrated 8°C cold plunge tubs and Finnish cedar saunas.',
    features: ['25m 4-Lane Heated', '8°C Ice Plunge', 'Ozone Purification'],
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Scroll state for header styling
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Filter state for court grid
  const [activeFilter, setActiveFilter] = useState<'all' | 'racket' | 'team' | 'golf-pool'>('all');

  // Showcase Court Active Image
  const [showcaseCourt, setShowcaseCourt] = useState<'Court Black' | 'Center Court' | 'Tournament Blue'>('Court Black');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedCourtId, setSelectedCourtId] = useState<string>('court-black-padel');
  const [selectedCoach, setSelectedCoach] = useState<string>('none');
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [sessionDuration, setSessionDuration] = useState<number>(90);
  const [selectedTime, setSelectedTime] = useState<string>('17:00');
  const [rentEquipment, setRentEquipment] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openBooking = (courtId?: string, coachName?: string) => {
    if (courtId) setSelectedCourtId(courtId);
    if (coachName) setSelectedCoach(coachName);
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeBooking = () => {
    setIsModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Price Calculation
  const currentCourt = COURTS_DATA.find((c) => c.id === selectedCourtId) || COURTS_DATA[0];
  const durationMultiplier = sessionDuration / 60;
  const courtCost = currentCourt.rate * durationMultiplier;
  let coachFee = 0;
  if (selectedCoach === 'Max Davis') coachFee = 1200;
  else if (selectedCoach === 'Alex Mercer') coachFee = 1000;
  else if (selectedCoach === 'Jordan Blake') coachFee = 800;
  const equipmentFee = rentEquipment ? 350 : 0;
  const totalAmount = Math.round(courtCost + coachFee + equipmentFee);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    closeBooking();
    setToastMessage(`Reservation confirmed for ${currentCourt.name} on ${bookingDate} at ${selectedTime}!`);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
    }, 4500);
  };

  const filteredCourts = COURTS_DATA.filter((court) => {
    if (activeFilter === 'all') return true;
    return court.category === activeFilter;
  });

  const getShowcaseImage = () => {
    if (showcaseCourt === 'Center Court') return '/assets/panoramic-court.jpg';
    if (showcaseCourt === 'Tournament Blue') return '/assets/court-blue-bg.jpg';
    return '/assets/court-black-bg.jpg';
  };

  return (
    <div className="landing-root bg-[#050607] text-[#f5f5f5] min-h-screen">
      {/* ==================== 1. TOP NAVIGATION ==================== */}
      <header className={`site-header ${isScrolled ? 'scrolled' : ''}`} id="siteHeader">
        <div className="header-container">
          {/* Left Navigation Links */}
          <nav className={`nav-left ${mobileMenuOpen ? 'open' : ''}`} aria-label="Main Navigation">
            <ul className="nav-links">
              <li><a href="#hero" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Home</a></li>
              <li><a href="#courts-reserve" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Courts</a></li>
              <li><a href="#coaches" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Coaching</a></li>
              <li><a href="#memberships" className="nav-link" onClick={() => setMobileMenuOpen(false)}>Pricing</a></li>
            </ul>
          </nav>

          {/* Center Brand Logo */}
          <a href="#hero" className="brand-center" aria-label="Apex Sports Club">
            <svg className="dot-matrix-brand" width="22" height="15" viewBox="0 0 22 15" fill="none">
              <circle cx="2.5" cy="2.5" r="2.2" fill="#C6FF00" />
              <circle cx="11" cy="2.5" r="2.2" fill="#C6FF00" />
              <circle cx="19.5" cy="2.5" r="2.2" fill="#C6FF00" />
              <circle cx="2.5" cy="12.5" r="2.2" fill="#C6FF00" />
              <circle cx="11" cy="12.5" r="2.2" fill="#C6FF00" />
              <circle cx="19.5" cy="12.5" r="2.2" fill="#C6FF00" />
            </svg>
            <span className="brand-title">APEX SPORTS CLUB</span>
          </a>

          {/* Right Actions & Portal Login */}
          <div className="nav-right">
            {/* Register button navigating to signup/registration */}
            <button
              type="button"
              onClick={() => navigate('/login?mode=register')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.45rem 1.25rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
              className="hover:border-[#C6FF00] hover:text-[#C6FF00] hover:bg-[#C6FF00]/10 hover:shadow-[0_0_16px_rgba(198,255,0,0.25)]"
            >
              Register
            </button>

            {/* Portal / Dashboard Access Button */}
            <button
              type="button"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login?mode=login')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                padding: '0.45rem 1rem',
                borderRadius: '9999px',
                backgroundColor: '#C6FF00',
                color: '#050607',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 10px rgba(198, 255, 0, 0.25)',
              }}
              className="hover:bg-[#b0e600]"
            >
              <span>{isAuthenticated ? 'Club Terminal' : 'Staff Login'}</span>
              <span>↗</span>
            </button>

            {/* Mobile hamburger */}
            <button
              className={`mobile-toggle ${mobileMenuOpen ? 'active' : ''}`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <main>
        {/* ==================== 2. HERO SECTION ==================== */}
        <section className="hero-cinematic" id="hero">
          <div className="hero-bg-layer">
            <img src="/assets/hero-player-center.jpg" alt="Apex Sports Club Champion" className="hero-player-img" />
            <div className="hero-vignette"></div>
          </div>

          <div className="hero-inner-container">
            {/* 3 Giant Headline Columns */}
            <div className="hero-headlines-grid">
              {/* Column 1: Motion */}
              <div className="hero-col hero-col-left">
                <h1 className="hero-word">Motion.</h1>
                <div className="col-meta-box">
                  <p className="hero-col-subtext">Train with experts<br />in their field</p>
                  <div className="coach-avatar-stack">
                    <img src="/assets/coach-max-davis.jpg" alt="Coach Avatar 1" className="avatar-circle" />
                    <img src="/assets/coach-alex-mercer.jpg" alt="Coach Avatar 2" className="avatar-circle" />
                    <div className="avatar-circle avatar-more">+4</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Discipline (Neon Lime) - Clashing text removed */}
              <div className="hero-col hero-col-center">
                <h1 className="hero-word word-lime">Discipline.</h1>
              </div>

              {/* Column 3: Result */}
              <div className="hero-col hero-col-right">
                <h1 className="hero-word">Result.</h1>
                <div className="col-meta-box right-meta">
                  <p className="hero-col-subtext">Master every single strike<br />push your limits</p>
                </div>

                {/* Founder Card & Signature */}
                <div className="founder-endorsement">
                  <div className="founder-bio">
                    <span className="founder-name">Russell Crowe</span>
                    <span className="founder-title">Professional athlete & club patron</span>
                    <span className="founder-cred">Two-time world champion</span>
                    <span className="founder-role">Apex Sports Club Founder</span>
                  </div>
                  <div className="founder-signature">Russell Crowe</div>
                </div>
              </div>
            </div>

            {/* Hero Bottom Bar */}
            <div className="hero-bottom-bar">
              {/* Vacation Spot Card */}
              <div className="vacation-spot-card">
                <div className="vspot-header">
                  <span className="vspot-title">Your<br />Vacation Spot</span>
                  <svg className="dot-matrix-sm" width="18" height="12" viewBox="0 0 18 12" fill="none">
                    <circle cx="2" cy="2" r="1.8" fill="#C6FF00" />
                    <circle cx="9" cy="2" r="1.8" fill="#C6FF00" />
                    <circle cx="16" cy="2" r="1.8" fill="#C6FF00" />
                    <circle cx="2" cy="10" r="1.8" fill="#C6FF00" />
                    <circle cx="9" cy="10" r="1.8" fill="#C6FF00" />
                    <circle cx="16" cy="10" r="1.8" fill="#C6FF00" />
                  </svg>
                </div>
                <div className="vspot-thumb">
                  <img src="/assets/padel-balls-macro.jpg" alt="Vacation Spot Athletic Gear" />
                </div>
                <div className="vspot-stats">
                  <div className="vstat">
                    <span className="vstat-num">2.8k</span>
                    <span className="vstat-lbl">Memberships</span>
                  </div>
                  <div className="vstat">
                    <span className="vstat-num lime-num">4.8</span>
                    <span className="vstat-lbl">Positive reviews</span>
                  </div>
                </div>
              </div>

              {/* Bottom Right CTA */}
              <button
                type="button"
                className="btn-lime-pill cursor-pointer"
                onClick={() => openBooking()}
              >
                <span>RESERVE A COURT</span>
                <span className="arrow-icon">↗</span>
              </button>
            </div>
          </div>
        </section>

        {/* ==================== 3. BRAND MARQUEE ==================== */}
        <section className="marquee-section" aria-hidden="true">
          <div className="marquee-track">
            <div className="marquee-content">
              <span>APEX SPORTS CLUB</span>
              <span>CHAMPIONSHIP ARENAS</span>
              <span>CRICKET BOX</span>
              <span>TRACKMAN GOLF</span>
              <span>BWF BADMINTON</span>
              <span>US OPEN TENNIS</span>
              <span>FIFA TURF</span>
              <span>APEX SPORTS CLUB</span>
            </div>
            <div className="marquee-content" aria-hidden="true">
              <span>APEX SPORTS CLUB</span>
              <span>CHAMPIONSHIP ARENAS</span>
              <span>CRICKET BOX</span>
              <span>TRACKMAN GOLF</span>
              <span>BWF BADMINTON</span>
              <span>US OPEN TENNIS</span>
              <span>FIFA TURF</span>
              <span>APEX SPORTS CLUB</span>
            </div>
          </div>
          <p className="marquee-subline">From tournament equipment to physical recovery, we elevate your athletic performance.</p>
        </section>

        {/* ==================== 4. EXPERIENCE SECTION ==================== */}
        <section className="experience-cinematic" id="experience">
          <div className="exp-bg-layer">
            <img src="/assets/padel-balls-macro.jpg" alt="Field of vibrant sports balls" />
            <div className="exp-radial-overlay"></div>
          </div>

          <div className="exp-content">
            <div className="exp-icon-wrap">
              <svg className="dot-matrix-grid" width="28" height="28" viewBox="0 0 24 24" fill="none">
                <circle cx="4" cy="4" r="2.2" fill="#C6FF00" />
                <circle cx="12" cy="4" r="2.2" fill="#C6FF00" />
                <circle cx="20" cy="4" r="2.2" fill="#C6FF00" />
                <circle cx="4" cy="12" r="2.2" fill="#C6FF00" />
                <circle cx="12" cy="12" r="2.2" fill="#C6FF00" />
                <circle cx="20" cy="12" r="2.2" fill="#C6FF00" />
                <circle cx="4" cy="20" r="2.2" fill="#C6FF00" />
                <circle cx="12" cy="20" r="2.2" fill="#C6FF00" />
                <circle cx="20" cy="20" r="2.2" fill="#C6FF00" />
              </svg>
            </div>

            <h2 className="exp-heading">
              EXPERIENCE THE<br />
              <span className="exp-highlight">TRUE ENERGY</span><br />
              OF APEX SPORTS
            </h2>

            <p className="exp-desc">
              Fast-paced, tactical, and uncompromisingly high performance. Whether you want to master your stroke, burn calories in an intense floodlit match, or relax with friends by the recovery pool, our arenas are ready.
            </p>

            <button
              type="button"
              className="btn-outline-pill cursor-pointer"
              onClick={() => openBooking()}
            >
              <span>RESERVE AN ARENA</span>
              <span className="arrow-icon">↗</span>
            </button>
          </div>
        </section>

        {/* ==================== 5. COACHES SECTION ==================== */}
        <section className="coaches-cinematic" id="coaches">
          <div className="coaches-container">
            <div className="coaches-header-row">
              <div className="coaches-title-group">
                <span className="sub-label">Elite Staff</span>
                <div className="title-with-line">
                  <h2 className="coaches-title">TRAIN LIKE A PRO</h2>
                  <div className="header-divider-line"></div>
                </div>
              </div>
            </div>

            <div className="coaches-deck">
              {/* Card 1: Max Davis */}
              <article className="coach-editorial-card">
                <img src="/assets/coach-max-davis.jpg" alt="Coach Max Davis" className="coach-photo" loading="lazy" />
                <div className="card-overlay-gradient"></div>
                <div className="card-content">
                  <div className="card-top-row">
                    <div className="badges-col">
                      <div className="pill-badge">
                        <span>x21 Titles</span>
                      </div>
                      <div className="pill-badge">
                        <span>x6 Masters</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-book-session cursor-pointer"
                      onClick={() => openBooking('court-black-padel', 'Max Davis')}
                    >
                      <span>BOOK SESSION</span>
                      <span>↗</span>
                    </button>
                  </div>
                  <div className="card-mid-stats">
                    <div className="metric-block">
                      <span className="metric-val">9.000h</span>
                      <span className="metric-sub">on the pitch</span>
                    </div>
                    <div className="metric-block">
                      <span className="metric-val">700+</span>
                      <span className="metric-sub">students</span>
                    </div>
                  </div>
                  <div className="card-bottom-row">
                    <h3 className="coach-full-name">Max Davis</h3>
                    <span className="card-club-tag">HEAD PADEL COACH</span>
                  </div>
                </div>
              </article>

              {/* Card 2: Alex Mercer */}
              <article className="coach-editorial-card">
                <img src="/assets/coach-alex-mercer.jpg" alt="Coach Alex Mercer" className="coach-photo" loading="lazy" />
                <div className="card-overlay-gradient"></div>
                <div className="card-content">
                  <div className="card-top-row">
                    <div className="badges-col">
                      <div className="pill-badge">
                        <span>x14 Titles</span>
                      </div>
                      <div className="pill-badge">
                        <span>x3 Pro Slam</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-book-session cursor-pointer"
                      onClick={() => openBooking('grand-slam-tennis', 'Alex Mercer')}
                    >
                      <span>BOOK SESSION</span>
                      <span>↗</span>
                    </button>
                  </div>
                  <div className="card-mid-stats">
                    <div className="metric-block">
                      <span className="metric-val">5.000h</span>
                      <span className="metric-sub">on the pitch</span>
                    </div>
                    <div className="metric-block">
                      <span className="metric-val">300+</span>
                      <span className="metric-sub">students</span>
                    </div>
                  </div>
                  <div className="card-bottom-row">
                    <h3 className="coach-full-name">Alex Mercer</h3>
                    <span className="card-club-tag">MASTER TACTICIAN</span>
                  </div>
                </div>
              </article>

              {/* Card 3: Jordan Blake */}
              <article className="coach-editorial-card">
                <img src="/assets/coach-jordan-blake.jpg" alt="Coach Jordan Blake" className="coach-photo" loading="lazy" />
                <div className="card-overlay-gradient"></div>
                <div className="card-content">
                  <div className="card-top-row">
                    <div className="badges-col">
                      <div className="pill-badge">
                        <span>x9 Tour</span>
                      </div>
                      <div className="pill-badge">
                        <span>High Perf</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-book-session cursor-pointer"
                      onClick={() => openBooking('floodlit-cricket', 'Jordan Blake')}
                    >
                      <span>BOOK SESSION</span>
                      <span>↗</span>
                    </button>
                  </div>
                  <div className="card-mid-stats">
                    <div className="metric-block">
                      <span className="metric-val">4.200h</span>
                      <span className="metric-sub">athletic lab</span>
                    </div>
                    <div className="metric-block">
                      <span className="metric-val">450+</span>
                      <span className="metric-sub">students</span>
                    </div>
                  </div>
                  <div className="card-bottom-row">
                    <h3 className="coach-full-name">Jordan Blake</h3>
                    <span className="card-club-tag">STRENGTH & AGILITY</span>
                  </div>
                </div>
              </article>
            </div>

            <div className="coaches-footer-slogan">
              <span>PLAY LIKE A CHAMPION</span>
            </div>
          </div>
        </section>

        {/* ==================== 6. RESERVE COURT SECTION (8 MULTISPORT GRID) ==================== */}
        <section className="courts-reserve-section" id="courts-reserve">
          <div className="container">
            <div className="courts-reserve-header">
              <div>
                <span className="sub-label">CHAMPIONSHIP MULTISPORT ARENAS</span>
                <h2 className="courts-reserve-title">RESERVE A COURT</h2>
              </div>
              <p className="courts-reserve-subtitle">
                World-class sports infrastructure across 8 premier disciplines. Select your arena from the sports turf grid below to inspect specifications and lock your slot.
              </p>
            </div>

            {/* Interactive Sport Category Filter */}
            <div className="court-filter-bar">
              <button
                type="button"
                className={`court-filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                All Arenas (8)
              </button>
              <button
                type="button"
                className={`court-filter-pill ${activeFilter === 'racket' ? 'active' : ''}`}
                onClick={() => setActiveFilter('racket')}
              >
                Racket Sports
              </button>
              <button
                type="button"
                className={`court-filter-pill ${activeFilter === 'team' ? 'active' : ''}`}
                onClick={() => setActiveFilter('team')}
              >
                Team Arenas (Cricket & Football)
              </button>
              <button
                type="button"
                className={`court-filter-pill ${activeFilter === 'golf-pool' ? 'active' : ''}`}
                onClick={() => setActiveFilter('golf-pool')}
              >
                Golf & Pool
              </button>
            </div>

            {/* 8 Sports Courts Multi-Column Grid with Atmosphere Backgrounds */}
            <div className="courts-visual-grid">
              {filteredCourts.map((court) => (
                <div key={court.id} className="court-visual-card">
                  <div
                    className="court-photo-bg"
                    style={{ backgroundImage: `url('${court.bgImage}')` }}
                  />
                  <div className="court-card-glass">
                    <div className="court-meta-top">
                      <span className={`court-status-pill ${court.isPrime ? 'prime-pill' : ''}`}>
                        <span className="status-dot"></span> {court.badge}
                      </span>
                      <span className="court-rate-tag">
                        ₹{court.rate.toLocaleString('en-IN')} <small>/ hr</small>
                      </span>
                    </div>

                    <div className="court-details-body">
                      <span className="court-number">{court.sport}</span>
                      <h3 className="court-display-name">{court.name}</h3>
                      <p className="court-specs-text">{court.specs}</p>

                      <div className="court-pills-row">
                        {court.features.map((f, i) => (
                          <span key={i} className="court-feature-pill">{f}</span>
                        ))}
                      </div>
                    </div>

                    <div className="court-card-action">
                      <button
                        type="button"
                        className="btn-lime-pill cursor-pointer"
                        onClick={() => openBooking(court.id)}
                      >
                        <span>RESERVE ARENA</span>
                        <span>↗</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== 7. COURT BLACK SHOWCASE ==================== */}
        <section className="court-black-section" id="court-black">
          <div className="court-subheader">
            <div className="court-sub-left">
              <div className="pill-court-selector">
                <span>CHOOSE YOUR COURT</span>
                <span className="green-indicator-dot"></span>
              </div>
            </div>
            <div className="court-sub-center">
              <span className="court-active-name">{showcaseCourt.toUpperCase()}</span>
            </div>
            <div className="court-sub-right">
              <span className="court-brand-label">APEX SPORTS CLUB</span>
            </div>
          </div>

          <div className="court-arena-canvas">
            <img src={getShowcaseImage()} alt="Arena Visual" className="court-bg-photo" />
            <div className="court-shading-overlay"></div>

            <div className="court-headline-overlay">
              <span className="court-word word-lime">Elevate</span>
              <span className="court-word">Your</span>
              <span className="court-word word-lime">Athletic</span>
              <span className="court-word">Game</span>
            </div>

            <div className="court-arena-footer">
              <button
                type="button"
                className="btn-lime-pill cursor-pointer"
                onClick={() => openBooking('court-black-padel')}
              >
                <span>RESERVE A COURT</span>
                <span className="arrow-icon">↗</span>
              </button>

              <div className="court-gallery-widget">
                <div
                  className={`thumb-card ${showcaseCourt === 'Court Black' ? 'active' : ''}`}
                  onClick={() => setShowcaseCourt('Court Black')}
                >
                  <img src="/assets/court-black-bg.jpg" alt="Court Black" />
                </div>
                <div
                  className={`thumb-card ${showcaseCourt === 'Center Court' ? 'active' : ''}`}
                  onClick={() => setShowcaseCourt('Center Court')}
                >
                  <img src="/assets/panoramic-court.jpg" alt="Center Court" />
                </div>
                <div
                  className={`thumb-card ${showcaseCourt === 'Tournament Blue' ? 'active' : ''}`}
                  onClick={() => setShowcaseCourt('Tournament Blue')}
                >
                  <img src="/assets/court-blue-bg.jpg" alt="Tournament Blue" />
                  <span className="thumb-link-badge">See All ➔</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== 8. PRICING & MEMBERSHIPS ==================== */}
        <section className="pricing-section" id="memberships">
          <div className="container">
            <div className="pricing-header">
              <span className="sub-label">Exclusivity & Access</span>
              <h2 className="pricing-title">MEMBERSHIP TIERS</h2>
              <p className="pricing-subtitle">Guaranteed court reservations, coaching allowances, and access to private athletic facilities.</p>
            </div>

            <div className="pricing-grid">
              {/* Tier 1 */}
              <div className="pricing-card">
                <span className="tier-badge">CLUB ACCESS</span>
                <h3 className="tier-name">Social Member</h3>
                <div className="tier-price">
                  <span className="currency">₹</span><span className="amount">2,499</span><span className="period">/mo</span>
                </div>
                <ul className="tier-perks">
                  <li>✓ 7-day advance booking window</li>
                  <li>✓ Full access to tennis and cricket box</li>
                  <li>✓ Clubhouse cafeteria & lounge access</li>
                  <li>✓ Monthly club tournament entry</li>
                </ul>
                <button
                  type="button"
                  className="btn-outline-pill cursor-pointer"
                  onClick={() => openBooking()}
                >
                  SELECT PLAN
                </button>
              </div>

              {/* Tier 2 (Featured) */}
              <div className="pricing-card featured">
                <span className="tier-badge lime-badge">MOST POPULAR</span>
                <h3 className="tier-name">Tour Pro Member</h3>
                <div className="tier-price">
                  <span className="currency">₹</span><span className="amount">4,999</span><span className="period">/mo</span>
                </div>
                <ul className="tier-perks">
                  <li>✓ 14-day priority advance booking</li>
                  <li>✓ 2x Private coaching sessions / mo</li>
                  <li>✓ Unlimited hydrotherapy cold plunge & sauna</li>
                  <li>✓ Complimentary tournament racket & bat rentals</li>
                  <li>✓ Dedicated private equipment locker</li>
                </ul>
                <button
                  type="button"
                  className="btn-lime-pill cursor-pointer"
                  onClick={() => openBooking()}
                >
                  SELECT PLAN
                </button>
              </div>

              {/* Tier 3 */}
              <div className="pricing-card">
                <span className="tier-badge">FOUNDING PATRON</span>
                <h3 className="tier-name">VIP Syndicate</h3>
                <div className="tier-price">
                  <span className="currency">₹</span><span className="amount">9,999</span><span className="period">/mo</span>
                </div>
                <ul className="tier-perks">
                  <li>✓ Unlimited anytime arena reservations</li>
                  <li>✓ Weekly private masterclasses with head coach</li>
                  <li>✓ Private concierge & unlimited guest passes</li>
                  <li>✓ Access to national sports affiliate clubs</li>
                </ul>
                <button
                  type="button"
                  className="btn-outline-pill cursor-pointer"
                  onClick={() => openBooking()}
                >
                  SELECT PLAN
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="site-footer" id="footer">
        <div className="container footer-inner">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="brand-center" style={{ marginBottom: '0.75rem' }}>
                <svg className="dot-matrix-brand" width="22" height="15" viewBox="0 0 22 15" fill="none">
                  <circle cx="2.5" cy="2.5" r="2.2" fill="#C6FF00" />
                  <circle cx="11" cy="2.5" r="2.2" fill="#C6FF00" />
                  <circle cx="19.5" cy="2.5" r="2.2" fill="#C6FF00" />
                  <circle cx="2.5" cy="12.5" r="2.2" fill="#C6FF00" />
                  <circle cx="11" cy="12.5" r="2.2" fill="#C6FF00" />
                  <circle cx="19.5" cy="12.5" r="2.2" fill="#C6FF00" />
                </svg>
                <span className="brand-title">APEX SPORTS CLUB</span>
              </div>
              <p className="footer-bio">The intersection of tournament-grade athleticism, architectural discipline, and luxury private recreation.</p>
            </div>
            <div className="footer-columns">
              <div className="f-col">
                <h4>EXPLORE</h4>
                <a href="#hero">Overview</a>
                <a href="#courts-reserve">Courts</a>
                <a href="#coaches">Coaching</a>
                <a href="#memberships">Memberships</a>
                <span
                  onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                  className="cursor-pointer text-[#C6FF00] hover:underline"
                >
                  {isAuthenticated ? 'Club Terminal (Staff)' : 'Staff Login'}
                </span>
              </div>
              <div className="f-col">
                <h4>HOURS</h4>
                <p>Mon – Fri: 06:00 – 23:00</p>
                <p>Sat – Sun: 07:00 – 22:00</p>
                <p>Court floodlights active daily</p>
              </div>
              <div className="f-col">
                <h4>LOCATION</h4>
                <p>Apex Sports Club Enclave</p>
                <p>Sporting Boulevard, Central Enclave</p>
                <p>Bengaluru, 560001</p>
                <a href="tel:+919876543210" style={{ color: '#C6FF00', marginTop: '0.5rem', display: 'block' }}>+91 98765 43210</a>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 APEX SPORTS CLUB. ALL RIGHTS RESERVED.</p>
            <p className="signature-font" style={{ color: '#C6FF00', fontSize: '1.25rem' }}>Russell Crowe Founder</p>
          </div>
        </div>
      </footer>

      {/* ==================== INTERACTIVE RESERVATION MODAL ==================== */}
      {isModalOpen && (
        <div className="booking-modal-backdrop active" onClick={closeBooking}>
          <div className="booking-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="sub-label">RESERVATION SYSTEM</span>
                <h3 className="modal-title">RESERVE A COURT</h3>
              </div>
              <button
                type="button"
                className="modal-close cursor-pointer"
                onClick={closeBooking}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="modal-form">
              {/* Visual Court Selector */}
              <div className="form-group">
                <label className="form-label">Select Arena</label>
                <div className="court-select-grid">
                  {COURTS_DATA.map((court) => (
                    <div
                      key={court.id}
                      className={`court-modal-option ${selectedCourtId === court.id ? 'active' : ''}`}
                      onClick={() => setSelectedCourtId(court.id)}
                    >
                      <div className="court-opt-bg" style={{ backgroundImage: `url('${court.bgImage}')` }}></div>
                      <div className="court-opt-content">
                        <div className="court-opt-top">
                          <span className="court-opt-tag">{court.sport}</span>
                          <span className="court-opt-price">₹{court.rate}/hr</span>
                        </div>
                        <h4 className="court-opt-title">{court.name}</h4>
                        <p className="court-opt-desc">{court.features.join(' • ')}</p>
                      </div>
                      {selectedCourtId === court.id && <span className="opt-check-badge">✓</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coach Selection */}
              <div className="form-group">
                <label className="form-label">Private Coach (Optional)</label>
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="form-select w-full"
                >
                  <option value="none">No Coach - Free Match Play</option>
                  <option value="Max Davis">Max Davis (+₹1,200/session)</option>
                  <option value="Alex Mercer">Alex Mercer (+₹1,000/session)</option>
                  <option value="Jordan Blake">Jordan Blake (+₹800/session)</option>
                </select>
              </div>

              {/* Date & Duration */}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Session Duration</label>
                  <select
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                    className="form-select"
                  >
                    <option value={60}>60 Minutes</option>
                    <option value={90}>90 Minutes (Recommended)</option>
                    <option value={120}>120 Minutes (Full Match)</option>
                  </select>
                </div>
              </div>

              {/* Time Slots */}
              <div className="form-group">
                <label className="form-label">Available Prime Time Slots</label>
                <div className="time-chips">
                  {['07:30', '09:00', '17:00', '18:30', '20:00'].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      className={`time-chip ${selectedTime === slot ? 'active' : ''}`}
                      onClick={() => setSelectedTime(slot)}
                    >
                      {slot === '07:30' || slot === '09:00' ? `${slot} AM` : `${slot} PM`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Equipment Rental */}
              <div className="form-group checkbox-row">
                <label className="checkbox-label cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rentEquipment}
                    onChange={(e) => setRentEquipment(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500"
                  />
                  <span>Include Championship Gear & Balls (+₹350)</span>
                </label>
              </div>

              {/* Price Summary & Submit */}
              <div className="price-summary-bar">
                <div>
                  <span className="price-lbl">ESTIMATED TOTAL</span>
                  <span className="price-val">₹{totalAmount.toLocaleString('en-IN')}.00</span>
                </div>
                <button type="submit" className="btn-lime-pill cursor-pointer">
                  <span>CONFIRM RESERVATION</span>
                  <span>↗</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {showToast && (
        <div className="toast-msg active">
          {toastMessage}
        </div>
      )}
    </div>
  );
};
