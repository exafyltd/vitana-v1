import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { siGooglecloud } from "simple-icons";

const GoogleCloudIcon = () => (
  <svg 
    viewBox="0 0 24 24" 
    className="h-5 w-5" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg"
    role="img"
  >
    <path d={siGooglecloud.path} />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);

const SupabaseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.38 21.81a.97.97 0 01-1.59-.75l-.48-12.22h8.16a.97.97 0 01.82 1.51l-7.19 10.65a.97.97 0 01-.72.81z" fill="#3ECF8E"/>
    <path d="M10.62 2.19a.97.97 0 011.59.75l.41 12.22H4.46a.97.97 0 01-.82-1.51l7.19-10.65a.97.97 0 01.79-.81z" fill="#3ECF8E"/>
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
    icon: <GitHubIcon />,
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
      <div className="flex items-center justify-end gap-2 my-3">
        {PLATFORM_LINKS.map((platform) => (
          <Tooltip key={platform.name}>
            <TooltipTrigger asChild>
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer transition-all hover:scale-110 hover:brightness-105"
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
