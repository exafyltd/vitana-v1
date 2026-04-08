import { useEffect } from 'react';
import { Play, Pause, X, SkipBack, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAudioPlayer, updateAudioTime, updateAudioDuration, globalState, notifyListeners } from '@/hooks/useAudioPlayer';

export function MiniAudioPlayer() {
  const {
    currentMedia,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    togglePlay,
    skipBackward,
    skipForward,
    seek,
    setPlaybackRate,
    closeMedia,
  } = useAudioPlayer();

  // Attach event listeners to the singleton audio element
  useEffect(() => {
    const audio = globalState.audioElement;
    if (!audio) return;

    const handleTimeUpdate = () => updateAudioTime(audio.currentTime);
    const handleDurationChange = () => updateAudioDuration(audio.duration);
    const handleEnded = () => {
      audio.pause();
      updateAudioTime(0);
    };

    const handlePlay = () => {
      if (!globalState.isPlaying) {
        globalState.isPlaying = true;
        notifyListeners();
      }
    };

    const handlePause = () => {
      if (globalState.isPlaying) {
        globalState.isPlaying = false;
        notifyListeners();
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []);

  if (!currentMedia) return null;

  const formatTime = (seconds: number) => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-sidebar border-t border-border shadow-lg z-40">
      <div className="max-w-screen-2xl mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Media Info */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {currentMedia.imageUrl && (
              <img
                src={currentMedia.imageUrl}
                alt={currentMedia.title}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {currentMedia.title}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {currentMedia.creator}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipBackward(10)}
              className="h-8 w-8 p-0"
            >
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={togglePlay}
              className="h-10 w-10 p-0 rounded-full bg-primary hover:bg-primary/90"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5 text-primary-foreground" />
              ) : (
                <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => skipForward(10)}
              className="h-8 w-8 p-0"
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress */}
          <div className="flex-1 max-w-md hidden md:flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(currentTime)}
            </span>
            <Slider
              value={[progressPercentage]}
              onValueChange={([value]) => {
                const newTime = (value / 100) * duration;
                seek(newTime);
              }}
              max={100}
              step={0.1}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(duration)}
            </span>
          </div>

          {/* Speed & Close */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
                const currentIndex = rates.indexOf(playbackRate);
                const nextRate = rates[(currentIndex + 1) % rates.length];
                setPlaybackRate(nextRate);
              }}
              className="h-8 px-2 text-xs font-medium"
            >
              {playbackRate}x
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={closeMedia}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
