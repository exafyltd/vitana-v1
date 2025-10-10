import { Button } from "@/components/ui/button";
import { Upload, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface ImportContactsButtonProps {
  onImport: (contacts: Array<{ contact_name: string; contact_phone?: string; contact_email?: string }>) => Promise<void>;
}

export default function ImportContactsButton({ onImport }: ImportContactsButtonProps) {
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    // Check if Contacts API is available
    if (!('contacts' in navigator)) {
      toast({
        title: "Not Available",
        description: "Phone contact import is only available on mobile devices with supported browsers.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);

      const props = ['name', 'tel', 'email'];
      const opts = { multiple: true };

      // @ts-ignore - Contacts API is not yet in TypeScript definitions
      const contacts = await navigator.contacts.select(props, opts);

      if (!contacts || contacts.length === 0) {
        toast({
          title: "No contacts selected",
          description: "Please select at least one contact to import.",
        });
        return;
      }

      // Transform to our format
      const formattedContacts = contacts.map((c: any) => ({
        contact_name: c.name?.[0] || 'Unknown',
        contact_phone: c.tel?.[0],
        contact_email: c.email?.[0],
      }));

      await onImport(formattedContacts);

      toast({
        title: "Contacts imported!",
        description: `Successfully imported ${formattedContacts.length} contact(s).`,
      });
    } catch (error) {
      console.error("Error importing contacts:", error);
      
      if ((error as Error).name !== 'AbortError') {
        toast({
          title: "Import failed",
          description: "Failed to import contacts. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleImport}
      disabled={isImporting}
      className="flex items-center gap-2"
    >
      {isImporting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Importing...
        </>
      ) : (
        <>
          <Upload className="w-4 h-4" />
          Import
        </>
      )}
    </Button>
  );
}
