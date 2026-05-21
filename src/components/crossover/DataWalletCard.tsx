import { CrossoverCard } from "./CrossoverCard";
import { Shield, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { withCardId } from "@/lib/withCardId";
import { t } from '@/lib/i18n-toast';

interface HealthReport {
  type: string;
  status: "ready" | "pending" | "expired";
  lastUpdated: string;
}

interface DataWalletCardProps {
  reports?: HealthReport[];
  className?: string;
}

function DataWalletCardBase({ 
  reports,
  className 
}: DataWalletCardProps) {
  const navigate = useNavigate();

  const defaultReports: HealthReport[] = [
    { type: "Genomics", status: "ready", lastUpdated: "2 days ago" },
    { type: "Sleep Analysis", status: "ready", lastUpdated: "1 day ago" },
    { type: "Heart Rate", status: "pending", lastUpdated: "Processing..." }
  ];

  const reportList = reports || defaultReports;
  const readyReports = reportList.filter(report => report.status === "ready");

  const getStatusColor = (status: HealthReport["status"]) => {
    switch (status) {
      case "ready": return "text-green-600";
      case "pending": return "text-yellow-600";
      case "expired": return "text-red-600";
      default: return "text-gray-600";
    }
  };

  const content = (
    <div className="space-y-2">
      {readyReports.slice(0, 2).map((report, index) => (
        <div key={index} className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3 text-blue-600" />
            <span className="font-medium">{report.type}</span>
          </div>
          <span className={getStatusColor(report.status)}>
            {report.status === "ready" ? "Ready" : report.lastUpdated}
          </span>
        </div>
      ))}
      
      {readyReports.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-2">{t('screens.crossover.lengthReportValue1ReadyShare', { length: readyReports.length, value1: readyReports.length !== 1 ? 's' : '' })}
        </p>
      )}
    </div>
  );

  return (
    <CrossoverCard
      icon={Shield}
      category="data"
      title={t('screens.crossover.healthDataWallet')}
      subtitle="Secure access to your health reports and analytics"
      content={content}
      buttonText="View Reports"
      onButtonClick={() => navigate('/health/my-health-tracker')}
      secondaryButtonText="Share Data"
      onSecondaryButtonClick={() => navigate('/connectors')}
      className={className}
    />
  );
}

export const DataWalletCard = withCardId(DataWalletCardBase, "CT-CX-004", "C-009");