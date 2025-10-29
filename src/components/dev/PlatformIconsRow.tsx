import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const GoogleCloudIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.5 10h-5v4h5v-4z" fill="#EA4335"/>
    <path d="M14.5 10V7.5L12 5l-2.5 2.5V10h5z" fill="#4285F4"/>
    <path d="M9.5 10H7L4.5 12 7 14h2.5v-4z" fill="#34A853"/>
    <path d="M14.5 14v2.5L12 19l-2.5-2.5V14h5z" fill="#FBBC04"/>
    <path d="M14.5 10H17l2.5 2-2.5 2h-2.5v-4z" fill="#EA4335"/>
    <path d="M14.5 7.5H17L19.5 5 17 2.5h-2.5V5h-5V2.5H7L4.5 5 7 7.5h2.5V5h5v2.5z" fill="#4285F4"/>
    <path d="M9.5 16.5H7L4.5 19 7 21.5h2.5V19h5v2.5H17l2.5-2.5L17 16.5h-2.5V19h-5v-2.5z" fill="#34A853"/>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="white"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M12 4C7.58172 4 4 7.58172 4 12C4 15.5419 6.29204 18.5345 9.4706 19.5311C9.87063 19.6021 10.0166 19.3527 10.0166 19.1369C10.0166 18.943 10.0092 18.4282 10.0051 17.7538C7.78168 18.2365 7.31111 16.7419 7.31111 16.7419C6.94657 15.8738 6.42313 15.6251 6.42313 15.6251C5.69731 15.1306 6.47753 15.1408 6.47753 15.1408C7.28131 15.1975 7.70416 15.9689 7.70416 15.9689C8.41801 17.2053 9.57581 16.8538 10.0318 16.6462C10.1044 16.1344 10.3111 15.7836 10.5401 15.5806C8.76528 15.3753 6.89561 14.6895 6.89561 11.5297C6.89561 10.7106 7.20832 10.0413 7.71968 9.51649C7.63717 9.31102 7.36251 8.50951 7.79744 7.40263C7.79744 7.40263 8.46927 7.18293 9.99652 8.24413C10.6365 8.06299 11.3209 7.97242 12.0005 7.96896C12.6796 7.97242 13.3644 8.06299 14.0055 8.24413C15.5312 7.18293 16.2021 7.40263 16.2021 7.40263C16.638 8.50951 16.3633 9.31102 16.2808 9.51649C16.7932 10.0413 17.1038 10.7106 17.1038 11.5297C17.1038 14.6965 15.231 15.3732 13.4507 15.5744C13.7388 15.8222 13.9944 16.3097 13.9944 17.0547C13.9944 18.1138 13.9848 18.9662 13.9848 19.1369C13.9848 19.3547 14.1287 19.6061 14.5338 19.5301C17.7099 18.5315 20 15.5409 20 12C20 7.58172 16.4183 4 12 4Z" fill="#000000"/>
  </svg>
);

const SupabaseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" xmlns="http://www.w3.org/2000/svg">
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
