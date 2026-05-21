import { useUISettings } from "@shared/lib/ui-settings";
import "../../../pages/landing/ui/landing.css";

export const LandingBenefits = () => {
  const { t } = useUISettings();

  return (
    <section className="benefits" id="benefits">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">{t('landing.benefits.title')}</h2>
          <p className="section-subtitle">{t('landing.benefits.subtitle')}</p>
        </div>

        {/* For Candidates */}
        <div className="benefit-row">
          <div className="benefit-content">
            <div className="benefit-badge">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
              <span>{t('landing.benefits.candidates.badge')}</span>
            </div>
            
            <h3 className="benefit-title">{t('landing.benefits.candidates.title')}</h3>
            
            <div className="benefit-list">
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.candidates.item1')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.candidates.item2')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.candidates.item3')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.candidates.item4')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.candidates.item5')}</span>
              </div>
            </div>
          </div>

          <div className="benefit-image">
            <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&q=80" alt="Student working on laptop" />
            <div className="image-decoration"></div>
          </div>
        </div>

        {/* For Employers */}
        <div className="benefit-row reverse">
          <div className="benefit-image">
            <img src="https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800&q=80" alt="Business team meeting" />
            <div className="image-decoration left"></div>
          </div>

          <div className="benefit-content">
            <div className="benefit-badge">
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <path d="M9 22V12h6v10"/>
              </svg>
              <span>{t('landing.benefits.employers.badge')}</span>
            </div>
            
            <h3 className="benefit-title">{t('landing.benefits.employers.title')}</h3>
            
            <div className="benefit-list">
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.employers.item1')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.employers.item2')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.employers.item3')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.employers.item4')}</span>
              </div>
              <div className="benefit-item">
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <path d="M22 4L12 14.01l-3-3"/>
                </svg>
                <span>{t('landing.benefits.employers.item5')}</span>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
};
