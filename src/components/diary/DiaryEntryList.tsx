import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Mic, Image as ImageIcon, Type, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ImageZoomModal } from "@/components/messages/ImageZoomModal";

interface DiaryEntryListProps {
  entryType: "voice" | "photo" | "text";
}

export function DiaryEntryList({ entryType }: DiaryEntryListProps) {
  const [selectedImage, setSelectedImage] = useState<{ url: string; filename: string } | null>(null);

  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ['diary-entries', entryType],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('source', entryType)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
  });

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('diary-entries-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'diary_entries',
          filter: `source=eq.${entryType}`
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [entryType, refetch]);

  const getIcon = () => {
    switch (entryType) {
      case "voice":
        return <Mic className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case "photo":
        return <ImageIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "text":
        return <Type className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }
  };

  const getIconBg = () => {
    switch (entryType) {
      case "voice":
        return "bg-purple-100 dark:bg-purple-900/20";
      case "photo":
        return "bg-blue-100 dark:bg-blue-900/20";
      case "text":
        return "bg-green-100 dark:bg-green-900/20";
    }
  };

  const getBadgeLabel = () => {
    switch (entryType) {
      case "voice":
        return "Voice Recording";
      case "photo":
        return "Photo";
      case "text":
        return "Text Entry";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries && entries.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <div className={`w-12 h-12 rounded-full ${getIconBg()} flex items-center justify-center mx-auto mb-2`}>
              {getIcon()}
            </div>
            <p>No {entryType} entries yet</p>
            <p className="text-sm mt-1">Start recording your wellness journey</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {entries?.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full ${getIconBg()} flex items-center justify-center`}>
                      {getIcon()}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary">
                        {getBadgeLabel()}
                      </Badge>
                      {entry.duration && (
                        <Badge variant="outline">{Math.round(entry.duration)}s</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed mb-3">
                      {entry.text}
                    </p>

                    {/* Display photo attachments */}
                    {entry.attachments && Array.isArray(entry.attachments) && entry.attachments.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        {entry.attachments.map((url: string, idx: number) => (
                          <div 
                            key={idx} 
                            className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => setSelectedImage({ url, filename: `photo-${idx + 1}.jpg` })}
                          >
                            <img 
                              src={url} 
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Tag className="w-3 h-3 text-muted-foreground" />
                        {entry.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <ImageZoomModal
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        imageUrl={selectedImage?.url || ""}
        filename={selectedImage?.filename || ""}
      />
    </div>
  );
}
