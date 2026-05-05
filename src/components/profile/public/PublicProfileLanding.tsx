import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarPositionStyle } from "@/lib/avatarPosition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { UserProfile } from "@/types/profile";
import { Milestone } from "@/hooks/useProfileMilestones";
import { GalleryPhoto } from "@/hooks/useProfileGallery";
import { useTranslation } from "@/hooks/useTranslation";
import {
  MapPin,
  Users,
  FileText,
  Heart,
  Calendar,
  MessageSquare,
  UserPlus,
  ExternalLink,
  Instagram,
  Linkedin,
  Youtube,
  Facebook,
  Music2,
  Twitter,
  Globe,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface PublicProfileLandingProps {
  profile: UserProfile;
  milestones: Milestone[];
  galleryPhotos: GalleryPhoto[];
}

export function PublicProfileLanding({ profile, milestones, galleryPhotos }: PublicProfileLandingProps) {
  const { translate } = useTranslation();
  const navigate = useNavigate();

  const socialLinks = [
    { icon: Instagram, url: profile.instagram_url, label: 'Instagram' },
    { icon: Linkedin, url: profile.linkedin_url, label: 'LinkedIn' },
    { icon: Youtube, url: profile.youtube_url, label: 'YouTube' },
    { icon: Facebook, url: profile.facebook_url, label: 'Facebook' },
    { icon: Music2, url: profile.tiktok_url, label: 'TikTok' },
    { icon: Twitter, url: profile.x_url, label: 'X' },
  ].filter(l => l.url);

  const topMilestones = milestones.filter(m => m.is_public).slice(0, 3);
  const topPhotos = galleryPhotos.filter(p => p.is_public).slice(0, 6);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover */}
        <div className="h-48 sm:h-64 md:h-80 w-full overflow-hidden">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} alt={t('screens.profile.cover')} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/20" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="relative max-w-2xl mx-auto px-6 -mt-16 sm:-mt-20">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-28 w-28 sm:h-36 sm:w-36 ring-4 ring-background shadow-2xl">
              <AvatarImage src={profile.avatarUrl} alt={profile.name} style={avatarPositionStyle(profile.avatarOffsetX, profile.avatarOffsetY)} />
              <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                {profile.name?.charAt(0) || '?'}
              </AvatarFallback>
            </Avatar>

            <h1 className="text-2xl sm:text-3xl font-bold mt-4 text-foreground">{profile.name}</h1>
            {profile.handle && (
              <p className="text-muted-foreground text-sm mt-1">@{profile.handle}</p>
            )}

            {/* Vitana Index */}
            {profile.vitanaIndex && (
              <div className="mt-3 flex items-center gap-2">
                <div className="px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <span className="text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    VITANA {profile.vitanaIndex}
                  </span>
                </div>
              </div>
            )}

            {/* Location */}
            {profile.location && (
              <div className="flex items-center gap-1.5 mt-3 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {profile.location}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="mt-4 text-foreground/80 text-sm leading-relaxed max-w-lg">{profile.bio}</p>
            )}

            {/* Social links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-2 mt-4">
                {socialLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                    title={link.label}
                  >
                    <link.icon className="h-4 w-4 text-foreground/70" />
                  </a>
                ))}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-6">
              <Button className="rounded-full px-6" onClick={() => navigate(`/maxina?redirectTo=/u/${profile.handle}`)}>
                <UserPlus className="h-4 w-4 mr-2" />
                {translate('publicProfile.follow', 'Follow')}
              </Button>
              <Button variant="outline" className="rounded-full px-6" onClick={() => navigate(`/maxina?redirectTo=/u/${profile.handle}`)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                {translate('publicProfile.sendMessage', 'Message')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="max-w-2xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: translate('publicProfile.posts', 'Posts'), value: profile.stats?.posts || 0, icon: FileText },
            { label: translate('publicProfile.followers', 'Followers'), value: profile.stats?.followers || 0, icon: Users },
            { label: translate('publicProfile.following', 'Following'), value: profile.stats?.following || 0, icon: Heart },
            { label: translate('publicProfile.groups', 'Groups'), value: profile.stats?.groupsJoined || 0, icon: Users },
          ].map((stat) => (
            <Card key={stat.label} className="p-3 text-center rounded-xl bg-card/60 backdrop-blur-sm border-muted/40">
              <stat.icon className="h-5 w-5 mx-auto mb-1 text-primary/60" />
              <div className="text-lg font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Milestones */}
      {topMilestones.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏆</span>
            {translate('publicProfile.milestones', 'Life Milestones')}
          </h2>
          <div className="space-y-3">
            {topMilestones.map((m) => (
              <Card key={m.id} className="p-4 rounded-xl bg-card/60 backdrop-blur-sm border-muted/40 flex items-start gap-3">
                <span className="text-2xl">{m.icon || '⭐'}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{m.title}</h3>
                  {m.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.description}</p>}
                  {m.milestone_date && (
                    <p className="text-xs text-muted-foreground/70 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(m.milestone_date), 'MMM yyyy')}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Photo Gallery Preview */}
      {topPhotos.length > 0 && (
        <div className="max-w-2xl mx-auto px-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>📸</span>
            {translate('gallery.title', 'Photo Gallery')}
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {topPhotos.map((photo) => (
              <div key={photo.id} className="aspect-square rounded-xl overflow-hidden bg-muted">
                <img
                  src={photo.image_url}
                  alt={photo.caption || 'Photo'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View Full Profile CTA */}
      <div className="max-w-2xl mx-auto px-6 mt-10 mb-12 text-center">
        <Button
          variant="outline"
          className="rounded-full px-8"
          onClick={() => navigate(`/maxina?redirectTo=/u/${profile.handle}`)}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {translate('publicProfile.viewFull', 'View Full Profile')}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          Powered by <span className="font-semibold text-primary">VITANA</span>
        </p>
      </div>
    </div>
  );
}
