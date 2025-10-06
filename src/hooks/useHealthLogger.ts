import { useActivityLogger } from "./useActivityLogger";

export function useHealthLogger() {
  const { logActivity } = useActivityLogger();

  return {
    // Biomarker activities
    logBiomarkerView: async (testName: string, biomarkerCount: number) => {
      await logActivity({
        activityType: 'health.biomarker.view',
        activityData: { testName, biomarkerCount },
        dedupeKey: `biomarker-view-${testName}-${Date.now()}`,
      });
    },

    logBiomarkerUpload: async (source: 'pdf' | 'manual' | 'device', testName: string) => {
      await logActivity({
        activityType: `health.biomarker.upload_${source}`,
        activityData: { source, testName },
        dedupeKey: `biomarker-upload-${source}-${testName}-${Date.now()}`,
      });
    },

    logBiomarkerDownload: async (testName: string) => {
      await logActivity({
        activityType: 'health.biomarker.download',
        activityData: { testName },
        dedupeKey: `biomarker-download-${testName}-${Date.now()}`,
      });
    },

    logBiomarkerShare: async (testName: string, recipient: string) => {
      await logActivity({
        activityType: 'health.biomarker.share',
        activityData: { testName, recipient },
        dedupeKey: `biomarker-share-${testName}-${recipient}-${Date.now()}`,
      });
    },

    logBiomarkerOrderTest: async (testName: string) => {
      await logActivity({
        activityType: 'health.biomarker.order_test',
        activityData: { testName },
        dedupeKey: `biomarker-order-${testName}-${Date.now()}`,
      });
    },

    logDeviceConnect: async (deviceType: string) => {
      await logActivity({
        activityType: 'health.biomarker.connect_device',
        activityData: { deviceType },
        dedupeKey: `device-connect-${deviceType}-${Date.now()}`,
      });
    },

    // Lab report activities
    logLabReportUpload: async () => {
      await logActivity({
        activityType: 'health.lab_report.upload',
        activityData: { action: 'upload' },
        dedupeKey: `lab-report-upload-${Date.now()}`,
      });
    },

    logLabReportExport: async () => {
      await logActivity({
        activityType: 'health.lab_report.export',
        activityData: { action: 'export' },
        dedupeKey: `lab-report-export-${Date.now()}`,
      });
    },

    // Omics activities
    logOmicsUpload: async (type: string, provider: string) => {
      await logActivity({
        activityType: 'health.omics.upload',
        activityData: { type, provider },
        dedupeKey: `omics-upload-${type}-${provider}-${Date.now()}`,
      });
    },

    logOmicsView: async (type: string, name: string) => {
      await logActivity({
        activityType: 'health.omics.view',
        activityData: { type, name },
        dedupeKey: `omics-view-${name}-${Date.now()}`,
      });
    },

    logOmicsConnectAPI: async (provider: string) => {
      await logActivity({
        activityType: 'health.omics.connect_api',
        activityData: { provider },
        dedupeKey: `omics-api-${provider}-${Date.now()}`,
      });
    },

    // Supplement activities
    logSupplementAdd: async (name: string, category: string) => {
      await logActivity({
        activityType: 'health.supplement.add',
        activityData: { name, category },
        dedupeKey: `supplement-add-${name}-${Date.now()}`,
      });
    },

    logSupplementUpdate: async (name: string) => {
      await logActivity({
        activityType: 'health.supplement.update',
        activityData: { name },
        dedupeKey: `supplement-update-${name}-${Date.now()}`,
      });
    },

    logSupplementDelete: async (name: string) => {
      await logActivity({
        activityType: 'health.supplement.delete',
        activityData: { name },
        dedupeKey: `supplement-delete-${name}-${Date.now()}`,
      });
    },
  };
}
