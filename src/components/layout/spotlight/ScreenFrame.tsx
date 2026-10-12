import * as React from 'react';
import SubNavigation from '@/components/SubNavigation';
import StandardHeader from '@/components/StandardHeader';
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { SplitBar, SplitBarList, SplitBarTrigger } from '@/components/ui/split-bar';
import { cn } from '@/lib/utils';
import { ARCHETYPE_WIDTH, type Archetype } from './archetypes';
import { SpotlightLayout } from './SpotlightLayout';
import { StageCrossFade } from './StageCrossFade';

/**
 * VTID-05105 — the only way a Spotlight screen composes its in-screen chrome
 * (contract SR-02 / SR-03). It renders the EXISTING Vitanaland components in
 * the fixed order:
 *
 *   SubNavigation (screens with sections)
 *   StandardHeader density="compact"
 *   UtilityActionButton row  ·  SplitBar tabs at the inline end of that row
 *   SpotlightLayout (stage + optional context rail)
 *
 * The SplitBar sits at the end of the utility row — the place MobileModePill
 * occupies on phones. It is laid out NEXT TO the utility row rather than in its
 * `trailingElement` slot, because that slot lives inside the row's horizontal
 * scroller and would scroll the tabs out of view.
 *
 * `immersive` renders no in-screen chrome at all. The sidebar, its shortcut
 * bar, search, profile/role switcher, Soundscape, Language and the ORB belong
 * to AppLayout and are never touched here.
 */
type SubNavItems = React.ComponentProps<typeof SubNavigation>['items'];

export interface ScreenFrameTabs {
  value: string;
  onValueChange: (value: string) => void;
  items: { value: string; label: React.ReactNode }[];
  ariaLabel?: string;
}

export interface ScreenFrameProps {
  archetype: Archetype;
  subNav?: { items: SubNavItems; rightActions?: React.ReactNode };
  header?: { title: string; description: string; emoji?: string; syncTimestamp?: string | null };
  utility?: {
    children?: React.ReactNode;
    afterGiftVoucherChildren?: React.ReactNode;
    trailingElement?: React.ReactNode;
    hideLifeCompass?: boolean;
    hideGiftVoucher?: boolean;
  };
  /** In-page tabs (SplitBar). Content panes (SplitBarContent) go in `children`. */
  tabs?: ScreenFrameTabs;
  rail?: React.ReactNode;
  railLabel?: string;
  className?: string;
  children: React.ReactNode;
}

export function ScreenFrame({ archetype, subNav, header, utility, tabs, rail, railLabel, className, children }: ScreenFrameProps) {
  const immersive = archetype === 'immersive';

  const tabList = tabs ? (
    <SplitBarList aria-label={tabs.ariaLabel} className="mb-0 w-auto shrink-0 gap-1 rounded-full bg-muted/60 p-1 pb-1">
      {tabs.items.map((item) => (
        <SplitBarTrigger key={item.value} value={item.value} className="flex-none px-3.5 py-1.5">
          {item.label}
        </SplitBarTrigger>
      ))}
    </SplitBarList>
  ) : null;

  const body = (
    <>
      {!immersive && (utility || tabList) && (
        <div className="flex items-center gap-4" data-spotlight-utility="">
          <div className="min-w-0 flex-1">
            {utility && (
              <UtilityActionButton
                compact
                afterGiftVoucherChildren={utility.afterGiftVoucherChildren}
                trailingElement={utility.trailingElement}
                hideLifeCompass={utility.hideLifeCompass}
                hideGiftVoucher={utility.hideGiftVoucher}
              >
                {utility.children}
              </UtilityActionButton>
            )}
          </div>
          {tabList}
        </div>
      )}
      <SpotlightLayout width={ARCHETYPE_WIDTH[archetype]} rail={rail} railLabel={railLabel} className={immersive ? undefined : 'mt-4'}>
        <StageCrossFade>{children}</StageCrossFade>
      </SpotlightLayout>
    </>
  );

  return (
    <div data-archetype={archetype} className={cn('flex min-h-full flex-col', className)}>
      {!immersive && subNav && <SubNavigation items={subNav.items} rightActions={subNav.rightActions} />}
      <div className={cn(immersive ? 'flex-1' : 'flex-1 px-6 pb-10 pt-5')}>
        {!immersive && header && (
          <StandardHeader
            density="compact"
            title={header.title}
            description={header.description}
            emoji={header.emoji}
            syncTimestamp={header.syncTimestamp}
            className="mb-3"
          />
        )}
        {tabs ? (
          <SplitBar value={tabs.value} onValueChange={tabs.onValueChange}>
            {body}
          </SplitBar>
        ) : (
          body
        )}
      </div>
    </div>
  );
}
