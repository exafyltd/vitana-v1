/** VTID-05143 — navigate to a card's deep link from `CARD_DEEP_LINKS`. */
import { useNavigate } from 'react-router-dom';
import { CARD_DEEP_LINKS, type VitanaCardType } from '@/components/vitana/vitana-card-catalog';

export function useCardNavigate(cardType: VitanaCardType): () => void {
  const navigate = useNavigate();
  return () => {
    const to = CARD_DEEP_LINKS[cardType];
    if (to) navigate(to);
  };
}
