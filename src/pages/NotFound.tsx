import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { t } from '@/lib/i18n-toast';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-4">{t('screens.notfound.oopsPageNotFound')}</p>
        <Link to="/" className="text-status-info hover:text-status-info underline">
          {t('screens.notfound.returnHome')}
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
