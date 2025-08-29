import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { memoryNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Search, Brain } from "lucide-react";
import { useState } from "react";

function Recall() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <AppLayout>
      <SEO title="Recall & Search - Vitana Memory" description="Search and recall your health memories with AI assistance." />
      <SubNavigation items={memoryNavigation} />
      
      <div className="px-6 py-8 space-y-8">
        <StandardHeader 
          title="Recall & Search"
          description="AI-powered search through your health memories and experiences"
        />

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Ask about your health history..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button>
                <Brain className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">AI Memory Search</h3>
          <p className="text-muted-foreground">
            Search through your health timeline using natural language
          </p>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Recall, SCREEN_IDS.MEMORY_RECALL);