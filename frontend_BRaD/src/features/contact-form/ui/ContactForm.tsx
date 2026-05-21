import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Send } from "lucide-react";
import { Button, Input, Textarea } from "@shared/ui";
import { useUISettings } from "@shared/lib/ui-settings";

export const ContactForm = () => {
  const { t } = useUISettings();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const contactSchema = z.object({
    name: z.string().min(1, t("landing.contactForm.errors.nameRequired")),
    email: z.string().email(t("landing.contactForm.errors.invalidEmail")),
    message: z.string().min(1, t("landing.contactForm.errors.messageRequired")),
  });

  type ContactFormData = z.infer<typeof contactSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = (data: ContactFormData) => {
    console.log("Contact form submitted:", data);
    setIsSubmitted(true);
    reset();
    setTimeout(() => setIsSubmitted(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-card p-8 rounded-2xl shadow-card space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          {t("landing.contactForm.nameLabel")}
        </label>
        <Input
          id="name"
          {...register("name")}
          placeholder={t("landing.contactForm.namePlaceholder")}
          className="h-12"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          {t("landing.contactForm.emailLabel")}
        </label>
        <Input
          id="email"
          type="email"
          {...register("email")}
          placeholder={t("landing.contactForm.emailPlaceholder")}
          className="h-12"
        />
        {errors.email && (
          <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-2">
          {t("landing.contactForm.messageLabel")}
        </label>
        <Textarea
          id="message"
          {...register("message")}
          placeholder={t("landing.contactForm.messagePlaceholder")}
          className="min-h-[120px] resize-none"
        />
        {errors.message && (
          <p className="text-sm text-destructive mt-1">{errors.message.message}</p>
        )}
      </div>

      {isSubmitted && (
        <div className="p-4 bg-primary/10 text-primary rounded-lg text-sm">
          {t("landing.contactForm.success")}
        </div>
      )}

      <Button type="submit" variant="hero" size="lg" className="w-full">
        {t("landing.contactForm.submit")}
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
};
