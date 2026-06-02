import { Link } from "react-router-dom";
import { BrandLogo, PreferencesControls } from "@shared/ui";
import { useUISettings } from "@shared/lib/ui-settings";
import "../../../pages/landing/ui/landing.css";

export const LandingHeader = () => {
  const { t } = useUISettings();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <a href="#" className="navbar-logo">
          <BrandLogo className="logo-img" />
        </a>
        
        <div className="navbar-menu">
          <a href="#features" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("features"); }}>
            {t('landing.nav.features')}
          </a>
          <a href="#how-it-works" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("how-it-works"); }}>
            {t('landing.nav.howItWorks')}
          </a>
          <a href="#benefits" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("benefits"); }}>
            {t('landing.nav.benefits')}
          </a>
          <a href="#testimonials" className="nav-link" onClick={(e) => { e.preventDefault(); scrollToSection("testimonials"); }}>
            {t('landing.nav.testimonials')}
          </a>
        </div>
        
        <div className="navbar-actions">
          <Link to="/app/login" className="nav-btn nav-btn-ghost">{t('landing.nav.signIn')}</Link>
          <Link to="/app" className="nav-btn nav-btn-primary">{t('landing.nav.getStarted')}</Link>
        </div>
      </div>
      <div className="navbar-mobile-preferences">
        <PreferencesControls compact className="w-full justify-between" />
      </div>
    </nav>
  );
};
