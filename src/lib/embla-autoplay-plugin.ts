import type { UseEmblaCarouselType } from 'embla-carousel-react';

export interface AutoplayOptions {
  delay?: number;
  stopOnInteraction?: boolean;
  stopOnMouseEnter?: boolean;
  rootNode?: (emblaRoot: HTMLElement) => HTMLElement | null;
}

type EmblaCarouselType = UseEmblaCarouselType[1];

export type AutoplayType = {
  name: string;
  options: Partial<AutoplayOptions>;
  init: (embla: EmblaCarouselType, optionsHandler: any) => void;
  destroy: () => void;
  play: () => void;
  stop: () => void;
  reset: () => void;
};

export function Autoplay(options: AutoplayOptions = {}): any {
  const {
    delay = 6000,
    stopOnInteraction = true,
    stopOnMouseEnter = true,
    rootNode = (emblaRoot) => emblaRoot,
  } = options;

  let emblaApi: EmblaCarouselType;
  let timeoutId: NodeJS.Timeout | undefined;
  let isPlaying = false;
  let userHasInteracted = false;

  const play = () => {
    if (userHasInteracted && stopOnInteraction) return;
    if (!emblaApi) return;

    stop();
    isPlaying = true;
    timeoutId = setTimeout(() => {
      if (emblaApi && isPlaying) {
        emblaApi.scrollNext();
      }
    }, delay);
  };

  const stop = () => {
    isPlaying = false;
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  const reset = () => {
    userHasInteracted = false;
    isPlaying = false;
    play();
  };

  const onPointerDown = () => {
    if (stopOnInteraction) {
      userHasInteracted = true;
    }
    stop();
  };

  const onMouseEnter = () => {
    if (stopOnMouseEnter) {
      stop();
    }
  };

  const onMouseLeave = () => {
    if (!userHasInteracted || !stopOnInteraction) {
      play();
    }
  };

  const onSelect = () => {
    play();
  };

  const init = (embla: EmblaCarouselType) => {
    emblaApi = embla;
    const root = rootNode(emblaApi.rootNode());
    
    if (root) {
      root.addEventListener('pointerdown', onPointerDown);
      if (stopOnMouseEnter) {
        root.addEventListener('mouseenter', onMouseEnter);
        root.addEventListener('mouseleave', onMouseLeave);
      }
    }

    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', play);
    play();
  };

  const destroy = () => {
    stop();
    if (emblaApi) {
      const root = rootNode(emblaApi.rootNode());
      if (root) {
        root.removeEventListener('pointerdown', onPointerDown);
        root.removeEventListener('mouseenter', onMouseEnter);
        root.removeEventListener('mouseleave', onMouseLeave);
      }
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', play);
    }
  };

  return {
    name: 'autoplay',
    options,
    init,
    destroy,
    play,
    stop,
    reset,
  };
}
