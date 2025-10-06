import { useActivityLogger } from "./useActivityLogger";

export function useCommunityLogger() {
  const { logActivity } = useActivityLogger();

  return {
    // Events
    logEventView: (eventId: string, eventTitle: string) => 
      logActivity({
        activityType: 'community.event.view',
        activityData: { eventId, eventTitle },
        dedupeKey: `event-view-${eventId}`
      }),
    
    logEventJoin: (eventId: string, eventTitle: string) => 
      logActivity({
        activityType: 'community.event.join',
        activityData: { eventId, eventTitle }
      }),
    
    logEventLeave: (eventId: string, eventTitle: string) => 
      logActivity({
        activityType: 'community.event.leave',
        activityData: { eventId, eventTitle }
      }),
    
    logEventShare: (eventId: string, eventTitle: string, platform: string) => 
      logActivity({
        activityType: 'community.event.share',
        activityData: { eventId, eventTitle, platform }
      }),

    // Groups
    logGroupCreate: (groupName: string, category: string, privacy: string) => 
      logActivity({
        activityType: 'community.group.create',
        activityData: { groupName, category, privacy }
      }),
    
    logGroupJoin: (groupId: string, groupName: string) => 
      logActivity({
        activityType: 'community.group.join',
        activityData: { groupId, groupName }
      }),
    
    logGroupLeave: (groupId: string, groupName: string) => 
      logActivity({
        activityType: 'community.group.leave',
        activityData: { groupId, groupName }
      }),
    
    logGroupView: (groupId: string, groupName: string) => 
      logActivity({
        activityType: 'community.group.view',
        activityData: { groupId, groupName },
        dedupeKey: `group-view-${groupId}`
      }),
    
    logGroupUpdate: (groupId: string, groupName: string) => 
      logActivity({
        activityType: 'community.group.update',
        activityData: { groupId, groupName }
      }),
    
    logGroupInvite: (groupId: string, recipientId: string) => 
      logActivity({
        activityType: 'community.group.invite',
        activityData: { groupId, recipientId }
      }),

    // Live Rooms
    logLiveCreate: (title: string, streamType: string, scheduled: boolean) => 
      logActivity({
        activityType: 'community.live.create',
        activityData: { title, streamType, scheduled }
      }),
    
    logLiveStart: (title: string, streamType: string) => 
      logActivity({
        activityType: 'community.live.start',
        activityData: { title, streamType }
      }),
    
    logLiveJoin: (roomId: string, roomTitle: string) => 
      logActivity({
        activityType: 'community.live.join',
        activityData: { roomId, roomTitle }
      }),
    
    logLiveLeave: (roomId: string, roomTitle: string, duration: number) => 
      logActivity({
        activityType: 'community.live.leave',
        activityData: { roomId, roomTitle, duration }
      }),
    
    logLiveCoHostInvite: (roomId: string, recipientId: string) => 
      logActivity({
        activityType: 'community.live.cohost_invite',
        activityData: { roomId, recipientId }
      }),
    
    logLiveCoHostAccept: (roomId: string, hostId: string) => 
      logActivity({
        activityType: 'community.live.cohost_accept',
        activityData: { roomId, hostId }
      }),
    
    logLiveCoHostDecline: (roomId: string, hostId: string) => 
      logActivity({
        activityType: 'community.live.cohost_decline',
        activityData: { roomId, hostId }
      }),
    
    logLivePollVote: (roomId: string, pollQuestion: string, selectedOption: string) => 
      logActivity({
        activityType: 'community.live.poll_vote',
        activityData: { roomId, pollQuestion, selectedOption }
      }),
    
    logLiveReminder: (roomId: string, roomTitle: string, scheduledTime: string) => 
      logActivity({
        activityType: 'community.live.remind',
        activityData: { roomId, roomTitle, scheduledTime }
      }),

    // Following & Social
    logFollow: (targetUserId: string, targetName: string) => 
      logActivity({
        activityType: 'community.follow',
        activityData: { targetUserId, targetName }
      }),
    
    logUnfollow: (targetUserId: string, targetName: string) => 
      logActivity({
        activityType: 'community.unfollow',
        activityData: { targetUserId, targetName }
      }),
    
    logProfileView: (targetUserId: string, targetName: string) => 
      logActivity({
        activityType: 'community.profile.view',
        activityData: { targetUserId, targetName },
        dedupeKey: `profile-view-${targetUserId}`
      }),

    // Discover
    logServiceView: (serviceId: string, serviceName: string, category: string) => 
      logActivity({
        activityType: 'discover.service.view',
        activityData: { serviceId, serviceName, category },
        dedupeKey: `service-view-${serviceId}`
      }),
    
    logServiceBookmark: (serviceId: string, serviceName: string) => 
      logActivity({
        activityType: 'discover.service.bookmark',
        activityData: { serviceId, serviceName }
      }),
    
    logServiceShare: (serviceId: string, serviceName: string, platform: string) => 
      logActivity({
        activityType: 'discover.service.share',
        activityData: { serviceId, serviceName, platform }
      }),
    
    logProviderContact: (providerId: string, providerName: string, method: string) => 
      logActivity({
        activityType: 'discover.provider.contact',
        activityData: { providerId, providerName, method }
      }),
    
    logOfferView: (offerId: string, offerTitle: string) => 
      logActivity({
        activityType: 'discover.offer.view',
        activityData: { offerId, offerTitle },
        dedupeKey: `offer-view-${offerId}`
      }),

    // Messaging
    logMessageSend: (threadId: string, messageType: string, context: 'global' | 'tenant') => 
      logActivity({
        activityType: 'community.message.send',
        activityData: { threadId, messageType, context }
      }),
    
    logConversationStart: (recipientId: string, context: 'global' | 'tenant') => 
      logActivity({
        activityType: 'community.conversation.start',
        activityData: { recipientId, context }
      }),
    
    logConversationView: (threadId: string, context: 'global' | 'tenant') => 
      logActivity({
        activityType: 'community.conversation.view',
        activityData: { threadId, context },
        dedupeKey: `conversation-view-${threadId}`
      }),
    
    logGroupChatCreate: (threadId: string, participantCount: number) => 
      logActivity({
        activityType: 'community.group_chat.create',
        activityData: { threadId, participantCount }
      }),
    
    logGroupChatJoin: (threadId: string, threadName: string) => 
      logActivity({
        activityType: 'community.group_chat.join',
        activityData: { threadId, threadName }
      }),

    // Search
    logSearch: (query: string, category: string, resultsCount: number) => 
      logActivity({
        activityType: 'community.search',
        activityData: { query, category, resultsCount }
      }),
    
    logSearchMember: (query: string, resultsCount: number) => 
      logActivity({
        activityType: 'community.search.member',
        activityData: { query, resultsCount }
      }),
    
    logSearchGroup: (query: string, resultsCount: number) => 
      logActivity({
        activityType: 'community.search.group',
        activityData: { query, resultsCount }
      }),
    
    logSearchEvent: (query: string, resultsCount: number) => 
      logActivity({
        activityType: 'community.search.event',
        activityData: { query, resultsCount }
      }),
  };
}
