import { Link } from "react-router-dom";
import { useUISettings } from "@shared/lib/ui-settings";
import "../../../pages/landing/ui/landing.css";

export const LandingHero = () => {
  const { t } = useUISettings();

  return (
    <section className="hero">
      <div className="bg-decoration">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="container">
        <div className="hero-grid">
          {/* Left Content */}
          <div className="hero-content">
            <div className="badge">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
              </svg>
              <span>{t('landing.hero.badge')}</span>
            </div>

            <h1 className="hero-title">{t('landing.hero.title')}</h1>

            <p className="hero-subtitle">
              {t('landing.hero.subtitle')}
            </p>

            <div className="cta-buttons">
              <Link to="/app" className="btn btn-primary">
                {t('landing.hero.applyNow')}
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <button className="btn btn-secondary">{t('landing.hero.findTalent')}</button>
            </div>

            {/* Stats */}
            <div className="stats">
              <div className="stat-item">
                <div className="stat-value">10K+</div>
                <div className="stat-label">{t('landing.hero.stats.students')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">500+</div>
                <div className="stat-label">{t('landing.hero.stats.companies')}</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">94%</div>
                <div className="stat-label">{t('landing.hero.stats.matchRate')}</div>
              </div>
            </div>
          </div>

          {/* Right Content - Image */}
          <div className="hero-image">
            <div className="image-wrapper">
              <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&q=80" alt="Team collaboration" />
              
              {/* Overlay card */}
              <div className="match-card">
                <div className="match-card-content">
                  <div className="match-icon">✓</div>
                  <div>
                    <div className="match-title">{t('landing.hero.matchTitle')}</div>
                    <div className="match-description">{t('landing.hero.matchDescription')}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="decorative-blob decorative-blob-1"></div>
            <div className="decorative-blob decorative-blob-2"></div>
          </div>
        </div>
      </div>
    </section>
  );
};
