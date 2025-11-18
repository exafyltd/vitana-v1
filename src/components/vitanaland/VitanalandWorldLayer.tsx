import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { DawnValley } from './scenes/DawnValley';
import { AuroraLake } from './scenes/AuroraLake';
import { WellnessForest } from './scenes/WellnessForest';
import { CloudIslands } from './scenes/CloudIslands';
import { NebulaValley } from './scenes/NebulaValley';
import { useVitanalandNavigation } from '@/context/VitanalandNavigationContext';

const scenes = [
  { component: DawnValley, duration: 30000 },
  { component: AuroraLake, duration: 30000 },
  { component: WellnessForest, duration: 30000 },
  { component: CloudIslands, duration: 30000 },
  { component: NebulaValley, duration: 30000 },
];

export function VitanalandWorldLayer() {
  const { activeSceneIndex, setActiveSceneIndex, worldVisible } = useVitanalandNavigation();
  const [preloadSceneIndex, setPreloadSceneIndex] = useState(1);

  // Auto-cycle scenes
  useEffect(() => {
    if (!worldVisible) return;

    const timer = setTimeout(() => {
      const nextIndex = (activeSceneIndex + 1) % scenes.length;
      setActiveSceneIndex(nextIndex);
      setPreloadSceneIndex((nextIndex + 1) % scenes.length);
    }, scenes[activeSceneIndex].duration);

    return () => clearTimeout(timer);
  }, [activeSceneIndex, worldVisible, setActiveSceneIndex]);

  // Preload next scene
  useEffect(() => {
    setPreloadSceneIndex((activeSceneIndex + 1) % scenes.length);
  }, [activeSceneIndex]);

  if (!worldVisible) return null;

  return (
    <div className="absolute inset-0" style={{ willChange: 'transform, opacity' }}>
      {/* Only render active and next scene */}
      {scenes.map((scene, index) => {
        if (index !== activeSceneIndex && index !== preloadSceneIndex) return null;
        
        const SceneComponent = scene.component;
        return (
          <SceneComponent
            key={index}
            isActive={index === activeSceneIndex}
          />
        );
      })}
    </div>
  );
}
