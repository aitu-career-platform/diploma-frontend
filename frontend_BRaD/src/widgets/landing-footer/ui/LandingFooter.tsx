import { useUISettings } from "@shared/lib/ui-settings";
import "../../../pages/landing/ui/landing.css";

export const LandingFooter = () => {
  const { t } = useUISettings();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand */}
          <div className="footer-brand">
            <div className="footer-logo">
              <img src="/images/logo/logo.png" alt="BRaD Logo" className="footer-logo-img" />
            </div>
            <p className="footer-description">
              {t('landing.footer.description')}
            </p>
          </div>

          {/* For Candidates */}
          <div className="footer-column">
            <h4 className="footer-heading">{t('landing.footer.candidates.title')}</h4>
            <ul className="footer-links">
              <li><a href="#">{t('landing.footer.candidates.link1')}</a></li>
              <li><a href="#">{t('landing.footer.candidates.link2')}</a></li>
              <li><a href="#">{t('landing.footer.candidates.link3')}</a></li>
              <li><a href="#">{t('landing.footer.candidates.link4')}</a></li>
            </ul>
          </div>

          {/* For Employers */}
          <div className="footer-column">
            <h4 className="footer-heading">{t('landing.footer.employers.title')}</h4>
            <ul className="footer-links">
              <li><a href="#">{t('landing.footer.employers.link1')}</a></li>
              <li><a href="#">{t('landing.footer.employers.link2')}</a></li>
              <li><a href="#">{t('landing.footer.employers.link3')}</a></li>
              <li><a href="#">{t('landing.footer.employers.link4')}</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-column">
            <h4 className="footer-heading">{t('landing.footer.company.title')}</h4>
            <ul className="footer-links">
              <li><a href="#">{t('landing.footer.company.link1')}</a></li>
              <li><a href="#">{t('landing.footer.company.link2')}</a></li>
              <li><a href="#">{t('landing.footer.company.link3')}</a></li>
              <li><a href="#">{t('landing.footer.company.link4')}</a></li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <p className="copyright">{t('landing.footer.copyright', { year: new Date().getFullYear() })}</p>
          
          <div className="social-links">
            <a href="#" className="social-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                <rect x="2" y="9" width="4" height="12"/>
                <circle cx="4" cy="4" r="2"/>
              </svg>
            </a>
            <a href="#" className="social-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
              </svg>
            </a>
            <a href="#" className="social-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <path d="M17.5 6.5h.01"/>
              </svg>
            </a>
            <a href="#" className="social-link">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <path d="m22 6-10 7L2 6"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

