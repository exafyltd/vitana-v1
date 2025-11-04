interface InspirationalBannerProps {
  title: string;
  subtitle?: string;
}

export const InspirationalBanner = ({ 
  title, 
  subtitle 
}: InspirationalBannerProps) => {
  return (
    <div className="text-center py-8 mb-8 relative overflow-hidden rounded-3xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 via-fuchsia-500/10 to-amber-500/10 backdrop-blur-sm animate-gradient-x" />
      
      {/* Subtle glow effects */}
      <div className="absolute top-0 left-1/4 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-fuchsia-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-amber-600 bg-clip-text text-transparent mb-2 animate-fade-in">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground animate-fade-in">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
