// ─── Newton Attendance Background Service Worker ───
// Handles FETCH_ATTENDANCE messages from popup.
// Flow: Read cookie → Fetch API → Save to storage → Return data
// On failure: Return cached data with stale flag

const NEWTON_API_BASE = "https://my.newtonschool.co/api/v2";
const COOKIE_URL = "https://my.newtonschool.co";
const COOKIE_NAME = "access_token_ns_student_web";

chrome.runtime.onInstalled.addListener(() => {
  console.log("Newton Attendance Extension Installed");
});

// ─── Helpers ─────────────────────────────────────────

/**
 * Read the Newton session token from browser cookies
 */
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    chrome.cookies.get({ url: COOKIE_URL, name: COOKIE_NAME }, (cookie) => {
      if (cookie && cookie.value) {
        resolve(cookie.value);
      } else {
        reject(new Error("NOT_LOGGED_IN"));
      }
    });
  });
}

/**
 * Fetch JSON from Newton API with auth token
 */
async function apiFetch(endpoint, token) {
  const response = await fetch(`${NEWTON_API_BASE}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

/**
 * Get the user's course hash. Strategy:
 *   1. Check if we have a saved course hash in storage
 *   2. If not, try to find it from the active Newton tab
 *   3. If not, try the enrolled_courses API
 *   4. If nothing works, throw NEED_SETUP error
 */
async function getCourseHash(token) {
  // Strategy 1: Check storage for previously saved hash
  const stored = await chrome.storage.local.get(["courseHash"]);
  if (stored.courseHash) {
    console.log("Using stored course hash:", stored.courseHash);
    return stored.courseHash;
  }

  // Strategy 2: Try to extract from an open Newton tab
  try {
    const tabs = await chrome.tabs.query({ url: "*://*.newtonschool.co/*" });
    for (const tab of tabs) {
      if (tab.url && tab.url.includes("/course/")) {
        const parts = tab.url.split("/");
        // URL pattern: https://my.newtonschool.co/course/{hash}/...
        const courseIdx = parts.indexOf("course");
        if (courseIdx !== -1 && parts[courseIdx + 1]) {
          const hash = parts[courseIdx + 1];
          // Save for future use
          await chrome.storage.local.set({ courseHash: hash });
          console.log("Extracted course hash from open tab:", hash);
          return hash;
        }
      }
    }
  } catch (err) {
    console.log("Could not query tabs:", err.message);
  }

  // Strategy 3: Try the enrolled courses API
  try {
    const data = await apiFetch("/user/enrolled_courses/", token);
    let courses = data;
    // Handle if response is paginated
    if (data.results) courses = data.results;
    if (data.data) courses = data.data;

    if (Array.isArray(courses)) {
      const nstCourse = courses.find(
        (c) => c.title && c.title.includes("Newton School of Technology"),
      );
      if (nstCourse && nstCourse.hash) {
        await chrome.storage.local.set({ courseHash: nstCourse.hash });
        console.log("Found course hash from API:", nstCourse.hash);
        return nstCourse.hash;
      }
    }
  } catch (err) {
    console.log("Enrolled courses API failed:", err.message);
  }

  // Strategy 4: Try alternative API endpoints
  const alternativeEndpoints = [
    "/user/courses/",
    "/course/enrolled/",
    "/user/course/all/",
  ];

  for (const endpoint of alternativeEndpoints) {
    try {
      const data = await apiFetch(endpoint, token);
      let courses = data;
      if (data.results) courses = data.results;
      if (data.data) courses = data.data;

      if (Array.isArray(courses)) {
        const nstCourse = courses.find(
          (c) => c.title && c.title.includes("Newton School of Technology"),
        );
        if (nstCourse && nstCourse.hash) {
          await chrome.storage.local.set({ courseHash: nstCourse.hash });
          console.log("Found course hash from", endpoint, ":", nstCourse.hash);
          return nstCourse.hash;
        }
      }
    } catch (err) {
      console.log(endpoint, "failed:", err.message);
    }
  }

  // Nothing worked
  throw new Error("NEED_SETUP");
}

/**
 * Fetch all learning courses under a parent course hash
 */
async function fetchAllCourses(courseHash, token) {
  const data = await apiFetch(
    `/course/h/${courseHash}/learning_course/all/?pagination=false`,
    token,
  );
  return data;
}

/**
 * Group courses by subject prefix (e.g. "CS101")
 */
function groupCourses(courses) {
  // Filter to only Newton School of Technology courses
  courses = courses.filter((c) =>
    c.title.includes("Newton School of Technology"),
  );

  const subjectPrefixes = [
    ...new Set(courses.map((c) => c.short_display_name.split(" ")[0])),
  ];

  const grouped = {};
  for (const prefix of subjectPrefixes) {
    const main = courses.filter(
      (c) =>
        c.short_display_name.split(" ")[0] === prefix &&
        !c.short_display_name.includes("Lab") &&
        !c.short_display_name.includes("Tut"),
    );
    const lab = courses.filter(
      (c) =>
        (c.short_display_name.includes("Lab") ||
          c.short_display_name.includes("Tut")) &&
        c.short_display_name.includes(prefix),
    );
    grouped[prefix] = { main, lab };
  }

  return grouped;
}

/**
 * Fetch attendance data for all grouped courses
 */
async function fetchAttendanceData(groupedCourses, token) {
  const results = [];
  let id = 0;

  const colorPalette = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-cyan-500",
  ];
  const usedColors = [];

  for (const subjectName in groupedCourses) {
    const group = groupedCourses[subjectName];
    let mainAttended = 0,
      mainTotal = 0,
      labAttended = 0,
      labTotal = 0;

    // Fetch main course attendance
    for (const course of group.main) {
      try {
        const data = await apiFetch(
          `/course/h/${course.hash}/self_performance`,
          token,
        );
        mainAttended += data.total_lectures_attended || 0;
        mainTotal += data.total_lectures || 0;
      } catch (err) {
        console.error(
          `Error fetching main course data for ${course.short_display_name}:`,
          err,
        );
      }
    }

    // Fetch lab/tut course attendance
    for (const course of group.lab) {
      try {
        const data = await apiFetch(
          `/course/h/${course.hash}/self_performance`,
          token,
        );
        labAttended += data.total_lectures_attended || 0;
        labTotal += data.total_lectures || 0;
      } catch (err) {
        console.error(
          `Error fetching lab course data for ${course.short_display_name}:`,
          err,
        );
      }
    }

    // Pick a unique color
    let color = colorPalette[id % colorPalette.length];
    if (!usedColors.includes(color)) {
      usedColors.push(color);
    }

    const totalAttended = mainAttended + labAttended;
    const totalClasses = mainTotal + labTotal;

    results.push({
      id,
      name: subjectName,
      total: totalClasses,
      attended: totalAttended,
      futureClasses: Math.abs(totalClasses - 53),
      color,
      mainAttended,
      mainTotal,
      labAttended,
      labTotal,
    });
    id++;
  }

  return results;
}

// ─── Main Message Handler ────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Legacy handler for backward compatibility
  if (message.action === "getCookies") {
    chrome.cookies.getAll({ domain: "newtonschool.co" }, (cookies) => {
      sendResponse({ cookies });
    });
    return true;
  }

  // Save course hash when user visits Newton course page
  if (message.action === "SAVE_COURSE_HASH") {
    chrome.storage.local.set({ courseHash: message.courseHash }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }

  // New handler: Fetch attendance from any tab
  if (message.action === "FETCH_ATTENDANCE") {
    (async () => {
      try {
        // Step 1: Get access token from cookie
        const token = await getAccessToken();

        // Step 2: Get course hash (from storage, open tab, or API)
        const courseHash = await getCourseHash(token);

        // Step 3: Fetch all learning courses
        const allCourses = await fetchAllCourses(courseHash, token);

        // Step 4: Group courses by subject
        const grouped = groupCourses(allCourses);

        // Step 5: Fetch attendance for all subjects
        const attendanceData = await fetchAttendanceData(grouped, token);

        // Step 6: Save to storage
        const payload = {
          attendanceData,
          lastFetched: Date.now(),
        };
        await chrome.storage.local.set(payload);

        // Step 7: Return fresh data
        sendResponse({
          success: true,
          data: attendanceData,
          lastFetched: payload.lastFetched,
          stale: false,
        });
      } catch (err) {
        console.error("FETCH_ATTENDANCE error:", err.message);

        // Determine error type
        if (err.message === "NOT_LOGGED_IN") {
          sendResponse({ error: "NOT_LOGGED_IN" });
          return;
        }

        if (err.message === "NEED_SETUP") {
          // Try cache first
          const cached = await chrome.storage.local.get([
            "attendanceData",
            "lastFetched",
          ]);
          if (cached.attendanceData) {
            sendResponse({
              success: true,
              data: cached.attendanceData,
              lastFetched: cached.lastFetched,
              stale: true,
              staleReason: "Could not find course. Showing cached data.",
            });
          } else {
            sendResponse({ error: "NEED_SETUP" });
          }
          return;
        }

        // General failure — try cache
        const cached = await chrome.storage.local.get([
          "attendanceData",
          "lastFetched",
        ]);
        if (cached.attendanceData) {
          sendResponse({
            success: true,
            data: cached.attendanceData,
            lastFetched: cached.lastFetched,
            stale: true,
            staleReason: "Fetch failed. Showing cached data.",
          });
        } else {
          sendResponse({ error: "FETCH_FAILED_NO_CACHE" });
        }
      }
    })();

    return true; // Required for async sendResponse
  }
});
