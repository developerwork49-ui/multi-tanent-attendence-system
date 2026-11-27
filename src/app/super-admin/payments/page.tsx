import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireSuperAdmin } from "@/lib/auth/dal";
import { platformDb } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { toId } from "@/lib/form";
import { one, pageParam, withQuery } from "@/lib/params";
import { PAYMENT_METHOD_LABEL } from "@/lib/billing";
import { dateOnlyToDb, dbToDateOnly, isMonth, monthLabel, shiftMonth, todayInZone } from "@/lib/dates";
import { PLATFORM_TIME_ZONE } from "@/lib/platform";
import type { Prisma } from "@/generated/prisma/client";
import { PageSkeleton } from "@/components/page-skeleton";
import { Button, Card, EmptyState, filterBar, inputClass, PageHeader, Pagination, Stat, subtleLink, td, th, theadRow, StatGrid } from "@/components/ui";

export const metadata: Metadata = { title: "Payments" };

const PAGE_SIZE = 30;

export default function PaymentsPage({ searchParams }: PageProps<"/super-admin/payments">) {
  return (
    <>
      <PageHeader title="Payments" description="Payments recorded by hand. Record new ones from a school's page." />
      <Suspense fallback={<PageSkeleton />}>
        <List searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function List({ searchParams }: { searchParams: PageProps<"/super-admin/payments">["searchParams"] }) {
  const user = await requireSuperAdmin();
  const sp = await searchParams;
  const m = one(sp.month);
  const month = isMonth(m) ? m : "";
  const schoolId = toId(one(sp.school));
  const page = pageParam(sp.page);

  const where: Prisma.PaymentWhereInput = {
    ...(schoolId && { schoolId }),
    ...(month && { paidOn: { gte: dateOnlyToDb(`${month}-01`), lt: dateOnlyToDb(`${shiftMonth(month, 1)}-01`) } }),
  };

  const { total, payments, totals, schools } = await platformDb(user, async (tx) => {
    const [total, payments, totals, schools] = await Promise.all([
      tx.payment.count({ where }),
      tx.payment.findMany({
        where,
        orderBy: [{ paidOn: "desc" }, { id: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { school: { select: { id: true, name: true } }, recordedBy: { select: { fullName: true } } },
      }),
      tx.payment.groupBy({ by: ["currency"], where, _sum: { amountMinor: true }, _count: { _all: true } }),
      tx.school.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true }, take: 1000 }),
    ]);
    return { total, payments, totals, schools };
  });

  const thisMonth = todayInZone(PLATFORM_TIME_ZONE).slice(0, 7);
  const months = Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, -i));

  return (
    <div className="space-y-4">
      <StatGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {totals.length === 0 ? (
          <Stat label="Total received" value="—" icon="wallet" />
        ) : (
          totals.map((t) => (
            <Stat key={t.currency} label={`Received · ${t.currency}`} value={formatMoney(t._sum.amountMinor ?? 0, t.currency)} hint={`${t._count._all} payments`} icon="wallet" tone="gold" />
          ))
        )}
      </StatGrid>
      <Card>
        <form className={filterBar}>
          <div>
            <label htmlFor="school" className="sr-only">School</label>
            <select id="school" name="school" defaultValue={schoolId ?? ""} className={`${inputClass} mt-0 w-auto max-w-64`}>
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="month" className="sr-only">Month</label>
            <select id="month" name="month" defaultValue={month} className={`${inputClass} mt-0 w-auto`}>
              <option value="">Any month</option>
              {months.map((mm) => (
                <option key={mm} value={mm}>{monthLabel(mm)}</option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="secondary">Filter</Button>
          {(month || schoolId) && (
            <Link href="/super-admin/payments" className={subtleLink}>Clear</Link>
          )}
        </form>
        {payments.length === 0 ? (
          <EmptyState>No payments found.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={theadRow}>
                  <th scope="col" className={th}>Paid on</th>
                  <th scope="col" className={th}>School</th>
                  <th scope="col" className={`${th} text-right`}>Amount</th>
                  <th scope="col" className={th}>Method</th>
                  <th scope="col" className={th}>Reference</th>
                  <th scope="col" className={th}>Recorded by</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className={`${td} whitespace-nowrap`}>{dbToDateOnly(p.paidOn)}</td>
                    <td className={td}>
                      <Link href={`/super-admin/schools/${p.school.id}`} className="text-slate-900 hover:underline">{p.school.name}</Link>
                    </td>
                    <td className={`${td} whitespace-nowrap text-right font-medium tabular-nums`}>{formatMoney(p.amountMinor, p.currency)}</td>
                    <td className={td}>{PAYMENT_METHOD_LABEL[p.method]}</td>
                    <td className={`${td} text-slate-600`}>{p.reference ?? "—"}</td>
                    <td className={`${td} text-slate-600`}>{p.recordedBy?.fullName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} noun="payments" href={(p) => withQuery("/super-admin/payments", { school: schoolId, month, page: p })} />
      </Card>
    </div>
  );
}
