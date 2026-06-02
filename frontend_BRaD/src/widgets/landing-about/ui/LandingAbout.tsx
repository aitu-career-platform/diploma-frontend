import { Target, Globe, Sparkles, Shield } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Smart Matching",
    description: "Our AI-powered algorithm matches your skills and interests with the perfect opportunities.",
  },
  {
    icon: Globe,
    title: "100% Remote",
    description: "Access internships and jobs from anywhere in the world. No relocation required.",
  },
  {
    icon: Sparkles,
    title: "Skill Building",
    description: "Gain real-world experience and build your portfolio with meaningful projects.",
  },
  {
    icon: Shield,
    title: "Verified Companies",
    description: "All companies are vetted to ensure safe and legitimate opportunities.",
  },
];

export const LandingAbout = () => {
  return (
    <section id="about" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <span className="inline-block text-primary font-semibold mb-4 uppercase tracking-wider text-sm">
            About Us
          </span>
          <h2 className="font-heading text-4xl md:text-5xl font-bold mb-6">
            Why Choose <span className="text-gradient">Scoutly</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            We're revolutionizing how students and professionals connect with remote work opportunities. Our platform bridges the gap between talent and opportunity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group bg-card p-8 rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Mission statement */}
        <div className="mt-20 bg-hero-gradient rounded-3xl p-10 md:p-16 text-center">
          <h3 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Our Mission
          </h3>
          <p className="text-primary-foreground/90 text-lg max-w-2xl mx-auto">
            To democratize access to career opportunities by connecting talented individuals with companies worldwide, regardless of their location or background.
          </p>
        </div>
      </div>
    </section>
  );
};
