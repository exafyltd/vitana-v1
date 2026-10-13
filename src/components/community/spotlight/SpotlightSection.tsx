import * as React from 'react';
import { Link } from 'react-router-dom';
import { t } from '@/lib/i18n-toast';

/**
 * VTID-05110 — a titled block on a social Spotlight screen, with an optional
 * "See all" link. Headings are real `h2`s so the keyboard / screen-reader path
 * through the stage follows the sections.
 */
export function SpotlightSection({
  id,
  title,
  seeAllTo,
  children,
}: {
  id: string;
  title: string;
  seeAllTo?: string;
  children: React.ReactNode;
}) {
  const headingId = `sp-section-${id}`;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3" data-spotlight-section={id}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-bold text-foreground">
          {title}
        </h2>
        {seeAllTo && (
          <Link to={seeAllTo} className="text-sm font-semibold text-primary hover:underline">
            {t('spotlightSocial.common.seeAll')}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Rail heading — rails hold only compact / row cards (SR-08). */
export function RailHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h3>;
}
