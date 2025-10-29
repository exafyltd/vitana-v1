import { Github } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GoogleCloudIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 10h-5v4h5v-4z" fill="#EA4335"/>
    <path d="M14.5 10V7.5L12 5l-2.5 2.5V10h5z" fill="#4285F4"/>
    <path d="M9.5 10H7L4.5 12 7 14h2.5v-4z" fill="#34A853"/>
    <path d="M14.5 14v2.5L12 19l-2.5-2.5V14h5z" fill="#FBBC04"/>
    <path d="M14.5 10H17l2.5 2-2.5 2h-2.5v-4z" fill="#EA4335"/>
    <path d="M14.5 7.5H17L19.5 5 17 2.5h-2.5V5h-5V2.5H7L4.5 5 7 7.5h2.5V5h5v2.5z" fill="#4285F4"/>
    <path d="M9.5 16.5H7L4.5 19 7 21.5h2.5V19h5v2.5H17l2.5-2.5L17 16.5h-2.5V19h-5v-2.5z" fill="#34A853"/>
  </svg>
);

const SupabaseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M13.3803 21.8133C12.8971 22.5101 11.8308 22.1604 11.7945 21.2944L11.3125 9.0769H19.4762C20.5674 9.0769 21.208 10.3402 20.5674 11.1679L13.3803 21.8133Z"
      fill="url(#supabase-gradient-1)"
    />
    <path
      d="M13.3803 21.8133C12.8971 22.5101 11.8308 22.1604 11.7945 21.2944L11.3125 9.0769H19.4762C20.5674 9.0769 21.208 10.3402 20.5674 11.1679L13.3803 21.8133Z"
      fill="url(#supabase-gradient-2)"
      fillOpacity="0.2"
    />
    <path
      d="M10.6198 2.18674C11.103 1.48987 12.1693 1.8396 12.2056 2.70563L12.6144 14.9231H4.52386C3.43264 14.9231 2.79205 13.6598 3.43264 12.8321L10.6198 2.18674Z"
      fill="#3ECF8E"
    />
    <defs>
      <linearGradient id="supabase-gradient-1" x1="11.3125" y1="11.4808" x2="17.8413" y2="13.5577" gradientUnits="userSpaceOnUse">
        <stop stopColor="#249361"/>
        <stop offset="1" stopColor="#3ECF8E"/>
      </linearGradient>
      <linearGradient id="supabase-gradient-2" x1="8.91672" y1="7.61548" x2="13.4542" y2="11.1924" gradientUnits="userSpaceOnUse">
        <stop/>
        <stop offset="1" stopOpacity="0"/>
      </linearGradient>
    </defs>
  </svg>
);

interface PlatformLink {
  name: string;
  url: string;
  icon: React.ReactNode;
}

const PLATFORM_LINKS: PlatformLink[] = [
  {
    name: "Google Cloud Console",
    url: "https://console.cloud.google.com/",
    icon: <GoogleCloudIcon />,
  },
  {
    name: "GitHub",
    url: "https://github.com/",
    icon: <Github className="h-5 w-5" />,
  },
  {
    name: "Supabase",
    url: "https://supabase.com/dashboard/project/inmkhvwdcuyhnxkgfvsb",
    icon: <SupabaseIcon />,
  },
];

export function PlatformIconsRow() {
  return (
    <TooltipProvider>
      <div className="flex items-center justify-start gap-3 my-3">
        {PLATFORM_LINKS.map((platform) => (
          <Tooltip key={platform.name}>
            <TooltipTrigger asChild>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer transition-all hover:scale-110 hover:opacity-80"
                aria-label={platform.name}
              >
                {platform.icon}
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>{platform.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
