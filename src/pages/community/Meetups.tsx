import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { NewsCard } from "@/components/crossover/NewsCard";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { communityNavigation } from "@/config/navigation";
import { Apple, Droplets, Dumbbell, Brain, Moon } from "lucide-react";

// Mock data for meetup events with different pillar categories
const todayEvents = [
  {
    title: "Morning Yoga & Meditation",
    description: "Start your day with peaceful yoga and mindfulness meditation in the park",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Central Park",
    attendees: 15,
    timestamp: "8:00 AM",
    size: "large"
  },
  {
    title: "Healthy Cooking Workshop",
    description: "Learn to prepare nutritious meals with local organic ingredients",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Chef Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Kitchen",
    attendees: 12,
    timestamp: "2:00 PM",
    size: "medium"
  },
  {
    title: "Hydration Challenge",
    description: "Join our community water tracking challenge and learn about proper hydration",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Hydration", 
    icon: Droplets,
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Virtual",
    attendees: 45,
    timestamp: "10:00 AM",
    size: "small"
  },
  {
    title: "Evening Sleep Workshop",
    description: "Learn techniques for better sleep quality and nighttime routines",
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Sleep Expert Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Wellness Center",
    attendees: 8,
    timestamp: "7:00 PM",
    size: "medium"
  },
  {
    title: "HIIT Fitness Bootcamp",
    description: "High-intensity interval training session for all fitness levels",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Trainer Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Fitness Studio",
    attendees: 20,
    timestamp: "6:00 PM",
    size: "large"
  },
  {
    title: "Mindful Eating Circle",
    description: "Practice mindful eating techniques and share healthy recipes",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Nutritionist Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Community Center",
    attendees: 10,
    timestamp: "12:00 PM",
    size: "small"
  }
];

const upcomingEvents = [
  {
    title: "Weekend Hiking Adventure",
    description: "Explore local trails and connect with nature while getting great exercise",
    imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Adventure Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Mountain Trail",
    attendees: 25,
    timestamp: "Tomorrow 9:00 AM",
    size: "large"
  },
  {
    title: "Water Intake Workshop",
    description: "Understanding your daily hydration needs and tracking methods",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Hydration",
    icon: Droplets,
    author: { name: "Health Coach Se Hun", avatar: "/lovable-uploads/se-hun-oh-avatar.jpg" },
    location: "Health Center",
    attendees: 18,
    timestamp: "Mon 3:00 PM",
    size: "medium"
  },
  {
    title: "Stress Management Seminar",
    description: "Learn practical techniques for managing daily stress and anxiety",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Therapist James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Therapy Center",
    attendees: 12,
    timestamp: "Tue 6:00 PM",
    size: "small"
  },
  {
    title: "Sleep Hygiene Bootcamp",
    description: "Transform your sleep routine with evidence-based techniques",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Sleep Specialist Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Sleep Lab",
    attendees: 15,
    timestamp: "Wed 8:00 PM",
    size: "medium"
  },
  {
    title: "Plant-Based Cooking Class",
    description: "Master the art of delicious and nutritious plant-based meals",
    imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Chef Sarah", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Culinary School",
    attendees: 16,
    timestamp: "Thu 5:00 PM",
    size: "large"
  },
  {
    title: "Morning Strength Training",
    description: "Build muscle and improve bone density with guided strength exercises",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Personal Trainer Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Gym",
    attendees: 8,
    timestamp: "Fri 7:00 AM",
    size: "small"
  },
  {
    title: "Hydration & Recovery Session",
    description: "Learn proper hydration strategies for exercise recovery",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Hydration",
    icon: Droplets,
    author: { name: "Sports Nutritionist", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Sports Center",
    attendees: 22,
    timestamp: "Sat 11:00 AM",
    size: "medium"
  },
  {
    title: "Mental Wellness Workshop",
    description: "Building resilience and emotional intelligence through practical exercises",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Wellness Coach Emma", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Mindfulness Center",
    attendees: 30,
    timestamp: "Sat 2:00 PM",
    size: "large"
  },
  {
    title: "Sleep Quality Assessment",
    description: "Get personalized insights into your sleep patterns and quality",
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Sleep Doctor Mike", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Sleep Clinic",
    attendees: 6,
    timestamp: "Sun 10:00 AM",
    size: "small"
  },
  {
    title: "Nutrition Planning Workshop",
    description: "Create personalized meal plans that fit your lifestyle and goals",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Dietitian Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Nutrition Center",
    attendees: 14,
    timestamp: "Sun 3:00 PM",
    size: "medium"
  },
  {
    title: "Evening Yoga Flow",
    description: "Gentle yoga practice to unwind and prepare for restful sleep",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Yoga Instructor", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Yoga Studio",
    attendees: 18,
    timestamp: "Sun 6:00 PM",
    size: "large"
  },
  {
    title: "Functional Fitness Workshop",
    description: "Learn exercises that improve daily movement and prevent injury",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Physical Therapist", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Rehabilitation Center",
    attendees: 12,
    timestamp: "Next Mon 4:00 PM",
    size: "small"
  },
  {
    title: "Hydration & Skin Health",
    description: "Discover how proper hydration affects your skin and overall health",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Hydration",
    icon: Droplets,
    author: { name: "Dermatologist Lisa", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Medical Center",
    attendees: 20,
    timestamp: "Next Tue 1:00 PM",
    size: "medium"
  },
  {
    title: "Better Sleep Challenge",
    description: "30-day challenge to improve your sleep habits and quality",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Challenge Host Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Online Community",
    attendees: 50,
    timestamp: "Next Wed 9:00 AM",
    size: "large"
  }
];

const getCardSizeClass = (size: string) => {
  switch (size) {
    case "large":
      return "col-span-2 row-span-2";
    case "medium":
      return "col-span-1 row-span-2";
    case "small":
    default:
      return "col-span-1 row-span-1";
  }
};

const renderEventGrid = (events: typeof todayEvents) => {
  const rows = [];
  
  // Group events into rows of 3
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-4 gap-4 mb-4">
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <NewsCard
              key={`${i}-0`}
              title={rowEvents[0]?.title || ""}
              description={rowEvents[0]?.description}
              imageUrl={rowEvents[0]?.imageUrl || ""}
              category={rowEvents[0]?.category || "event"}
              pillar={rowEvents[0]?.pillar}
              icon={rowEvents[0]?.icon}
              author={rowEvents[0]?.author}
              location={rowEvents[0]?.location}
              attendees={rowEvents[0]?.attendees}
              timestamp={rowEvents[0]?.timestamp}
              className="col-span-2 h-64"
            />
            {rowEvents[1] && (
              <NewsCard
                key={`${i}-1`}
                title={rowEvents[1].title}
                description={rowEvents[1].description}
                imageUrl={rowEvents[1].imageUrl}
                category={rowEvents[1].category}
                pillar={rowEvents[1].pillar}
                icon={rowEvents[1].icon}
                author={rowEvents[1].author}
                location={rowEvents[1].location}
                attendees={rowEvents[1].attendees}
                timestamp={rowEvents[1].timestamp}
                className="col-span-1 h-64"
              />
            )}
            {rowEvents[2] && (
              <NewsCard
                key={`${i}-2`}
                title={rowEvents[2].title}
                description={rowEvents[2].description}
                imageUrl={rowEvents[2].imageUrl}
                category={rowEvents[2].category}
                pillar={rowEvents[2].pillar}
                icon={rowEvents[2].icon}
                author={rowEvents[2].author}
                location={rowEvents[2].location}
                attendees={rowEvents[2].attendees}
                timestamp={rowEvents[2].timestamp}
                className="col-span-1 h-64"
              />
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowEvents[0] && (
              <NewsCard
                key={`${i}-0`}
                title={rowEvents[0].title}
                description={rowEvents[0].description}
                imageUrl={rowEvents[0].imageUrl}
                category={rowEvents[0].category}
                pillar={rowEvents[0].pillar}
                icon={rowEvents[0].icon}
                author={rowEvents[0].author}
                location={rowEvents[0].location}
                attendees={rowEvents[0].attendees}
                timestamp={rowEvents[0].timestamp}
                className="col-span-1 h-64"
              />
            )}
            {rowEvents[1] && (
              <NewsCard
                key={`${i}-1`}
                title={rowEvents[1].title}
                description={rowEvents[1].description}
                imageUrl={rowEvents[1].imageUrl}
                category={rowEvents[1].category}
                pillar={rowEvents[1].pillar}
                icon={rowEvents[1].icon}
                author={rowEvents[1].author}
                location={rowEvents[1].location}
                attendees={rowEvents[1].attendees}
                timestamp={rowEvents[1].timestamp}
                className="col-span-1 h-64"
              />
            )}
            {rowEvents[2] && (
              <NewsCard
                key={`${i}-2`}
                title={rowEvents[2].title}
                description={rowEvents[2].description}
                imageUrl={rowEvents[2].imageUrl}
                category={rowEvents[2].category}
                pillar={rowEvents[2].pillar}
                icon={rowEvents[2].icon}
                author={rowEvents[2].author}
                location={rowEvents[2].location}
                attendees={rowEvents[2].attendees}
                timestamp={rowEvents[2].timestamp}
                className="col-span-2 h-64"
              />
            )}
          </>
        )}
      </div>
    );
  }
  
  return <div className="space-y-0">{rows}</div>;
};

export default function Meetups() {
  return (
    <AppLayout>
      <SEO title="Meetups | Community" description="Discover and join local meetups and events" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Wellness Meetups"
          description="Join local wellness events focused on the five pillars of health"
          emoji="🤝"
        />
        
        <SplitBar defaultValue="today" className="w-full">
          <SplitBarList className="grid-cols-2 mb-6">
            <SplitBarTrigger value="today" className="rounded-l-lg">
              Today
            </SplitBarTrigger>
            <SplitBarTrigger value="upcoming" className="rounded-r-lg">
              Upcoming
            </SplitBarTrigger>
          </SplitBarList>
          
          <SplitBarContent value="today">
            {renderEventGrid(todayEvents)}
          </SplitBarContent>
          
          <SplitBarContent value="upcoming">
            {renderEventGrid(upcomingEvents)}
          </SplitBarContent>
        </SplitBar>
      </div>
    </AppLayout>
  );
}