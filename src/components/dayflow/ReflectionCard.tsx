import { useEffect, useState } from "react";
import { useDayflow } from "@/lib/dayflow/store";

interface Props {
  dateISO: string;
}

export function ReflectionCard({ dateISO }: Props) {
  const reflection = useDayflow((s) => s.reflections[dateISO]?.text ?? "");
  const setReflection = useDayflow((s) => s.setReflection);
  const [value, setValue] = useState(reflection);

  useEffect(() => setValue(reflection), [reflection, dateISO]);

  return (
    <section className="bg-foreground text-background rounded-2xl p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-background/50 mb-2">
        End-of-day reflection
      </p>
      <p className="text-sm font-medium text-balance mb-3">
        How did today go?
      </p>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => setReflection(dateISO, value)}
        placeholder="Wins, friction, what to try tomorrow…"
        rows={4}
        className="w-full bg-background/10 text-background placeholder:text-background/40 rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-background/30 resize-none border-none"
      />
    </section>
  );
}
