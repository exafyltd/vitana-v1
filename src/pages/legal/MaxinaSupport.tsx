import { ArrowLeft, Mail, Clock, BookOpen, User, Calendar, CreditCard, HelpCircle, Shield, Trash2, ExternalLink } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Panel as Card, PanelContent as CardContent } from "@/components/layout/spotlight/Panel";
import { PublicMain } from "@/components/layout/spotlight/PublicMain";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SEO from "@/components/SEO";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';

const MaxinaSupport = () => {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const spotlight = useSpotlightEnabled();

  const helpCategories = [
    {
      id: "gettingStarted",
      icon: BookOpen,
      color: "bg-category-4/15 text-category-4",
    },
    {
      id: "account",
      icon: User,
      color: "bg-category-2/15 text-category-2",
    },
    {
      id: "events",
      icon: Calendar,
      color: "bg-category-3/15 text-category-3",
    },
    {
      id: "payments",
      icon: CreditCard,
      color: "bg-category-6/15 text-category-6",
    },
    {
      id: "technical",
      icon: HelpCircle,
      color: "bg-category-5/15 text-category-5",
    },
  ];

  const faqItems = [
    "createAccount",
    "resetPassword",
    "joinEvents",
    "updateProfile",
    "deleteAccount",
    "paymentMethods",
    "contactOrganizers",
    "dataSecure",
  ];

  const usefulLinks = [
    {
      id: "privacy",
      icon: Shield,
      to: "/privacy",
    },
    {
      id: "deleteAccount",
      icon: Trash2,
      to: "/delete-account",
    },
    {
      id: "portal",
      icon: ExternalLink,
      to: "/maxina",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO 
        title={t('screens.legal.maxinaSupportHelpFaq')}
        description="Get help with your Maxina account. Find answers to common questions about events, payments, and your wellness journey."
        canonical="https://vitanaland.com/maxina_support"
      />
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className={cn(spotlight ? "max-w-wide" : "max-w-4xl", "mx-auto px-4 py-4 flex items-center gap-4")}>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            aria-label={t('screens.legal.goBack')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-ruby flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">M</span>
            </div>
            <h1 className="text-lg font-semibold">{translate("support.maxina.title")}</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <PublicMain spotlight={spotlight} archetype="collection" legacyClassName="max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-10" className="space-y-10">
        {/* Hero Section */}
        <section className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {translate("support.maxina.subtitle")}
          </h2>
          <p className="text-muted-foreground">
            {translate("support.maxina.description")}
          </p>
        </section>

        {/* Help Categories */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {translate("support.maxina.categoriesTitle")}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {helpCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Card 
                  key={category.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow border-border/50"
                >
                  <CardContent className="p-4 text-center space-y-3">
                    <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center mx-auto`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      {translate(`support.maxina.categories.${category.id}`)}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* FAQ Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {translate("support.maxina.faq.title")}
          </h3>
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqItems.map((item, index) => (
                  <AccordionItem 
                    key={item} 
                    value={item}
                    className={index === faqItems.length - 1 ? "border-b-0" : ""}
                  >
                    <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                      <span className="text-start text-sm md:text-base">
                        {translate(`support.maxina.faq.${item}.question`)}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 text-muted-foreground">
                      {translate(`support.maxina.faq.${item}.answer`)}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* Contact Support Section */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {translate("support.maxina.contact.title")}
          </h3>
          <Card className="border-border/50 bg-gradient-to-br from-ruby/5 to-ruby/10">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-full bg-ruby/10 flex items-center justify-center shrink-0">
                  <Mail className="h-6 w-6 text-ruby" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground">
                    {translate("support.maxina.contact.email")}
                  </h4>
                  <a 
                    href="mailto:support@exafy.io"
                    className="text-ruby hover:underline font-medium"
                  >
                    {t('screens.legal.supportExafyIo')}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>{translate("support.maxina.contact.responseTime")}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Useful Links */}
        <section className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            {translate("support.maxina.usefulLinks.title")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {usefulLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.id} to={link.to}>
                  <Card className="cursor-pointer hover:shadow-md transition-shadow border-border/50 h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {translate(`support.maxina.usefulLinks.${link.id}`)}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-border text-center">
          <p className="text-sm text-muted-foreground">{t('screens.legal.value0MaxinaByExafyValue1', { value0: new Date().getFullYear(), value1: translate("support.maxina.footer") })}</p>
        </footer>
      </PublicMain>
    </div>
  );
};

export default MaxinaSupport;
