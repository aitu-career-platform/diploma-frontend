import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@features/contact-form";
import { useUISettings } from "@shared/lib/ui-settings";

export const LandingContact = () => {
  const { t } = useUISettings();

  return (
    <section id="contact" className="py-24 bg-secondary/30">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-primary font-semibold mb-4 uppercase tracking-wider text-sm">
            {t('landing.contact.badge')}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            {t('landing.contact.titlePrefix')} <span className="text-gradient">{t('landing.contact.titleAccent')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.contact.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact info */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading font-semibold text-lg mb-1">{t('landing.contact.email')}</h4>
                <p className="text-muted-foreground">hello@scoutly.com</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading font-semibold text-lg mb-1">{t('landing.contact.call')}</h4>
                <p className="text-muted-foreground">+1 (555) 123-4567</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-heading font-semibold text-lg mb-1">{t('landing.contact.visit')}</h4>
                <p className="text-muted-foreground">
                  123 Innovation Street<br />
                  San Francisco, CA 94105
                </p>
              </div>
            </div>
          </div>

          {/* Contact form */}
          <ContactForm />
        </div>
      </div>
    </section>
  );
};
