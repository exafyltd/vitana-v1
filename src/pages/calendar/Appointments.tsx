import { useState } from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search,
  Plus, 
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Calendar,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy
} from "lucide-react";

const calendarSubItems = [
  { id: "overview", name: "Overview", path: "/calendar" },
  { id: "month", name: "Month View", path: "/calendar/month" },
  { id: "week", name: "Week View", path: "/calendar/week" },
  { id: "day", name: "Day View", path: "/calendar/day" },
  { id: "appointments", name: "Appointments", path: "/calendar/appointments" },
  { id: "reminders", name: "Reminders", path: "/calendar/reminders" },
  { id: "motivation", name: "Motivation", path: "/calendar/motivation" },
  { id: "progress", name: "Goal Progress", path: "/calendar/progress" },
  { id: "recommendations", name: "Recommendations", path: "/calendar/recommendations" },
];

const mockAppointments = [
  {
    id: 1,
    title: "Quarterly Health Assessment",
    date: "2024-01-15",
    time: "09:00 - 10:30",
    type: "health",
    status: "confirmed",
    location: "Medical Center - Room 301",
    isVirtual: false,
    attendees: [
      { name: "Dr. Sarah Johnson", avatar: "", role: "Primary Care Physician", email: "s.johnson@healthcenter.com" },
      { name: "Nurse Lisa", avatar: "", role: "Clinical Assistant", email: "lisa@healthcenter.com" }
    ],
    agenda: ["Blood pressure check", "Weight measurement", "Health goals review", "Prescription updates"],
    notes: "Bring current medication list and insurance card",
    attachments: ["Lab Results.pdf", "Previous Visit Summary.pdf"],
    goalTags: ["Physical Health", "Preventive Care"]
  },
  {
    id: 2,
    title: "Nutrition Planning Session",
    date: "2024-01-16",
    time: "14:00 - 15:00",
    type: "nutrition",
    status: "pending",
    location: "Video Call",
    isVirtual: true,
    attendees: [
      { name: "Emma Rodriguez", avatar: "", role: "Registered Dietitian", email: "emma@nutritionpro.com" }
    ],
    agenda: ["Current diet analysis", "Meal planning for next month", "Supplement recommendations", "Progress tracking setup"],
    notes: "Prepare 3-day food diary before the session",
    attachments: ["Nutrition Guidelines.pdf"],
    goalTags: ["Nutrition", "Weight Management"]
  },
  {
    id: 3,
    title: "Mental Health Check-in",
    date: "2024-01-18",
    time: "11:00 - 12:00",
    type: "mental-health",
    status: "confirmed",
    location: "Wellness Center - Room 205",
    isVirtual: false,
    attendees: [
      { name: "Dr. Michael Chen", avatar: "", role: "Licensed Therapist", email: "m.chen@wellnesscenter.com" }
    ],
    agenda: ["Stress level assessment", "Coping strategies review", "Goal setting for next quarter", "Mindfulness techniques"],
    notes: "Come prepared to discuss recent stress triggers",
    attachments: ["Mindfulness Resources.pdf"],
    goalTags: ["Mental Health", "Stress Management"]
  },
  {
    id: 4,
    title: "Fitness Consultation",
    date: "2024-01-20",
    time: "16:00 - 17:00",
    type: "fitness",
    status: "suggested",
    location: "Gym - Personal Training Area",
    isVirtual: false,
    attendees: [
      { name: "Alex Thompson", avatar: "", role: "Personal Trainer", email: "alex@fitnessstudio.com" }
    ],
    agenda: ["Fitness assessment", "Workout plan customization", "Equipment training", "Progress measurement setup"],
    notes: "Wear comfortable workout clothes and bring water bottle",
    attachments: [],
    goalTags: ["Physical Fitness", "Strength Training"]
  }
];

export default function Appointments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<typeof mockAppointments[0] | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-calendar-success text-white';
      case 'pending': return 'bg-calendar-accent text-white';
      case 'suggested': return 'bg-calendar-secondary text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'health': return 'bg-red-100 text-red-800 border-red-200';
      case 'nutrition': return 'bg-green-100 text-green-800 border-green-200';
      case 'mental-health': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fitness': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredAppointments = mockAppointments.filter(appointment =>
    appointment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    appointment.attendees.some(attendee => 
      attendee.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  return (
    <AppLayout>
      <SEO title="Appointments | Calendar" description="Deep dive into meeting details and manage all your health appointments" canonical={window.location.href} />
      <SubNavigation items={calendarSubItems} />
      
      <div className="p-6 bg-gradient-to-br from-calendar-background via-calendar-primary/5 to-calendar-secondary/5 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-calendar-card/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-calendar-primary/20 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Appointment View - Deep Dive 🔍
                </h1>
                <p className="text-muted-foreground">
                  Manage all details of your health and wellness appointments
                </p>
              </div>
              <Button className="gap-2 bg-calendar-primary hover:bg-calendar-primary/90">
                <Plus className="w-4 h-4" />
                Schedule Appointment
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search appointments or providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Appointments List */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs defaultValue="upcoming" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                  <TabsTrigger value="today">Today</TabsTrigger>
                  <TabsTrigger value="past">Past</TabsTrigger>
                </TabsList>
                
                <TabsContent value="upcoming" className="space-y-4 mt-6">
                  {filteredAppointments.map((appointment) => (
                    <Card 
                      key={appointment.id}
                      className={`bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20 hover:shadow-xl transition-all duration-300 cursor-pointer ${
                        selectedAppointment?.id === appointment.id ? 'ring-2 ring-calendar-primary' : ''
                      }`}
                      onClick={() => setSelectedAppointment(appointment)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-foreground">{appointment.title}</h3>
                              <Badge className={getTypeColor(appointment.type)}>
                                {appointment.type.replace('-', ' ')}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                {new Date(appointment.date).toLocaleDateString('en-US', { 
                                  weekday: 'short', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                {appointment.time}
                              </div>
                              <div className="flex items-center gap-2">
                                {appointment.isVirtual ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                {appointment.location}
                              </div>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                {appointment.attendees.length} participant(s)
                              </div>
                            </div>

                            {/* Attendees Preview */}
                            <div className="flex items-center gap-3 mb-3">
                              {appointment.attendees.slice(0, 3).map((attendee, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Avatar className="w-8 h-8">
                                    <AvatarImage src={attendee.avatar} />
                                    <AvatarFallback className="text-xs bg-calendar-primary text-white">
                                      {attendee.name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="text-sm font-medium">{attendee.name}</div>
                                    <div className="text-xs text-muted-foreground">{attendee.role}</div>
                                  </div>
                                </div>
                              ))}
                              {appointment.attendees.length > 3 && (
                                <div className="text-sm text-muted-foreground">
                                  +{appointment.attendees.length - 3} more
                                </div>
                              )}
                            </div>

                            {/* Goal Tags */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {appointment.goalTags.map((tag, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2 pt-4 border-t border-calendar-primary/10">
                          {appointment.isVirtual ? (
                            <Button size="sm" className="bg-calendar-primary hover:bg-calendar-primary/90">
                              <Video className="w-4 h-4 mr-2" />
                              Join Call
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              <MapPin className="w-4 h-4 mr-2" />
                              Directions
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <Phone className="w-4 h-4 mr-2" />
                            Contact
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="today">
                  <div className="text-center py-8 text-muted-foreground">
                    No appointments scheduled for today
                  </div>
                </TabsContent>
                
                <TabsContent value="past">
                  <div className="text-center py-8 text-muted-foreground">
                    Past appointments will appear here
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Appointment Detail Sidebar */}
            <div className="space-y-6">
              {selectedAppointment ? (
                <Card className="bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20">
                  <CardContent className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Appointment Details</h3>
                    
                    {/* Agenda */}
                    <div className="mb-6">
                      <h4 className="text-sm font-medium mb-2">Agenda</h4>
                      <ul className="space-y-1">
                        {selectedAppointment.agenda.map((item, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 rounded-full bg-calendar-primary"></div>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Notes */}
                    {selectedAppointment.notes && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Notes</h4>
                        <p className="text-sm text-muted-foreground bg-calendar-accent/10 p-3 rounded-lg border border-calendar-accent/20">
                          {selectedAppointment.notes}
                        </p>
                      </div>
                    )}

                    {/* Attachments */}
                    {selectedAppointment.attachments.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-sm font-medium mb-2">Attachments</h4>
                        <div className="space-y-2">
                          {selectedAppointment.attachments.map((attachment, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm p-2 bg-calendar-primary/5 rounded border border-calendar-primary/10">
                              <div className="w-2 h-2 rounded-full bg-calendar-primary"></div>
                              {attachment}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Insights */}
                    <div className="p-4 bg-calendar-success/10 rounded-lg border border-calendar-success/20">
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-calendar-success"></div>
                        AI Insights
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Based on your health data, this appointment aligns well with your wellness goals. 
                        Consider preparing questions about your recent sleep patterns.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20">
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Select an appointment to view details</p>
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats */}
              <Card className="bg-calendar-card/90 backdrop-blur-sm border border-calendar-primary/20">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">This Month</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Total Appointments</span>
                      <span className="text-sm font-medium">{mockAppointments.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Confirmed</span>
                      <span className="text-sm font-medium text-calendar-success">
                        {mockAppointments.filter(a => a.status === 'confirmed').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Pending</span>
                      <span className="text-sm font-medium text-calendar-accent">
                        {mockAppointments.filter(a => a.status === 'pending').length}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}