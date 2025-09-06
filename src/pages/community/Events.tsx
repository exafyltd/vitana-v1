import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { NewsCard } from "@/components/crossover/NewsCard";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { SplitBar, SplitBarContent, SplitBarList, SplitBarTrigger } from "@/components/ui/split-bar";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Search, Apple, Droplets, Dumbbell, Brain, Moon, DollarSign } from "lucide-react";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { useState } from "react";

import { communityNavigation } from "@/config/navigation";

// Mock data for community events with pricing
const todayEvents = [
  {
    title: "Advanced Yoga Workshop",
    description: "Master advanced poses and breathing techniques with certified instructors",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Sarah Miller", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Wellness Studio",
    attendees: 18,
    timestamp: "9:00 AM",
    price: 35
  },
  {
    title: "Community Garden Tour",
    description: "Explore organic gardening techniques and harvest fresh produce",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Emma Wilson", avatar: "/lovable-uploads/emma-wilson-avatar.jpg" },
    location: "Community Garden",
    attendees: 25,
    timestamp: "10:30 AM",
    price: "free" as const
  },
  {
    title: "HIIT Training Session",
    description: "High-intensity workout designed for maximum results in minimum time",
    imageUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Mike Thompson", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Fitness Center",
    attendees: 15,
    timestamp: "6:00 PM",
    price: 25
  },
  {
    title: "Hydration Workshop",
    description: "Learn optimal hydration strategies for peak performance and health",
    imageUrl: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Hydration",
    icon: Droplets,
    author: { name: "Dr. Roberts", avatar: "/lovable-uploads/dr-roberts-avatar.jpg" },
    location: "Health Center",
    attendees: 12,
    timestamp: "2:00 PM",
    price: "free" as const
  },
  {
    title: "Sleep Optimization Seminar",
    description: "Evidence-based strategies for improving sleep quality and duration",
    imageUrl: "https://images.unsplash.com/photo-1520206715542-7088b3d3c6a1?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Lisa Chen", avatar: "/lovable-uploads/lisa-chen-avatar.jpg" },
    location: "Sleep Lab",
    attendees: 20,
    timestamp: "7:30 PM",
    price: 45
  },
  {
    title: "Mindful Cooking Class",
    description: "Learn to prepare nutritious meals with mindfulness and intention",
    imageUrl: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Chef Tae", avatar: "/lovable-uploads/tae-min-avatar.jpg" },
    location: "Culinary Studio",
    attendees: 16,
    timestamp: "4:00 PM",
    price: 55
  }
];

const upcomingEvents = [
  {
    title: "Weekend Wellness Retreat",
    description: "Complete wellness experience with yoga, meditation, and healthy meals",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    category: "event" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Wellness Team", avatar: "/lovable-uploads/design-team-avatar.jpg" },
    location: "Retreat Center",
    attendees: 30,
    timestamp: "Sat 8:00 AM",
    price: 150
  },
  {
    title: "Free Fitness Assessment",
    description: "Comprehensive fitness evaluation and personalized recommendations",
    imageUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Exercise",
    icon: Dumbbell,
    author: { name: "Fitness Team", avatar: "/lovable-uploads/mike-thompson-avatar.jpg" },
    location: "Gym",
    attendees: 8,
    timestamp: "Mon 5:00 PM",
    price: "free" as const
  },
  {
    title: "Nutrition Masterclass",
    description: "Advanced nutrition principles for optimal health and performance",
    imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Nutrition",
    icon: Apple,
    author: { name: "Nutritionist Se Hun", avatar: "/lovable-uploads/se-hun-oh-avatar.jpg" },
    location: "Learning Center",
    attendees: 22,
    timestamp: "Wed 1:00 PM",
    price: 65
  },
  {
    title: "Community Water Challenge",
    description: "30-day hydration challenge with daily tracking and prizes",
    imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&h=600&fit=crop",
    category: "community" as const,
    pillar: "Hydration",
    icon: Droplets,
    author: { name: "Health Coach Murphy", avatar: "/lovable-uploads/murphy-avatar.jpg" },
    location: "Online & In-Person",
    attendees: 75,
    timestamp: "Thu 6:00 PM",
    price: "free" as const
  },
  {
    title: "Sleep Therapy Workshop",
    description: "Professional sleep therapy techniques and personalized plans",
    imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Sleep",
    icon: Moon,
    author: { name: "Sleep Therapist James", avatar: "/lovable-uploads/james-davis-avatar.jpg" },
    location: "Therapy Center",
    attendees: 10,
    timestamp: "Fri 8:00 PM",
    price: 85
  },
  {
    title: "Mental Resilience Training",
    description: "Build psychological strength and emotional intelligence",
    imageUrl: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop",
    category: "wellness" as const,
    pillar: "Mental",
    icon: Brain,
    author: { name: "Dr. Sarah", avatar: "/lovable-uploads/sarah-miller-avatar.jpg" },
    location: "Psychology Center",
    attendees: 14,
    timestamp: "Sat 11:00 AM",
    price: 75
  }
];

const renderEventGrid = (events: typeof todayEvents) => {
  const rows = [];
  
  // Group events into rows of 3 using the same pattern as Meetups
  for (let i = 0; i < events.length; i += 3) {
    const rowEvents = events.slice(i, i + 3);
    const isEvenRow = Math.floor(i / 3) % 2 === 0;
    
    rows.push(
      <div key={i} className="grid grid-cols-12 gap-6 mb-6" style={{ minHeight: '280px' }}>
        {isEvenRow ? (
          // Row pattern: big + small + small
          <>
            <div className="col-span-6">
              <NewsCard
                key={`${i}-0`}
                title={rowEvents[0]?.title || ""}
                description={rowEvents[0]?.description}
                imageUrl={rowEvents[0]?.imageUrl || ""}
                pillar={rowEvents[0]?.pillar}
                author={rowEvents[0]?.author}
                location={rowEvents[0]?.location}
                attendees={rowEvents[0]?.attendees}
                timestamp={rowEvents[0]?.timestamp}
                price={rowEvents[0]?.price}
                className="h-full"
              />
            </div>
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  price={rowEvents[1].price}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  price={rowEvents[2].price}
                  className="h-full"
                />
              </div>
            )}
          </>
        ) : (
          // Row pattern: small + small + big
          <>
            {rowEvents[0] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-0`}
                  title={rowEvents[0].title}
                  description={rowEvents[0].description}
                  imageUrl={rowEvents[0].imageUrl}
                  pillar={rowEvents[0].pillar}
                  author={rowEvents[0].author}
                  location={rowEvents[0].location}
                  attendees={rowEvents[0].attendees}
                  timestamp={rowEvents[0].timestamp}
                  price={rowEvents[0].price}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[1] && (
              <div className="col-span-3">
                <NewsCard
                  key={`${i}-1`}
                  title={rowEvents[1].title}
                  description={rowEvents[1].description}
                  imageUrl={rowEvents[1].imageUrl}
                  pillar={rowEvents[1].pillar}
                  author={rowEvents[1].author}
                  location={rowEvents[1].location}
                  attendees={rowEvents[1].attendees}
                  timestamp={rowEvents[1].timestamp}
                  price={rowEvents[1].price}
                  className="h-full"
                />
              </div>
            )}
            {rowEvents[2] && (
              <div className="col-span-6">
                <NewsCard
                  key={`${i}-2`}
                  title={rowEvents[2].title}
                  description={rowEvents[2].description}
                  imageUrl={rowEvents[2].imageUrl}
                  pillar={rowEvents[2].pillar}
                  author={rowEvents[2].author}
                  location={rowEvents[2].location}
                  attendees={rowEvents[2].attendees}
                  timestamp={rowEvents[2].timestamp}
                  price={rowEvents[2].price}
                  className="h-full"
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }
  
  return <>{rows}</>;
};

export default function Events() {
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("today");

  return (
    <AppLayout>
      <SEO title="Events | Community" description="Create and manage your events and special occasions" canonical={window.location.href} />
      <SubNavigation items={communityNavigation} />
      <div className="p-6">
        <StandardHeader
          title="Events"
          description="Create and manage your events and special occasions."
          emoji="🎉"
        />

        {/* Utility Action Button */}
        <UtilityActionButton>
          <Button variant="outline" size="sm">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button size="sm" onClick={() => setCreateEventOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Event
          </Button>
        </UtilityActionButton>

        {/* Split Navigation */}
        <SplitBar value={activeTab} onValueChange={setActiveTab} className="w-full">
          <SplitBarList>
            <SplitBarTrigger value="today">Today</SplitBarTrigger>
            <SplitBarTrigger value="upcoming">Upcoming</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="today">
            <div className="mt-6">
              {renderEventGrid(todayEvents)}
            </div>
          </SplitBarContent>

          <SplitBarContent value="upcoming">
            <div className="mt-6">
              {renderEventGrid(upcomingEvents)}
            </div>
          </SplitBarContent>
        </SplitBar>
      </div>
      
      {/* Create Event Popup */}
      <CreateEventPopup 
        isOpen={createEventOpen} 
        onClose={() => setCreateEventOpen(false)}
      />
    </AppLayout>
  );
}