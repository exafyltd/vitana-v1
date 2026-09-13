/** BackOffice › Sales & CRM › Contacts & Companies (BO-006) — VTID-03855, Read tier: CRM contacts, CRM companies, customers. */
import { useState } from "react";
import BackOfficePage from "@/components/backoffice/BackOfficePage";
import DataSourceNote from "@/components/backoffice/DataSourceNote";
import DocStatusBadge from "@/components/backoffice/DocStatusBadge";
import QueryState from "@/components/backoffice/QueryState";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMyErpAccess } from "@/hooks/useBackOfficeAccess";
import { hasAnyCapability, shortId, useErpRead } from "@/hooks/useBackOfficeCommands";
import { formatMoney, fullTextMatch, type ErpCrmCompany, type ErpCrmContact, type ErpCustomer } from "@/lib/backoffice-sales";
import { t } from "@/lib/i18n-toast";
import { DraftCommandButton } from "@/components/backoffice/DraftCommandDialog";

const CAPS = ["crm.view", "sales.view"] as const;

export default function BackOfficeContacts() {
  const me = useMyErpAccess();
  const canCrm = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, ["crm.view"]));
  const canSales = !!me.data && (me.data.is_exafy_admin || hasAnyCapability(me.data.capabilities, ["sales.view"]));
  const [search, setSearch] = useState("");
  const contacts = useErpRead<{ crm_contacts?: ErpCrmContact[] }>("crm.contact.list", { limit: 100 }, { enabled: canCrm });
  const companies = useErpRead<{ crm_companies?: ErpCrmCompany[] }>("crm.company.list", { limit: 100 }, { enabled: canCrm });
  const customers = useErpRead<{ customers?: ErpCustomer[] }>("sales.customer.list", { limit: 100 }, { enabled: canSales });
  const companyById = new Map((companies.data?.result?.crm_companies ?? []).map((c) => [c.id, c.name]));
  const contactRows = (contacts.data?.result?.crm_contacts ?? []).filter((c) => fullTextMatch(search, c.name, c.email, c.job_title, companyById.get(c.crm_company_id ?? "")));
  const companyRows = (companies.data?.result?.crm_companies ?? []).filter((c) => fullTextMatch(search, c.name, c.domain, c.industry, c.city, c.country));
  const customerRows = (customers.data?.result?.customers ?? []).filter((c) => fullTextMatch(search, c.name, c.customer_group, c.territory, c.customer_type));

  return (
    <BackOfficePage sectionKey="sales" screenId="BO-006" emoji="👥" title={t("screens.backoffice.sales.contacts.title")} description={t("screens.backoffice.sales.contacts.description")} capabilities={CAPS} rightAction={<div className="flex flex-wrap gap-2"><DraftCommandButton formId="contact" /><DraftCommandButton formId="company" /></div>}>
      <AdminFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("screens.backoffice.sales.contacts.searchPlaceholder")} onReset={() => setSearch("")} />

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.contacts.contacts")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {!canCrm && me.data ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.contacts.needsCrmView")}</p> : (
            QueryState({ isLoading: me.isLoading || contacts.isLoading, error: contacts.error, isEmpty: contactRows.length === 0, emptyTitle: t("screens.backoffice.sales.contacts.noContacts"), rows: 3 }) ?? (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("screens.backoffice.sales.contacts.name")}</TableHead>
                      <TableHead>{t("screens.backoffice.sales.contacts.role")}</TableHead>
                      <TableHead>{t("screens.backoffice.sales.contacts.company")}</TableHead>
                      <TableHead>{t("screens.backoffice.sales.common.contact")}</TableHead>
                      <TableHead>{t("screens.backoffice.sales.contacts.lifecycle")}</TableHead>
                      <TableHead>{t("screens.backoffice.sales.contacts.location")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contactRows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="text-sm font-medium">{c.name}</div>
                          <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{shortId(c.id)}</div>
                        </TableCell>
                        <TableCell className="text-xs">{c.job_title ?? "—"}</TableCell>
                        <TableCell className="text-xs">{c.crm_company_id ? (companyById.get(c.crm_company_id) ?? shortId(c.crm_company_id)) : "—"}</TableCell>
                        <TableCell className="text-xs" dir="ltr"><div>{c.email ?? "—"}</div><div className="text-muted-foreground">{c.phone ?? c.mobile ?? ""}</div></TableCell>
                        <TableCell><DocStatusBadge status={c.lifecycle} /></TableCell>
                        <TableCell className="text-xs">{[c.city, c.country].filter(Boolean).join(", ") || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          )}
          {canCrm && <DataSourceNote command={contacts.data?.command} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.contacts.companies")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!canCrm && me.data ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.contacts.needsCrmView")}</p> : (
              QueryState({ isLoading: me.isLoading || companies.isLoading, error: companies.error, isEmpty: companyRows.length === 0, emptyTitle: t("screens.backoffice.sales.contacts.noCompanies"), rows: 3 }) ?? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("screens.backoffice.sales.contacts.name")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.contacts.industry")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.contacts.lifecycle")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.contacts.customerLink")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {companyRows.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{c.domain ?? shortId(c.id)}</div>
                          </TableCell>
                          <TableCell className="text-xs">{c.industry ?? "—"}</TableCell>
                          <TableCell><DocStatusBadge status={c.lifecycle} /></TableCell>
                          <TableCell className="text-xs font-mono" dir="ltr">{c.linked_customer_id ? shortId(c.linked_customer_id) : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
            {canCrm && <DataSourceNote command={companies.data?.command} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">{t("screens.backoffice.sales.contacts.customers")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {!canSales && me.data ? <p className="text-sm text-muted-foreground">{t("screens.backoffice.sales.contacts.needsSalesView")}</p> : (
              QueryState({ isLoading: me.isLoading || customers.isLoading, error: customers.error, isEmpty: customerRows.length === 0, emptyTitle: t("screens.backoffice.sales.contacts.noCustomers"), rows: 3 }) ?? (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("screens.backoffice.sales.contacts.name")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.contacts.type")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.contacts.creditLimit")}</TableHead>
                        <TableHead>{t("screens.backoffice.sales.common.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerRows.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{c.name}</div>
                            <div className="font-mono text-[11px] text-muted-foreground" dir="ltr">{shortId(c.id)}</div>
                          </TableCell>
                          <TableCell className="text-xs">{c.customer_type ?? "—"}{c.customer_group ? ` · ${c.customer_group}` : ""}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{formatMoney(c.credit_limit)}</TableCell>
                          <TableCell><DocStatusBadge status={c.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            )}
            {canSales && <DataSourceNote command={customers.data?.command} />}
          </CardContent>
        </Card>
      </div>
    </BackOfficePage>
  );
}
