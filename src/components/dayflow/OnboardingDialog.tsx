import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useDayflow } from "@/lib/dayflow/store";
import { minutesToShort } from "@/lib/dayflow/utils";

const parseTime = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Props {
  onClose: () => void;
}

export function OnboardingDialog({ onClose }: Props) {
  const prefs = useDayflow((s) => s.prefs);
  const setPrefs = useDayflow((s) => s.setPrefs);
  const markOnboarded = useDayflow((s) => s.markOnboarded);

  const skip = () => {
    markOnboarded();
    onClose();
  };


  const [wake, setWake] = useState(minutesToShort(prefs.wakeTime));
  const [sleep, setSleep] = useState(minutesToShort(prefs.sleepTime));
  const [breakfast, setBreakfast] = useState(minutesToShort(prefs.breakfast));
  const [lunch, setLunch] = useState(minutesToShort(prefs.lunch));
  const [dinner, setDinner] = useState(minutesToShort(prefs.dinner));
  const [gymOn, setGymOn] = useState(prefs.gymTime != null);
  const [gymTime, setGymTime] = useState(minutesToShort(prefs.gymTime ?? 17 * 60));
  const [gymDays, setGymDays] = useState<number[]>(prefs.gymDays);
  const [focusStart, setFocusStart] = useState(minutesToShort(prefs.focusStart));
  const [focusEnd, setFocusEnd] = useState(minutesToShort(prefs.focusEnd));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setPrefs({
      wakeTime: parseTime(wake),
      sleepTime: parseTime(sleep),
      breakfast: parseTime(breakfast),
      lunch: parseTime(lunch),
      dinner: parseTime(dinner),
      gymTime: gymOn ? parseTime(gymTime) : undefined,
      gymDays: gymOn ? gymDays : [],
      focusStart: parseTime(focusStart),
      focusEnd: parseTime(focusEnd),
    });
    markOnboarded();
    onClose();
  };

  const T = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <label className="space-y-1.5 block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm outline-none focus:ring-2 focus:ring-ring/30"
      />
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm grid place-items-center p-4 overflow-auto">
      <form
        onSubmit={submit}
        className="bg-card rounded-2xl ring-1 ring-border shadow-xl w-full max-w-lg p-6 space-y-5 my-8"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="text-lg font-semibold">Personalize your schedule</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              We'll use this to auto-plan your days around your routine.
            </p>
          </div>
          <button
            type="button"
            onClick={skip}
            className="size-7 grid place-items-center rounded-md hover:bg-muted text-muted-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <T label="Wake up" value={wake} onChange={setWake} />
          <T label="Go to sleep" value={sleep} onChange={setSleep} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <T label="Breakfast" value={breakfast} onChange={setBreakfast} />
          <T label="Lunch" value={lunch} onChange={setLunch} />
          <T label="Dinner" value={dinner} onChange={setDinner} />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={gymOn}
              onChange={(e) => setGymOn(e.target.checked)}
              className="size-4"
            />
            I go to the gym
          </label>
          {gymOn && (
            <div className="space-y-2 pl-6">
              <T label="Gym time" value={gymTime} onChange={setGymTime} />
              <div className="flex flex-wrap gap-1.5">
                {DAY_NAMES.map((d, i) => {
                  const on = gymDays.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setGymDays((prev) =>
                          on ? prev.filter((x) => x !== i) : [...prev, i].sort(),
                        )
                      }
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                        on
                          ? "bg-primary text-primary-foreground border-transparent"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Focus window (work/study)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <T label="From" value={focusStart} onChange={setFocusStart} />
            <T label="To" value={focusEnd} onChange={setFocusEnd} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={skip}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            Skip
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90"
          >
            Save preferences
          </button>
        </div>
      </form>
    </div>
  );
}
