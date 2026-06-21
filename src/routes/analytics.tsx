import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { addDays, format } from "date-fns";
import { TrendingDown } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import { toISO, recurringMatches } from "@/lib/dayflow/utils";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics — DayFlow" },
      {
        name: "description",
        content:
          "Hours per category vs. budget, completion trend, and what needs more time.",
      },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted)
    return (
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="h-[500px] rounded-2xl bg-card ring-1 ring-border animate-pulse" />
      </div>
    );
  return <AnalyticsContent />;
}

type Range = "week" | "month";

function AnalyticsContent() {
  const categories = useDayflow((s) => s.categories);
  const blocks = useDayflow((s) => s.blocks);
  const [range, setRange] = useState<Range>("week");

  const days = useMemo(() => {
    const len = range === "week" ? 7 : 30;
    return Array.from({ length: len }, (_, i) =>
      addDays(new Date(), -(len - 1) + i),
    );
  }, [range]);

  const categoryData = useMemo(() => {
    return categories
      .filter((c) => c.id !== "sleep" && c.id !== "personal")
      .map((c) => {
        const done = blocks
          .filter(
            (b) =>
              b.category === c.id &&
              b.completed &&
              days.some((d) => toISO(d) === b.date),
          )
          .reduce((acc, b) => acc + (b.endMinutes - b.startMinutes), 0);

        let budget = 0;
        for (const d of days) {
          if (c.recurring) {
            if (recurringMatches(c.recurring, d)) budget += c.budgetMinutes;
          } else {
            budget += c.budgetMinutes;
          }
        }
        const doneH = +(done / 60).toFixed(1);
        const budgetH = +(budget / 60).toFixed(1);
        const pct = budgetH === 0 ? 0 : Math.min(100, (doneH / budgetH) * 100);
        return {
          id: c.id,
          name: c.name,
          done: doneH,
          budget: budgetH,
          gap: +Math.max(0, budgetH - doneH).toFixed(1),
          pct: Math.round(pct),
          color: `var(--${c.color})`,
        };
      });
  }, [categories, blocks, days]);

  const needsMore = useMemo(() => {
    return categoryData
      .filter((c) => c.budget > 0 && c.pct < 80)
      .sort((a, b) => a.pct - b.pct)
      .slice(0, 3);
  }, [categoryData]);

  const trendData = useMemo(() => {
    const span = range === "week" ? 14 : 30;
    const ds = Array.from({ length: span }, (_, i) =>
      addDays(new Date(), -(span - 1) + i),
    );
    return ds.map((d) => {
      const iso = toISO(d);
      const dayBlocks = blocks.filter(
        (b) => b.date === iso && b.category !== "sleep",
      );
      const done = dayBlocks.filter((b) => b.completed).length;
      const total = dayBlocks.length;
      return {
        date: format(d, "MMM d"),
        completion: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    });
  }, [blocks, range]);

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Hours per category vs. budget and where you're falling behind
          </p>
        </div>
        <div className="inline-flex bg-card rounded-lg ring-1 ring-border p-0.5">
          {(["week", "month"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 h-8 rounded-md text-xs font-semibold transition ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "week" ? "Past 7 days" : "Past 30 days"}
            </button>
          ))}
        </div>
      </header>

      {needsMore.length > 0 && (
        <section className="bg-card rounded-2xl ring-1 ring-border p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="size-4 text-warning" />
            <h2 className="text-sm font-semibold">Needs more time</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {needsMore.map((c) => (
              <div
                key={c.id}
                className="rounded-xl bg-muted/40 ring-1 ring-border p-3"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="text-sm font-semibold">{c.name}</span>
                  <span className="ml-auto text-xs font-mono text-muted-foreground">
                    {c.pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Did <span className="font-semibold text-foreground">{c.done}h</span> of{" "}
                  <span className="font-semibold text-foreground">{c.budget}h</span>.
                  Add ~<span className="font-semibold text-foreground">{c.gap}h</span>{" "}
                  this {range === "week" ? "week" : "month"} to catch up.
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-card rounded-2xl ring-1 ring-border p-6">
          <h2 className="text-sm font-semibold mb-1">Hours vs. budget</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Completed (filled) compared to{" "}
            {range === "week" ? "weekly" : "monthly"} budget
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="h"
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Bar
                  dataKey="budget"
                  fill="var(--muted)"
                  radius={[6, 6, 0, 0]}
                  name="Budget (h)"
                />
                <Bar
                  dataKey="done"
                  fill="var(--primary)"
                  radius={[6, 6, 0, 0]}
                  name="Done (h)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="bg-card rounded-2xl ring-1 ring-border p-6">
          <h2 className="text-sm font-semibold mb-1">Completion trend</h2>
          <p className="text-xs text-muted-foreground mb-4">
            % of blocks completed per day
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval={range === "week" ? 1 : 4}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="completion"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--primary)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <section className="bg-card rounded-2xl ring-1 ring-border p-6">
        <h2 className="text-sm font-semibold mb-4">Category breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categoryData.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="text-xs font-medium">{c.name}</span>
              </div>
              <div className="text-xl font-semibold tabular-nums">
                {c.done}
                <span className="text-muted-foreground text-xs font-normal">
                  /{c.budget}h
                </span>
              </div>
              <div className="text-[10px] font-mono text-muted-foreground mb-1">
                {c.pct}% completed
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
