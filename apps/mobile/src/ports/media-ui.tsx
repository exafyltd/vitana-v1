/**
 * VTID-05677 (native-wave2-media-hub-r2/media-hub) — the Media Hub's UI port:
 * the lucide glyphs the web `Mobile*` media components draw
 * (`MobileShortSlide.tsx`, `MobileMusicList.tsx`, `MobilePodcastList.tsx`,
 * `ShortCommentsSheet.tsx`, `UnifiedUploadModal.tsx`) that `src/ports/ui.tsx`
 * does not list. Screen files read them only through this port.
 */
export {
  ArrowLeft,
  Calendar,
  Clock,
  Film,
  Heart,
  Loader2,
  MessageCircle,
  Mic,
  Music,
  Pause,
  Pencil,
  Play,
  Plane,
  Plus,
  RotateCcw,
  Search,
  Send,
  Share2,
  Trash2,
  Upload,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
