import { NewsCard } from "@/components/crossover/NewsCard";

interface AISpotlightCardProps {
  insight?: string;
  className?: string;
}

export function AISpotlightCard({
  insight = "Why Autopilot suggested today's top actions",
  className
}: AISpotlightCardProps) {
  return (
    <NewsCard
      title="AI Spotlight 🔮"
      description={insight}
      imageUrl="https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=600&fit=crop"
      pillar="Mental"
      author={{ name: "AI Reasoning", avatar: "/lovable-uploads/design-team-avatar.jpg" }}
      timestamp="Real-time Analysis"
      className={className}
    />
  );
}