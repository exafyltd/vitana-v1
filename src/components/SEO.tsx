import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'event';
  url?: string;
  noindex?: boolean;
}

const SEO = ({ title, description, canonical, image, imageAlt, type = 'website', url, noindex }: SEOProps) => {
  useEffect(() => {
    document.title = title;

    // Update meta tags helper
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let meta = document.querySelector(selector);
      if (!meta) {
        meta = document.createElement('meta');
        if (selector.includes('property=')) {
          meta.setAttribute('property', selector.match(/property="([^"]+)"/)?.[1] || '');
        } else {
          meta.setAttribute('name', selector.match(/name="([^"]+)"/)?.[1] || '');
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute(attribute, value);
    };

    // Standard meta description
    if (description) {
      updateMetaTag('meta[name="description"]', 'content', description);
    }

    if (noindex) {
      updateMetaTag('meta[name="robots"]', 'content', 'noindex, nofollow');
    }

    // Canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Open Graph tags
    updateMetaTag('meta[property="og:site_name"]', 'content', 'MAXINA');
    updateMetaTag('meta[property="og:title"]', 'content', title);
    if (description) {
      updateMetaTag('meta[property="og:description"]', 'content', description);
    }
    if (image) {
      updateMetaTag('meta[property="og:image"]', 'content', image);
      updateMetaTag('meta[property="og:image:alt"]', 'content', imageAlt || title);
      // Image dimensions for optimal WhatsApp preview
      updateMetaTag('meta[property="og:image:width"]', 'content', '1200');
      updateMetaTag('meta[property="og:image:height"]', 'content', '630');
    }
    updateMetaTag('meta[property="og:type"]', 'content', type);
    if (url) {
      updateMetaTag('meta[property="og:url"]', 'content', url);
    }

    // Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    updateMetaTag('meta[name="twitter:title"]', 'content', title);
    if (description) {
      updateMetaTag('meta[name="twitter:description"]', 'content', description);
    }
    if (image) {
      updateMetaTag('meta[name="twitter:image"]', 'content', image);
      updateMetaTag('meta[name="twitter:image:alt"]', 'content', imageAlt || title);
    }
  }, [title, description, canonical, image, imageAlt, type, url, noindex]);

  return null;
};

export default SEO;
