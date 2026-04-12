# src/hooks/ — Custom React Hooks (169 files)

## How Hooks Are Organized

Hooks are flat in this directory (no subdirectories except `dev/`). They follow the pattern `use{Feature}.ts`.

## By Domain

### Auth & Identity
| Hook | Purpose |
|------|---------|
| `useRole.tsx` | Current user's role (Community/Professional/Staff/Admin/Dev) |
| `useTenant.tsx` | Current tenant context for multi-tenant branding |
| `usePermissions.ts` | Permission checks |
| `useAIConsent.ts` | AI feature consent state |

### Profile & User
| Hook | Purpose |
|------|---------|
| `useProfiles.ts` | Fetch user profiles |
| `useProfileProgress.ts` | Profile completion progress |
| `useProfileGallery.ts` | Profile photo gallery |
| `useProfileMilestones.ts` | Achievement milestones |
| `useProfilePosts.ts` | User's posts |
| `useProfilePreview.tsx` | Hover preview popover |
| `useProfileShare.ts` | Profile sharing |
| `useProfileStatsCount.ts` | Profile stats (followers, etc.) |
| `useProfileTheme.ts` | Custom profile theme |
| `useUserPreferences.ts` | User preference settings |
| `useUserPresence.ts` | Online/offline status |
| `useSignupFunnel.ts` | Signup funnel tracking |

### Community & Social
| Hook | Purpose |
|------|---------|
| `useCommunityEvents.ts` | Event listing and filtering |
| `useCommunityMembers.ts` | Community member directory |
| `useCommunityLogger.ts` | Community activity logging |
| `useEventInvites.ts` | Event invite management |
| `useEventParticipation.ts` | Join/leave events |
| `useEventRecommendations.ts` | AI event recommendations |
| `useEventSales.ts` | Event ticket sales |
| `useEventTickets.ts` | Ticket management |
| `useGroupDirectory.ts` | Group listing |
| `useGroupMembership.ts` | Join/leave groups |
| `useGroupPosts.ts` | Posts within groups |
| `useFollow.ts` | Follow/unfollow users |
| `useContacts.ts` | Contact list |
| `useContactSync.ts` | Contact synchronization |
| `useIsContactInList.ts` | Contact lookup |

### Messaging & Chat
| Hook | Purpose |
|------|---------|
| `useMessages.ts` | Message CRUD |
| `usePaginatedMessages.ts` | Paginated message loading |
| `useHybridMessages.ts` | Hybrid online/offline messages |
| `useChatApi.ts` | Chat API client |
| `useChatUnreadCount.ts` | Unread message count |
| `useConversationRealtime.ts` | Real-time message updates |
| `useTypingIndicators.ts` | Typing status |
| `useMessageReactions.ts` | Message reactions |
| `useMessageOutbox.ts` | Offline message queue |
| `useGlobalMessages.ts` | Global message feed |
| `useTenantMessages.ts` | Tenant-scoped messages |
| `useLiveChat.ts` | Live chat in rooms |

### Live Rooms & Calling
| Hook | Purpose |
|------|---------|
| `useLiveRoom.ts` | Live room management |
| `useLiveRoomList.ts` | Available rooms listing |
| `useLiveStreams.ts` | Live stream state |
| `useHostPresence.ts` | Host online status |
| `useDailyRoom.ts` | Daily.co room instance |
| `useCallState.ts` | Call state management |
| `useWebRTC.ts` | WebRTC connection |
| `useStreamLifecycle.ts` | Stream start/stop lifecycle |
| `useStreamRecording.ts` | Stream recording |
| `useMyRoom.ts` | User's personal room |

### Health & Wellness
| Hook | Purpose |
|------|---------|
| `useHealthLogger.ts` | Health data logging |
| `useHealthPlans.ts` | Health plan management |
| `useLifeCompass.ts` | Life compass feature |
| `useUserSupplements.ts` | Supplement tracking |

### AI & Voice
| Hook | Purpose |
|------|---------|
| `useAIAssistantAnalytics.ts` | AI assistant usage analytics |
| `useOrbVoiceWidget.ts` | Voice orb widget state |
| `useOrbVoiceClient.ts` | Voice orb API client |
| `useOrbSuppression.ts` | Orb suppression logic |
| `useVertexLive.ts` | Vertex AI live session |
| `useVitanaOrbTools.ts` | Orb tool integrations |
| `useVitanaPCMAudio.ts` | PCM audio processing |
| `useTextToSpeech.ts` | TTS integration |
| `useProactiveAssistant.ts` | Proactive AI suggestions |

### Autopilot & Automation
| Hook | Purpose |
|------|---------|
| `use-autopilot.ts` | Autopilot state and actions |
| `use-dev-autopilot.ts` | Dev autopilot variant |
| `useAutopilotComplete.ts` | Autopilot completion |
| `useAutomationRules.ts` | Automation rule management |

### Memory & Content
| Hook | Purpose |
|------|---------|
| `useMemoryTimeline.ts` | Memory timeline |
| `useMemoryMetadata.ts` | Memory metadata |
| `useMemoryReinforce.ts` | Memory reinforcement |
| `useBookmarks.ts` | Bookmarks |
| `useKnowledgeBase.ts` | Knowledge base access |
| `usePatternDiscovery.ts` | Pattern discovery |

### Wallet & Commerce
| Hook | Purpose |
|------|---------|
| `useWallet.ts` | Wallet balance and transactions |
| `useWalletRealtime.ts` | Real-time wallet updates |
| `useStripePayment.ts` | Stripe payment flow |
| `useCart.ts` | Shopping cart |
| `useLocalCart.ts` | Offline cart |
| `useOrderManagement.ts` | Order CRUD |
| `useDiscountCode.ts` | Discount code validation |
| `useVouchers.ts` | Voucher management |
| `useRedeemVoucher.ts` | Voucher redemption |
| `useMemberships.ts` | Membership subscriptions |
| `useUnifiedEarnings.ts` | Creator earnings |

### Reseller
| Hook | Purpose |
|------|---------|
| `useIsReseller.ts` | Reseller status check |
| `useActivateReseller.ts` | Reseller activation |
| `useResellerProfile.ts` | Reseller profile |
| `useResellerEvents.ts` | Reseller event listings |
| `useResellerSales.ts` | Reseller sales data |
| `useResellerPayouts.ts` | Payout management |

### Sharing & Campaigns
| Hook | Purpose |
|------|---------|
| `useCampaigns.ts` | Campaign CRUD |
| `useCampaignActions.ts` | Campaign action triggers |
| `useCampaignAnalytics.ts` | Campaign analytics |
| `useCampaignDistribution.ts` | Campaign distribution |
| `useCampaignRecipients.ts` | Recipient management |
| `useDistributionPosts.ts` | Distribution post CRUD |
| `useScheduledPosts.ts` | Scheduled post management |
| `usePostAnalytics.ts` | Post analytics |
| `usePostInteractions.ts` | Post interaction tracking |

### Notifications & Realtime
| Hook | Purpose |
|------|---------|
| `useNotifications.ts` | Notification list |
| `useAppointmentNotifications.ts` | Appointment reminders |
| `useI18nNotify.ts` | Internationalized notifications |
| `useRealtimeConnection.ts` | Supabase realtime connection |
| `useRealtimeAPIMonitoring.ts` | API monitoring |
| `useTaskStream.ts` | SSE task streaming |
| `useBackendStatus.ts` | Backend health status |

### UI & UX
| Hook | Purpose |
|------|---------|
| `use-mobile.tsx` | Mobile detection (`useIsMobile()`) |
| `use-toast.ts` | Toast notifications |
| `useMediaQuery.ts` | CSS media query matching |
| `useAutoSave.ts` | Auto-save form state |
| `useImagePreloader.ts` | Image preloading |
| `useNativeShare.ts` | Native share API |
| `useGlassMode.ts` | Glass morphism mode |
| `usePopupCoordination.ts` | Popup z-index management |
| `useSmartRouting.tsx` | Intelligent route navigation |
| `useVisualContext.ts` | Visual context state |

### Creator & Content
| Hook | Purpose |
|------|---------|
| `useCreator.ts` | Creator mode features |
| `useShorts.ts` | Short-form content |
| `useShortsDensity.ts` | Shorts feed density |
| `useTemplates.ts` | Content templates |
| `useMediaUpload.ts` | File/media upload |
| `useVideoUpload.ts` | Video upload |
| `useBulkVideoUpload.ts` | Bulk video upload |
| `usePodcastFavorite.ts` | Podcast favorites |
| `usePodcastShowSubscription.ts` | Podcast subscriptions |
| `usePopularPodcastShows.ts` | Popular podcast discovery |

### Admin
| Hook | Purpose |
|------|---------|
| `useAdminAnalytics.ts` | Admin analytics dashboard |
| `useAdminNavigator.ts` | Admin navigation |
| `useAdminNotifications.ts` | Admin notification management |
| `useAdminUsers.ts` | Admin user management |

### Performance & Caching
| Hook | Purpose |
|------|---------|
| `useBackgroundPrefetch.ts` | Background data prefetching |
| `useBackgroundRefresh.ts` | Background cache refresh |
| `usePerformanceOptimization.ts` | Performance monitoring |
| `useErrorNotifications.ts` | Error tracking |

### Caching (non-hook files in this directory)
| File | Purpose |
|------|---------|
| `chatPersistCache.ts` | Chat message cache persistence |
| `messageCache.ts` | Message caching layer |

## Patterns

- All data-fetching hooks use TanStack React Query (`useQuery`, `useMutation`)
- Supabase hooks use the typed client from `@/integrations/supabase/client`
- Gateway API hooks use fetch with `VITE_GATEWAY_URL`
- Hooks return `{ data, isLoading, error }` pattern from React Query
- Real-time hooks use Supabase Realtime subscriptions or SSE via `useTaskStream`
