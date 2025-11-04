import { InsightCard } from "./InsightCard";
import { useDemoMatches } from "@/hooks/useDemoMatches";

export function InsightsSummaryGrid() {
  const { people, groups, events } = useDemoMatches();

  // Get top people with 70%+ compatibility
  const topPeople = people.filter(p => p.compatibility_score >= 70).slice(0, 5);

  // Get best group fit (highest compatibility)
  const bestGroup = groups.sort((a, b) => b.compatibility_score - a.compatibility_score)[0];

  // Get top 3 upcoming events
  const upcomingEvents = events
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <InsightCard 
        type="people" 
        data={{ people: topPeople }}
      />
      <InsightCard 
        type="groups" 
        data={{ group: bestGroup }}
      />
      <InsightCard 
        type="events" 
        data={{ events: upcomingEvents }}
      />
      <InsightCard 
        type="coaches"
        data={{ coachType: "Wellness & Mindfulness" }}
      />
    </div>
  );
}
