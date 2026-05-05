import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Edit, Copy, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from '@/lib/i18n-toast';

interface Template {
  id: string;
  name: string;
  description: string;
  category: "backup" | "security" | "deployment" | "monitoring" | "maintenance";
  lastUsed?: string;
  usageCount: number;
}

const mockTemplates: Template[] = [
  {
    id: "TPL-001",
    name: "Daily Database Backup",
    description: "Automated backup of all databases with compression and retention policy",
    category: "backup",
    lastUsed: "2 hours ago",
    usageCount: 142
  },
  {
    id: "TPL-002",
    name: "Security Vulnerability Scan",
    description: "Comprehensive security audit across all infrastructure components",
    category: "security",
    lastUsed: "1 day ago",
    usageCount: 89
  },
  {
    id: "TPL-003",
    name: "Blue-Green Deployment",
    description: "Zero-downtime deployment strategy with automatic rollback",
    category: "deployment",
    lastUsed: "3 days ago",
    usageCount: 56
  },
  {
    id: "TPL-004",
    name: "Resource Health Check",
    description: "Monitor CPU, memory, disk, and network across all nodes",
    category: "monitoring",
    lastUsed: "5 minutes ago",
    usageCount: 234
  },
  {
    id: "TPL-005",
    name: "Log Rotation & Cleanup",
    description: "Archive old logs and free up disk space automatically",
    category: "maintenance",
    lastUsed: "1 week ago",
    usageCount: 67
  },
  {
    id: "TPL-006",
    name: "Certificate Renewal",
    description: "Check and renew SSL/TLS certificates before expiration",
    category: "security",
    usageCount: 23
  },
];

export function TemplatesLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "All Templates" },
    { id: "backup", label: "Backup" },
    { id: "security", label: "Security" },
    { id: "deployment", label: "Deployment" },
    { id: "monitoring", label: "Monitoring" },
    { id: "maintenance", label: "Maintenance" },
  ];

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "backup": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "security": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "deployment": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "monitoring": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "maintenance": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('screens.dev.searchTemplates')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {categories.map((cat) => (
            <Button
              key={cat.id}
              size="sm"
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="overflow-visible">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(template.category))}>
                  {template.category}
                </span>
                <span className="text-xs text-muted-foreground font-mono">{template.id}</span>
              </div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <CardDescription className="text-xs">{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Used {template.usageCount} times</span>
                {template.lastUsed && <span>Last: {template.lastUsed}</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1">
                  <Play className="w-3 h-3 mr-2" />
                  Run Now
                </Button>
                <Button size="sm" variant="outline">
                  <Edit className="w-3 h-3" />
                </Button>
                <Button size="sm" variant="outline">
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('screens.dev.noTemplatesFoundMatchingYourCriteria')}</p>
        </div>
      )}
    </div>
  );
}
