import React from "react";
import {
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Award,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./ui/tabs";
import { Progress } from "./ui/progress";

/* ── colour helpers ─────────────────────────────────────── */
const COLOR_MAP = {
  "bg-blue-500": {
    gradient: "bg-linear-to-r from-blue-500 to-blue-400",
    dot: "#3b82f6",
  },
  "bg-green-500": {
    gradient: "bg-linear-to-r from-emerald-500 to-green-400",
    dot: "#10b981",
  },
  "bg-purple-500": {
    gradient: "bg-linear-to-r from-purple-500 to-violet-400",
    dot: "#a855f7",
  },
  "bg-red-500": {
    gradient: "bg-linear-to-r from-rose-500 to-red-400",
    dot: "#ef4444",
  },
  "bg-yellow-500": {
    gradient: "bg-linear-to-r from-amber-500 to-yellow-400",
    dot: "#f59e0b",
  },
  "bg-pink-500": {
    gradient: "bg-linear-to-r from-pink-500 to-rose-400",
    dot: "#ec4899",
  },
  "bg-orange-500": {
    gradient: "bg-linear-to-r from-orange-500 to-amber-400",
    dot: "#f97316",
  },
  "bg-teal-500": {
    gradient: "bg-linear-to-r from-teal-500 to-cyan-400",
    dot: "#14b8a6",
  },
  "bg-indigo-500": {
    gradient: "bg-linear-to-r from-indigo-500 to-blue-400",
    dot: "#6366f1",
  },
  "bg-cyan-500": {
    gradient: "bg-linear-to-r from-cyan-500 to-sky-400",
    dot: "#06b6d4",
  },
};

const getColorInfo = (colorClass) => ({
  gradient: "bg-white",
  dot: "#ffffff",
});

/* ── main component ─────────────────────────────────────── */
function AttendanceDashboard({ AttandanceData, isLoading }) {
  const calcPercentage = (attended, total) =>
    total === 0 ? 0 : Math.round((attended / total) * 100);

  const getOverallStats = () => {
    const totalAttended = AttandanceData.reduce((a, s) => a + s.attended, 0);
    const totalClasses = AttandanceData.reduce((a, s) => a + s.total, 0);
    return {
      attended: totalAttended,
      total: totalClasses,
      percent: calcPercentage(totalAttended, totalClasses),
    };
  };

  const getStatus = (percent) => {
    if (percent >= 85)
      return { label: "Excellent", cls: "status-excellent", icon: Award };
    if (percent >= 75)
      return { label: "Good", cls: "status-good", icon: CheckCircle };
    if (percent >= 65)
      return { label: "Average", cls: "status-average", icon: TrendingUp };
    return { label: "Poor", cls: "status-poor", icon: AlertTriangle };
  };

  const getRequiredFor75 = (attended, total) => {
    const pct = total === 0 ? 100 : (attended / total) * 100;
    if (pct >= 75) {
      // Already at or above 75% — how many can we miss?
      // Find max X where (attended) / (total + X) >= 0.75
      const canMiss = Math.floor((attended - 0.75 * total) / 0.75);
      return {
        classesToAttend: 0,
        newAttended: attended,
        newTotal: total,
        canMiss: Math.max(0, canMiss),
        alreadyAbove: true,
      };
    }
    // Formula: (attended + X) / (total + X) = 0.75  →  X = 3*total - 4*attended
    const classesToAttend = Math.max(0, Math.ceil(3 * total - 4 * attended));
    const newAttended = attended + classesToAttend;
    const newTotal = total + classesToAttend;
    return {
      classesToAttend,
      newAttended,
      newTotal,
      canMiss: 0,
      alreadyAbove: false,
    };
  };

  const getOverallRequiredFor75 = () => {
    const totalAttended = AttandanceData.reduce((a, s) => a + s.attended, 0);
    const totalClasses = AttandanceData.reduce((a, s) => a + s.total, 0);
    return getRequiredFor75(totalAttended, totalClasses);
  };

  /* ── loading ── */
  if (isLoading) {
    return (
      <div
        role="status"
        className="w-184 h-131 flex flex-col items-center justify-center"
        style={{ background: "var(--background)" }}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-[3px] border-[rgba(255,255,255,0.1)]" />
          <div
            className="absolute inset-0 w-12 h-12 rounded-full border-[3px] border-transparent animate-spin"
            style={{
              borderTopColor: "#ffffff",
              borderRightColor: "#aaaaaa",
            }}
          />
        </div>
        <p
          className="mt-4 text-sm"
          style={{ color: "var(--muted-foreground)" }}
        >
          Loading attendance data…
        </p>
      </div>
    );
  }

  const overall = getOverallStats();
  const overallStatus = getStatus(overall.percent);

  /* ── dashboard ── */
  return (
    <div
      className="w-[46rem] h-[524px] overflow-auto flex flex-col"
      style={{ background: "var(--background)" }}
    >
      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-2">
        {/* Animated accent bar */}
        <div className="shimmer-bar h-0.75 rounded-full mb-4" />

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-header">
            Attendance Dashboard
          </h1>
          <span
            className="text-xs font-medium"
            style={{ color: "var(--muted-foreground)" }}
          >
            Built with ❤️ by Chandan
          </span>
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="overview" className="flex-1 px-5 pb-28">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        {/* ─── Overview ─── */}
        <TabsContent value="overview" className="flex-1 overflow-auto">
          <div className="grid gap-4 grid-cols-2">
            {AttandanceData.map((subject) => {
              const pct = calcPercentage(subject.attended, subject.total);
              const status = getStatus(pct);
              const colorInfo = getColorInfo(subject.color);
              const req = getRequiredFor75(subject.attended, subject.total);
              const StatusIcon = status.icon;

              return (
                <Card
                  className="subject-card gap-3 relative overflow-hidden"
                  key={subject.id}
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.75"
                    style={{
                      background: `linear-gradient(90deg, ${colorInfo.dot}, ${colorInfo.dot}88)`,
                    }}
                  />

                  <CardHeader className="pb-1 pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div
                          className="p-2 rounded-lg"
                          style={{ background: `${colorInfo.dot}22` }}
                        >
                          <BookOpen
                            className="h-4 w-4"
                            style={{ color: colorInfo.dot }}
                          />
                        </div>
                        <CardTitle className="text-sm font-semibold">
                          {subject.name}
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold">{pct}%</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pb-4">
                    {/* Progress bar */}
                    <Progress
                      value={pct}
                      className="h-2.5 mb-2.5"
                      indicatorClassName={colorInfo.gradient}
                    />

                    {/* Stats row */}
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--muted-foreground)" }}>
                        {subject.attended}/{subject.total} classes
                      </span>
                      <span
                        className={`flex items-center gap-1 font-medium ${status.cls}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </div>

                    {/* 75% target info */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {req.alreadyAbove ? (
                        <div
                          className="text-[10px] font-medium px-2 py-1 rounded-md"
                          style={{
                            background: "rgba(255,255,255,0.1)",
                            color: "#ffffff",
                          }}
                        >
                          ✓ Above 75% — can miss {req.canMiss}
                        </div>
                      ) : (
                        <>
                          <div
                            className="text-[10px] font-medium px-2 py-1 rounded-md"
                            style={{
                              background: "rgba(255,255,255,0.05)",
                              color: "#cccccc",
                            }}
                          >
                            Attend {req.classesToAttend} → {req.newAttended}/
                            {req.newTotal} = 75%
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── Details ─── */}
        <TabsContent value="details" className="flex-1 overflow-auto">
          <div className="grid gap-4 grid-cols-2">
            {AttandanceData.map((subject) => {
              const colorInfo = getColorInfo(subject.color);
              const overallPct = calcPercentage(
                subject.attended,
                subject.total,
              );

              return (
                <Card
                  className="subject-card gap-2 relative overflow-hidden"
                  key={subject.id}
                  style={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {/* Top accent bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.75"
                    style={{
                      background: `linear-gradient(90deg, ${colorInfo.dot}, rgba(255,255,255,0.2))`,
                    }}
                  />

                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div
                          className="p-1.5 rounded-lg"
                          style={{ background: `rgba(255,255,255,0.08)` }}
                        >
                          <BookOpen className="h-3.5 w-3.5 text-white" />
                        </div>
                        <CardTitle className="text-[11px] font-semibold truncate max-w-[100px]">
                          {subject.name}
                        </CardTitle>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{overallPct}%</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="px-4 pb-4 space-y-3">
                    {/* Class Breakdown */}
                    {subject.mainTotal > 0 &&
                      (() => {
                        const cPct = calcPercentage(
                          subject.mainAttended,
                          subject.mainTotal,
                        );
                        const cReq = getRequiredFor75(
                          subject.mainAttended,
                          subject.mainTotal,
                        );
                        return (
                          <div
                            className="rounded-md p-2"
                            style={{
                              background: "var(--background)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-medium text-[10px]">
                                Theory
                              </span>
                              <span className="font-bold text-[10px]">
                                {cPct}%
                              </span>
                            </div>
                            <Progress
                              value={cPct}
                              className="h-1 mb-1.5 bg-neutral-800"
                              indicatorClassName={colorInfo.gradient}
                            />
                            <div className="flex justify-between text-[9px] mb-1.5 text-neutral-400">
                              <span>
                                {subject.mainAttended}/{subject.mainTotal}
                              </span>
                              <span>
                                Missed:{" "}
                                {subject.mainTotal - subject.mainAttended}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {cReq.alreadyAbove ? (
                                <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm bg-white/10 text-white w-full text-center">
                                  ✓ Can miss {cReq.canMiss}
                                </div>
                              ) : (
                                <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm bg-white/5 text-neutral-300 w-full text-center">
                                  Attend {cReq.classesToAttend} = 75%
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                    {/* Lab Breakdown */}
                    {subject.labTotal > 0 &&
                      (() => {
                        const lPct = calcPercentage(
                          subject.labAttended,
                          subject.labTotal,
                        );
                        const lReq = getRequiredFor75(
                          subject.labAttended,
                          subject.labTotal,
                        );
                        return (
                          <div
                            className="rounded-md p-2"
                            style={{
                              background: "var(--background)",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="font-medium text-[10px]">
                                Lab
                              </span>
                              <span className="font-bold text-[10px]">
                                {lPct}%
                              </span>
                            </div>
                            <Progress
                              value={lPct}
                              className="h-1 mb-1.5 bg-neutral-800"
                              indicatorClassName={colorInfo.gradient}
                            />
                            <div className="flex justify-between text-[9px] mb-1.5 text-neutral-400">
                              <span>
                                {subject.labAttended}/{subject.labTotal}
                              </span>
                              <span>
                                Missed: {subject.labTotal - subject.labAttended}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {lReq.alreadyAbove ? (
                                <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm bg-white/10 text-white w-full text-center">
                                  ✓ Can miss {lReq.canMiss}
                                </div>
                              ) : (
                                <div className="text-[9px] font-medium px-1.5 py-0.5 rounded-sm bg-white/5 text-neutral-300 w-full text-center">
                                  Attend {lReq.classesToAttend} = 75%
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Fixed Footer — Overall Progress ── */}
      <div className="footer-glass fixed bottom-0 left-0 right-0 z-50 px-5 py-3">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            Overall Progress
          </span>
          <span
            className={`text-xs font-bold flex items-center gap-1.5 ${overallStatus.cls}`}
          >
            {overall.percent}% · {overallStatus.label}
          </span>
        </div>

        <Progress
          value={overall.percent}
          className="h-2.5 progress-glow"
          indicatorClassName="bg-white"
        />

        <div
          className="mt-1.5 flex justify-between text-xs"
          style={{ color: "var(--muted-foreground)" }}
        >
          <span>{overall.attended} classes attended</span>
          <span>{overall.total} total classes</span>
        </div>

        {/* 75% target info */}
        {(() => {
          const req = getOverallRequiredFor75();
          return (
            <div className="mt-2 flex gap-2 text-xs">
              {req.alreadyAbove ? (
                <div
                  className="font-medium px-2 py-1 rounded-md"
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#ffffff",
                  }}
                >
                  ✓ Above 75% overall — can miss {req.canMiss}
                </div>
              ) : (
                <div
                  className="font-medium px-2 py-1 rounded-md"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    color: "#cccccc",
                  }}
                >
                  Attend {req.classesToAttend} → {req.newAttended}/
                  {req.newTotal} = 75%
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export default AttendanceDashboard;
