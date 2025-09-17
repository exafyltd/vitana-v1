import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMessages } from "@/hooks/useMessages";
import { supabase } from "@/integrations/supabase/client";

interface NotificationEvent {
  type: 'booking_confirmed' | 'payment_received' | 'credit_transfer' | 'service_booked' | 'event_registered';
  data: any;
  recipient?: string;
}

export const CrossSystemNotifier = () => {
  const { toast } = useToast();
  const { sendMessage } = useMessages();

  useEffect(() => {
    // Listen for real-time notification events
    const channel = supabase
      .channel('system-notifications')
      .on('broadcast', { event: 'notification' }, (payload: { payload: NotificationEvent }) => {
        handleNotification(payload.payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNotification = async (event: NotificationEvent) => {
    try {
      switch (event.type) {
        case 'booking_confirmed':
          await handleBookingConfirmed(event.data);
          break;
        case 'payment_received':
          await handlePaymentReceived(event.data);
          break;
        case 'credit_transfer':
          await handleCreditTransfer(event.data);
          break;
        case 'service_booked':
          await handleServiceBooked(event.data);
          break;
        case 'event_registered':
          await handleEventRegistered(event.data);
          break;
      }
    } catch (error) {
      console.error('Notification handling error:', error);
    }
  };

  const handleBookingConfirmed = async (data: any) => {
    toast({
      title: "Booking Confirmed! 🎉",
      description: `Your booking for ${data.title} is confirmed`
    });

    // Send confirmation message to provider
    await sendMessage(
      `Booking confirmed: ${data.title} on ${data.date} at ${data.time}`,
      data.providerId,
      'booking_confirmation',
      data
    );
  };

  const handlePaymentReceived = async (data: any) => {
    toast({
      title: "Payment Received! 💰",
      description: `${data.amount} ${data.currency} received from ${data.from}`
    });

    // Update wallet balance notification
    await sendMessage(
      `Payment received: ${data.amount} ${data.currency}${data.note ? ' - ' + data.note : ''}`,
      undefined,
      'payment_notification',
      data
    );
  };

  const handleCreditTransfer = async (data: any) => {
    toast({
      title: "Credits Transferred! ✨",
      description: `${data.amount} credits sent to ${data.to}`
    });
  };

  const handleServiceBooked = async (data: any) => {
    toast({
      title: "New Service Booking! 📅",
      description: `${data.customerName} booked ${data.serviceName}`
    });

    // Notify service provider
    await sendMessage(
      `New booking: ${data.serviceName} by ${data.customerName}`,
      data.providerId,
      'new_booking',
      data
    );
  };

  const handleEventRegistered = async (data: any) => {
    toast({
      title: "Event Registration! 🎊",
      description: `Registered for ${data.eventTitle}`
    });

    // Send calendar invite
    await sendMessage(
      `Event registration confirmed: ${data.eventTitle} on ${data.date}`,
      data.organizerId,
      'calendar_invite',
      {
        title: data.eventTitle,
        date: data.date,
        time: data.time,
        location: data.location
      },
      undefined,
      [
        { label: "Add to Calendar", action: "calendar_accept", variant: "default" },
        { label: "View Details", action: "view_details", variant: "outline" }
      ]
    );
  };

  // Utility function to broadcast notifications
  const broadcastNotification = async (event: NotificationEvent) => {
    const channel = supabase.channel('system-notifications');
    await channel.send({
      type: 'broadcast',
      event: 'notification',
      payload: event
    });
  };

  return null; // This is a utility component with no UI
};

// Export utility function for other components to use
export const notifySystem = async (event: NotificationEvent) => {
  const channel = supabase.channel('system-notifications');
  await channel.send({
    type: 'broadcast',
    event: 'notification',
    payload: event
  });
};