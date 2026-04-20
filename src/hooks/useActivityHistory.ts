import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

export interface ActivityHistoryItem {
  id: string;
  content: string;
  activityType: 
    | 'conversation'
    | 'chat.message'
    | 'memory.create' | 'memory.update' | 'memory.delete' | 'memory.promote'
    | 'wallet.transfer' | 'wallet.exchange'
    | 'discover.view' | 'discover.like' | 'discover.match'
    | 'calendar.create' | 'calendar.update' | 'calendar.respond';
  role?: 'user' | 'assistant';
  createdAt: string;
  metadata?: any;
  conversationId?: string;
  activityData?: any;
  contextData?: any;
  icon?: string;
  tagColor?: string;
}

export interface ConversationExchange {
  id: string;
  userMessage: ActivityHistoryItem;
  assistantMessage?: ActivityHistoryItem;
  conversationId: string;
  createdAt: string;
}


export const ACTIVITY_TYPE_CONFIG: Record<string, { icon: string; tagColor: string; label: string }> = {
  'conversation': { icon: '💬', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Conversation' },
  'chat.message': { icon: '💬', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Chat' },
  'memory.create': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Created' },
  'memory.update': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Updated' },
  'memory.delete': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory Deleted' },
  'memory.promote': { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Promoted to Knowledge' },
  'wallet.transfer': { icon: '💰', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Transfer' },
  'wallet.exchange': { icon: '💰', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Exchange' },
  'discover.view': { icon: '🔍', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'Profile Viewed' },
  'discover.like': { icon: '❤️', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'Liked' },
  'discover.match': { icon: '❤️', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'New Match' },
  'calendar.create': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Created' },
  'calendar.update': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Updated' },
  'calendar.delete': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Deleted' },
  'calendar.respond': { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Event Response' },
  'autopilot.action.select': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Selected' },
  'autopilot.action.execute': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Executed' },
  'autopilot.action.dismiss': { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Action Dismissed' },
  
  // Community - Events
  'community.event.view': { icon: '👁️', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Event Viewed' },
  'community.event.join': { icon: '✅', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Joined Event' },
  'community.event.leave': { icon: '❌', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Left Event' },
  'community.event.share': { icon: '🔗', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Shared Event' },
  
  // Community - Groups
  'community.group.create': { icon: '🎉', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Group Created' },
  'community.group.join': { icon: '➕', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Joined Group' },
  'community.group.leave': { icon: '➖', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Left Group' },
  'community.group.view': { icon: '👀', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Viewed Group' },
  'community.group.update': { icon: '✏️', tagColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Updated Group' },
  'community.group.invite': { icon: '📨', tagColor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700', label: 'Invited to Group' },
  
  // Community - Live Rooms
  'community.live.create': { icon: '🎬', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Live Session Created' },
  'community.live.start': { icon: '🔴', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Went Live' },
  'community.live.join': { icon: '🎙️', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Joined Live Room' },
  'community.live.leave': { icon: '👋', tagColor: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700', label: 'Left Live Room' },
  'community.live.cohost_invite': { icon: '🎤', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Co-Host Invited' },
  'community.live.cohost_accept': { icon: '✅', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Co-Host Accepted' },
  'community.live.cohost_decline': { icon: '❌', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Co-Host Declined' },
  'community.live.poll_vote': { icon: '🗳️', tagColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', label: 'Poll Voted' },
  'community.live.remind': { icon: '⏰', tagColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700', label: 'Reminder Set' },
  
  // Community - Following & Social
  'community.follow': { icon: '👥', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Followed User' },
  'community.unfollow': { icon: '👤', tagColor: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700', label: 'Unfollowed User' },
  'community.profile.view': { icon: '👁️', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Profile Viewed' },
  
  // Discover
  'discover.service.view': { icon: '🔍', tagColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', label: 'Service Viewed' },
  'discover.service.bookmark': { icon: '🔖', tagColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Service Bookmarked' },
  'discover.service.share': { icon: '🔗', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Service Shared' },
  'discover.provider.contact': { icon: '📞', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Provider Contacted' },
  'discover.offer.view': { icon: '🎁', tagColor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700', label: 'Offer Viewed' },
  
  // Community - Messaging
  'community.message.send': { icon: '💬', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Message Sent' },
  'community.conversation.start': { icon: '🆕', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Conversation Started' },
  'community.conversation.view': { icon: '👁️', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Conversation Opened' },
  'community.group_chat.create': { icon: '💬', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Group Chat Created' },
  'community.group_chat.join': { icon: '➕', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Joined Group Chat' },
  
  // Community - Search
  'community.search': { icon: '🔍', tagColor: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700', label: 'Search Performed' },
  'community.search.member': { icon: '👥', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Member Search' },
  'community.search.group': { icon: '🏘️', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Group Search' },
  'community.search.event': { icon: '📅', tagColor: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700', label: 'Event Search' },
  
  // Health - Biomarkers
  'health.biomarker.view': { icon: '🩺', tagColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', label: 'Biomarker Viewed' },
  'health.biomarker.upload_pdf': { icon: '📄', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Lab PDF Uploaded' },
  'health.biomarker.upload_manual': { icon: '✍️', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Manual Entry' },
  'health.biomarker.upload_device': { icon: '⌚', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Device Connected' },
  'health.biomarker.connect_device': { icon: '⌚', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Device Connected' },
  'health.biomarker.download': { icon: '⬇️', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Report Downloaded' },
  'health.biomarker.share': { icon: '🔗', tagColor: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700', label: 'Shared with Doctor' },
  'health.biomarker.order_test': { icon: '🧪', tagColor: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700', label: 'Test Ordered' },
  
  // Health - Lab Reports
  'health.lab_report.upload': { icon: '📤', tagColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', label: 'Lab Report Uploaded' },
  'health.lab_report.export': { icon: '📥', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Lab Report Exported' },
  
  // Health - Omics
  'health.omics.upload': { icon: '🧬', tagColor: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700', label: 'Omics Data Uploaded' },
  'health.omics.connect_api': { icon: '🔌', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Omics API Connected' },
  'health.omics.view': { icon: '👁️', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Omics Data Viewed' },
  
  // Health - Supplements
  'health.supplement.add': { icon: '💊', tagColor: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Supplement Added' },
  'health.supplement.update': { icon: '💊', tagColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Supplement Updated' },
  'health.supplement.delete': { icon: '💊', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Supplement Removed' },

  // BOOTSTRAP-HISTORY-AWARE-TIMELINE: auth, navigation, profile, ORB turns, tasks
  'auth.login': { icon: '🔑', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Signed In' },
  'auth.logout': { icon: '🔒', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Signed Out' },
  'auth.signup': { icon: '🎉', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Account Created' },
  'page.view': { icon: '📄', tagColor: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700', label: 'Page Viewed' },
  'profile.update': { icon: '✏️', tagColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Profile Updated' },
  'orb.turn.received': { icon: '🎙️', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Asked ORB' },
  'orb.turn.responded': { icon: '🤖', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'ORB Responded' },
  'orb.session.start': { icon: '🧠', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Voice Session Started' },
  'orb.session.stop': { icon: '🧠', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'Voice Session Ended' },
  'task.create': { icon: '✅', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Task Created' },
  'task.complete': { icon: '✅', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Task Completed' },
  'task.approve': { icon: '👍', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Task Approved' },
  'task.reject': { icon: '👎', tagColor: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Task Rejected' },
  'diary.create': { icon: '📔', tagColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700', label: 'Diary Entry' },
};

function formatActivityContent(log: any): string {
  const { activity_type, activity_data } = log;
  
  switch (activity_type) {
    case 'memory.create':
      return `Created knowledge: "${activity_data.content?.substring(0, 100)}..."`;
    case 'memory.update':
      return `Updated knowledge: "${activity_data.content?.substring(0, 100)}..."`;
    case 'memory.delete':
      return `Deleted knowledge item`;
    case 'memory.promote':
      return `Promoted activity to knowledge base`;
    case 'wallet.transfer':
      return `Transferred ${activity_data.amount} ${activity_data.currency} to another user`;
    case 'wallet.exchange':
      return `Exchanged ${activity_data.amount} ${activity_data.from_currency} → ${activity_data.to_currency}`;
    case 'discover.view':
      return `Viewed a profile`;
    case 'discover.like':
      return `Liked a profile`;
    case 'discover.match':
      return `New match with compatibility score ${activity_data.compatibility_score}%`;
    case 'calendar.create':
      return `Created event: ${activity_data.title}`;
    case 'calendar.update':
      return `Updated event: ${activity_data.title}`;
    case 'calendar.delete':
      return `Deleted event: ${activity_data.title}`;
    case 'calendar.respond':
      return `Responded to event: ${activity_data.response}`;
    case 'autopilot.action.select':
      return `Selected autopilot action: ${activity_data.title}`;
    case 'autopilot.action.execute':
      return `Executed: ${activity_data.title}`;
    case 'autopilot.action.dismiss':
      return `Dismissed autopilot suggestion`;
    
    // Community - Events
    case 'community.event.view':
      return `Viewed event: ${activity_data.eventTitle}`;
    case 'community.event.join':
      return `Joined event: ${activity_data.eventTitle}`;
    case 'community.event.leave':
      return `Left event: ${activity_data.eventTitle}`;
    case 'community.event.share':
      return `Shared event: ${activity_data.eventTitle} on ${activity_data.platform}`;
    
    // Community - Groups
    case 'community.group.create':
      return `Created group: ${activity_data.groupName} (${activity_data.category})`;
    case 'community.group.join':
      return `Joined group: ${activity_data.groupName}`;
    case 'community.group.leave':
      return `Left group: ${activity_data.groupName}`;
    case 'community.group.view':
      return `Viewed group: ${activity_data.groupName}`;
    case 'community.group.update':
      return `Updated group: ${activity_data.groupName}`;
    case 'community.group.invite':
      return `Invited someone to a group`;
    
    // Community - Live Rooms
    case 'community.live.create':
      return `Created live session: ${activity_data.title} (${activity_data.streamType})`;
    case 'community.live.start':
      return `Went live: ${activity_data.title}`;
    case 'community.live.join':
      return `Joined live room: ${activity_data.roomTitle}`;
    case 'community.live.leave':
      return `Left live room: ${activity_data.roomTitle} after ${Math.round(activity_data.duration / 60)}m`;
    case 'community.live.cohost_invite':
      return `Invited someone to co-host`;
    case 'community.live.cohost_accept':
      return `Accepted co-host invitation`;
    case 'community.live.cohost_decline':
      return `Declined co-host invitation`;
    case 'community.live.poll_vote':
      return `Voted in poll: "${activity_data.pollQuestion}"`;
    case 'community.live.remind':
      return `Set reminder for: ${activity_data.roomTitle}`;
    
    // Community - Following & Social
    case 'community.follow':
      return `Followed ${activity_data.targetName}`;
    case 'community.unfollow':
      return `Unfollowed ${activity_data.targetName}`;
    case 'community.profile.view':
      return `Viewed profile: ${activity_data.targetName}`;
    
    // Discover
    case 'discover.service.view':
      return `Viewed service: ${activity_data.serviceName} (${activity_data.category})`;
    case 'discover.service.bookmark':
      return `Bookmarked service: ${activity_data.serviceName}`;
    case 'discover.service.share':
      return `Shared service: ${activity_data.serviceName}`;
    case 'discover.provider.contact':
      return `Contacted provider: ${activity_data.providerName}`;
    case 'discover.offer.view':
      return `Viewed offer: ${activity_data.offerTitle}`;
    
    // Community - Messaging
    case 'community.message.send':
      return `Sent ${activity_data.messageType} message (${activity_data.context})`;
    case 'community.conversation.start':
      return `Started conversation (${activity_data.context})`;
    case 'community.conversation.view':
      return `Opened conversation (${activity_data.context})`;
    case 'community.group_chat.create':
      return `Created group chat with ${activity_data.participantCount} members`;
    case 'community.group_chat.join':
      return `Joined group chat: ${activity_data.threadName}`;
    
    // Community - Search
    case 'community.search':
      return `Searched for: "${activity_data.query}" (${activity_data.resultsCount} results)`;
    case 'community.search.member':
      return `Searched members: "${activity_data.query}" (${activity_data.resultsCount} found)`;
    case 'community.search.group':
      return `Searched groups: "${activity_data.query}" (${activity_data.resultsCount} found)`;
    case 'community.search.event':
      return `Searched events: "${activity_data.query}" (${activity_data.resultsCount} found)`;
    
    // Health activities
    case 'health.biomarker.view':
      return `Viewed biomarkers: ${activity_data.testName}`;
    case 'health.biomarker.upload_pdf':
    case 'health.biomarker.upload_manual':
    case 'health.biomarker.upload_device':
      return `Uploaded lab data: ${activity_data.testName}`;
    case 'health.biomarker.connect_device':
      return `Connected device: ${activity_data.deviceType}`;
    case 'health.biomarker.download':
      return `Downloaded report: ${activity_data.testName}`;
    case 'health.biomarker.share':
      return `Shared ${activity_data.testName} with ${activity_data.recipient}`;
    case 'health.biomarker.order_test':
      return `Ordered test: ${activity_data.testName}`;
    case 'health.lab_report.upload':
      return 'Uploaded lab report';
    case 'health.lab_report.export':
      return 'Exported lab report';
    case 'health.omics.upload':
      return `Uploaded ${activity_data.type} data from ${activity_data.provider}`;
    case 'health.omics.connect_api':
      return `Connected ${activity_data.provider} API`;
    case 'health.omics.view':
      return `Viewed ${activity_data.type}: ${activity_data.name}`;
    case 'health.supplement.add':
      return `Added supplement: ${activity_data.name} (${activity_data.category})`;
    case 'health.supplement.update':
      return `Updated supplement: ${activity_data.name}`;
    case 'health.supplement.delete':
      return `Removed supplement: ${activity_data.name}`;
    
    case 'chat.message':
      // Chat messages should come from ai_messages table, not activity log
      return activity_data.content || activity_data.message || 'Chat message';
    
    default:
      console.warn(`Unknown activity type: ${activity_type}`, activity_data);
      return activity_data.content || activity_data.description || 'Activity recorded';
  }
}

const ITEMS_PER_PAGE = 20;
const AUTO_REFETCH_MS = 60_000;

const PREFIX_FALLBACK: Record<string, { icon: string; tagColor: string; label: string }> = {
  orb: { icon: '🧠', tagColor: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700', label: 'ORB Activity' },
  task: { icon: '✅', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Task' },
  diary: { icon: '📔', tagColor: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700', label: 'Diary' },
  recommendation: { icon: '💡', tagColor: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Recommendation' },
  autopilot: { icon: '🤖', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Autopilot' },
  health: { icon: '🩺', tagColor: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700', label: 'Health' },
  community: { icon: '👥', tagColor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700', label: 'Community' },
  discover: { icon: '🔍', tagColor: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700', label: 'Discover' },
  calendar: { icon: '📅', tagColor: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-700', label: 'Calendar' },
  wallet: { icon: '💰', tagColor: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', label: 'Wallet' },
  memory: { icon: '🧠', tagColor: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700', label: 'Memory' },
  chat: { icon: '💬', tagColor: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700', label: 'Chat' },
};

const GENERIC_FALLBACK = { icon: '📌', tagColor: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', label: 'Activity' };

function resolveTypeConfig(activityType: string) {
  const exact = ACTIVITY_TYPE_CONFIG[activityType];
  if (exact) return exact;
  const prefix = activityType.split('.')[0];
  return PREFIX_FALLBACK[prefix] || GENERIC_FALLBACK;
}

export function useActivityHistory(filterType?: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Set up realtime subscription for ai_messages
  useEffect(() => {
    const channel = supabase
      .channel('ai_messages_realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages'
        },
        (payload) => {
          console.log('New AI message detected, refreshing timeline...');
          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['activity-history'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Set up realtime subscription for user_activity_log
  useEffect(() => {
    const channel = supabase
      .channel('activity_log_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_activity_log'
        },
        (payload) => {
          console.log('Activity log change detected, refreshing timeline...', payload.eventType);
          // Invalidate queries to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['activity-history'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["activity-history", filterType],
    queryFn: async ({ pageParam = 0 }) => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session?.user?.id) {
        throw new Error("Not authenticated");
      }

      const promises = [];

      // Fetch ai_messages (chat history) - fetch BOTH user and assistant messages
      if (!filterType || filterType === 'all' || filterType === 'chat') {
        promises.push(
          supabase
            .from("ai_messages")
            .select("*")
            .order("created_at", { ascending: false })
            .range(pageParam * ITEMS_PER_PAGE * 2, (pageParam + 1) * ITEMS_PER_PAGE * 2 - 1) // Fetch more to account for pairs
        );
      } else {
        promises.push(Promise.resolve({ data: [], error: null }));
      }

      // Fetch user_activity_log
      let logQuery = supabase
        .from("user_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam * ITEMS_PER_PAGE, (pageParam + 1) * ITEMS_PER_PAGE - 1);

      // Apply filter if specified
      // Note: No longer excluding chat.% - let all activities through!
      
      if (filterType && filterType !== 'all' && filterType !== 'chat') {
        logQuery = logQuery.like("activity_type", `${filterType}.%`);
      }

      promises.push(logQuery);

      const [messagesResult, logsResult] = await Promise.all(promises);

      if (messagesResult.error) throw messagesResult.error;
      if (logsResult.error) throw logsResult.error;

      console.log(`[ActivityHistory] Fetched ${messagesResult.data?.length || 0} AI messages, ${logsResult.data?.length || 0} activity logs`);

      // Transform ai_messages into activities
      const messageActivities: ActivityHistoryItem[] = (messagesResult.data || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        activityType: 'conversation' as const,
        role: msg.role as 'user' | 'assistant',
        createdAt: msg.created_at,
        metadata: { 
          ...msg.metadata, 
          label: ACTIVITY_TYPE_CONFIG['conversation'].label,
          inputMethod: msg.input_method || 'text'
        },
        conversationId: msg.conversation_id,
        icon: ACTIVITY_TYPE_CONFIG['conversation'].icon,
        tagColor: ACTIVITY_TYPE_CONFIG['conversation'].tagColor,
      }));

      // Group messages by conversation_id to create Q&A pairs
      const conversationMap = new Map<string, { user?: ActivityHistoryItem; assistant?: ActivityHistoryItem }>();
      
      messageActivities.forEach((msg) => {
        if (!msg.conversationId) return;
        
        const existing = conversationMap.get(msg.conversationId) || {};
        if (msg.role === 'user') {
          existing.user = msg;
        } else if (msg.role === 'assistant') {
          existing.assistant = msg;
        }
        conversationMap.set(msg.conversationId, existing);
      });

      // Convert to ConversationExchange array
      const conversationExchanges: ConversationExchange[] = [];
      conversationMap.forEach((pair, conversationId) => {
        if (pair.user) {
          conversationExchanges.push({
            id: pair.user.id,
            userMessage: pair.user,
            assistantMessage: pair.assistant,
            conversationId,
            createdAt: pair.user.createdAt,
          });
        }
      });

      // Transform user_activity_log
      const logActivities: ActivityHistoryItem[] = (logsResult.data || []).map((log) => {
        const config = resolveTypeConfig(log.activity_type);

        return {
          id: log.id,
          content: formatActivityContent(log),
          activityType: log.activity_type,
          createdAt: log.created_at,
          activityData: log.activity_data,
          contextData: log.context_data,
          icon: config.icon,
          tagColor: config.tagColor,
          metadata: { label: config.label },
        };
      });

      return {
        conversationExchanges,
        logActivities,
        nextPage: (conversationExchanges.length + logActivities.length) >= ITEMS_PER_PAGE ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    refetchInterval: AUTO_REFETCH_MS,
    refetchOnWindowFocus: true,
  });

  // Flatten all pages into arrays
  const conversationExchanges = data?.pages.flatMap((page) => page.conversationExchanges) || [];
  const logActivities = data?.pages.flatMap((page) => page.logActivities) || [];

  // Merge and sort all items by timestamp for display
  const allItems = [
    ...conversationExchanges.map(ex => ({ ...ex, itemType: 'exchange' as const })),
    ...logActivities.map(log => ({ ...log, itemType: 'activity' as const }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (error) {
    toast({
      title: "Error loading activity history",
      description: error.message,
      variant: "destructive",
    });
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: 'conversation' | 'activity' }) => {
      if (type === 'conversation') {
        // Delete both the user message (id) and its paired assistant reply (if any)
        const exchange = conversationExchanges.find(ex => ex.id === id);
        const idsToDelete = [
          id,
          ...(exchange?.assistantMessage?.id ? [exchange.assistantMessage.id] : []),
        ];

        const { data: deletedRows, error } = await supabase
          .from('ai_messages')
          .delete()
          .in('id', idsToDelete)
          .select('id');

        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error('No messages were deleted. You may not have permission.');
        }
      } else {
        // Delete from user_activity_log
        const { data: deletedRows, error } = await supabase
          .from('user_activity_log')
          .delete()
          .eq('id', id)
          .select('id');
        
        if (error) throw error;
        if (!deletedRows || deletedRows.length === 0) {
          throw new Error('Nothing deleted.');
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-history'] });
      toast({
        title: "Activity deleted",
        description: "The activity item has been removed from your history.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete activity",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    allItems,
    conversationExchanges,
    logActivities,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    deleteActivity: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['activity-history', filterType] }),
  };
}
