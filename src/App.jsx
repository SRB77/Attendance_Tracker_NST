import React, { useState, useEffect, useCallback } from "react";
import AttendanceDashboard from "./components/AttendanceDashboard";
import {
  RefreshCw,
  AlertTriangle,
  LogIn,
  WifiOff,
  BookOpen,
} from "lucide-react";

function App() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null); // "NOT_LOGGED_IN" | "FETCH_FAILED_NO_CACHE" | "NO_NST_COURSE" | null
  const [isStale, setIsStale] = useState(false);
  const [staleReason, setStaleReason] = useState("");
  const [lastFetched, setLastFetched] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Fetch attendance via background service worker ──
  const fetchAttendance = useCallback((isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);

    chrome.runtime.sendMessage({ action: "FETCH_ATTENDANCE" }, (response) => {
      // Handle chrome runtime errors (e.g., extension context invalidated)
      if (chrome.runtime.lastError) {
        console.error("Runtime error:", chrome.runtime.lastError.message);
        setError("FETCH_FAILED_NO_CACHE");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!response) {
        setError("FETCH_FAILED_NO_CACHE");
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (response.success) {
        setAttendanceData(response.data);
        setLastFetched(response.lastFetched);
        setIsStale(response.stale || false);
        setStaleReason(response.staleReason || "");
        setError(null);
      }

      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, []);

  // ── On mount: fetch attendance ──
  useEffect(() => {
    fetchAttendance(false);
  }, [fetchAttendance]);

  // ── Format time ago ──
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "";
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  // ── Error States ──
  if (!isLoading && error) {
    return (
      <div
        className="w-184 h-131 flex flex-col items-center justify-center px-8"
        style={{ background: "var(--background)" }}
      >
        {error === "NOT_LOGGED_IN" && (
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <LogIn className="w-7 h-7" style={{ color: "#aaa" }} />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Not Logged In
            </h2>
            <p
              className="text-sm max-w-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Please login to{" "}
              <a
                href="https://my.newtonschool.co"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "#fff" }}
              >
                Newton School
              </a>{" "}
              in your browser first, then click the extension again.
            </p>
            <button
              onClick={() => fetchAttendance(false)}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.18)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </span>
            </button>
          </div>
        )}

        {(error === "FETCH_FAILED_NO_CACHE" || error === "NO_NST_COURSE") && (
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <WifiOff className="w-7 h-7" style={{ color: "#aaa" }} />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              Could Not Load Data
            </h2>
            <p
              className="text-sm max-w-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              {error === "NO_NST_COURSE"
                ? "No Newton School of Technology course found in your account."
                : "Failed to fetch attendance data. Please check your connection and try again."}
            </p>
            <button
              onClick={() => fetchAttendance(false)}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.18)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </span>
            </button>
          </div>
        )}

        {error === "NEED_SETUP" && (
          <div className="text-center space-y-4">
            <div
              className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <BookOpen className="w-7 h-7" style={{ color: "#aaa" }} />
            </div>
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              One-Time Setup Needed
            </h2>
            <p
              className="text-sm max-w-xs"
              style={{ color: "var(--muted-foreground)" }}
            >
              Open any course on{" "}
              <a
                href="https://my.newtonschool.co/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                style={{ color: "#fff" }}
              >
                Newton School
              </a>{" "}
              and click this extension once. After that, it will work from{" "}
              <strong style={{ color: "#fff" }}>any tab</strong> forever!
            </p>
            <button
              onClick={() => fetchAttendance(false)}
              className="mt-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.1)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              onMouseOver={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.18)")
              }
              onMouseOut={(e) =>
                (e.target.style.background = "rgba(255,255,255,0.1)")
              }
            >
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                I've opened a course, retry
              </span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Main Render ──
  return (
    <div className="relative">
      {/* ── Stale Data Warning Banner ── */}
      {isStale && !isLoading && (
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{
            background: "rgba(245, 158, 11, 0.12)",
            borderBottom: "1px solid rgba(245, 158, 11, 0.25)",
          }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: "#f59e0b" }}
            />
            <span
              className="text-xs"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {staleReason || "Showing cached data"} ·{" "}
              <span style={{ color: "var(--muted-foreground)" }}>
                Last updated {getTimeAgo(lastFetched)}
              </span>
            </span>
          </div>
          <button
            onClick={() => fetchAttendance(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.1)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <RefreshCw
              className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}

      {/* ── Last Fetched + Refresh (for fresh data too) ── */}
      {!isStale && !isLoading && lastFetched && (
        <div
          className="flex items-center justify-between px-5 pt-1.5 pb-0"
          style={{ background: "var(--background)" }}
        >
          <span
            className="text-[10px]"
            style={{ color: "var(--muted-foreground)" }}
          >
            Updated {getTimeAgo(lastFetched)}
          </span>
          <button
            onClick={() => fetchAttendance(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-[10px] transition-all duration-200"
            style={{ color: "var(--muted-foreground)" }}
          >
            <RefreshCw
              className={`w-2.5 h-2.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}

      <AttendanceDashboard
        AttandanceData={attendanceData}
        isLoading={isLoading}
      />
    </div>
  );
}

export default App;
