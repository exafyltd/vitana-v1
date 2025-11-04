interface InspirationalBannerProps {
  title: string;
  subtitle?: string;
}

export const InspirationalBanner = ({ 
  title, 
  subtitle 
}: InspirationalBannerProps) => {
  return (
    <div className="text-center py-8 mb-8 bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-lg">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
