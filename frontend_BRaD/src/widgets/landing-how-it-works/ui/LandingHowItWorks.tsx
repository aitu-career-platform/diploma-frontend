import { useUISettings } from "@shared/lib/ui-settings";
import "../../../pages/landing/ui/landing.css";

export const LandingHowItWorks = () => {
  const { t } = useUISettings();

  return (
    <section className="how-it-works" id="how-it-works">
      <div className="bg-decoration-center"></div>
      
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('landing.how.title')}</h2>
          <p className="section-subtitle">{t('landing.how.subtitle')}</p>
        </div>

        <div className="steps-grid">
          <div className="connection-line"></div>

          {/* Step 1 */}
          <div className="step-card">
            <div className="step-number">01</div>
            <div className="step-content">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="8.5" cy="7" r="4"/>
                  <path d="M20 8v6M23 11h-6"/>
                </svg>
              </div>
              <h3 className="step-title">{t('landing.how.step1.title')}</h3>
              <p className="step-description">{t('landing.how.step1.description')}</p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="step-card">
            <div className="step-number">02</div>
            <div className="step-content">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <h3 className="step-title">{t('landing.how.step2.title')}</h3>
              <p className="step-description">{t('landing.how.step2.description')}</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="step-card">
            <div className="step-number">03</div>
            <div className="step-content">
              <div className="step-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 18a5 5 0 1 0-10 0"/>
                  <path d="M12 2v10"/>
                  <path d="M12 12L9 9m3 3 3-3"/>
                </svg>
              </div>
              <h3 className="step-title">{t('landing.how.step3.title')}</h3>
              <p className="step-description">{t('landing.how.step3.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
