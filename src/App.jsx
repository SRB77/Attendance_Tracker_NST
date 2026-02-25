import React, { useState, useEffect } from "react";
import axios from "axios";
import AttendanceDashboard from "./components/AttendanceDashboard";

function App() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get the access token from Newton School cookies
  const getAccessToken = async () => {
    const response = await chrome.runtime.sendMessage({
      action: "getCookies",
    });
    return response.cookies.find(
      (cookie) => cookie.name === "access_token_ns_student_web",
    ).value;
  };

  // Fetch attendance data for grouped courses
  const fetchAttendanceData = async (groupedCourses) => {
    const token = await getAccessToken();
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
          const { data } = await axios.get(
            `https://my.newtonschool.co/api/v2/course/h/${course.hash}/self_performance`,
            { headers: { Authorization: `Bearer ${token}` } },
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
          const { data } = await axios.get(
            `https://my.newtonschool.co/api/v2/course/h/${course.hash}/self_performance`,
            { headers: { Authorization: `Bearer ${token}` } },
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

      // Pick a unique random color
      let color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      while (usedColors.includes(color)) {
        color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      }
      usedColors.push(color);

      const totalAttended = mainAttended + labAttended;
      const totalClasses = mainTotal + labTotal;

      results.push({
        id: id,
        name: subjectName,
        total: totalClasses,
        attended: totalAttended,
        futureClasses: Math.abs(totalClasses - 53),
        color: color,
        mainAttended: mainAttended,
        mainTotal: mainTotal,
        labAttended: labAttended,
        labTotal: labTotal,
      });
      id++;
    }

    setAttendanceData(results);
    setIsLoading(false);
  };

  // Group courses by subject prefix (e.g., "CS101")
  const groupCourses = async (courses) => {
    // Filter to only Newton School of Technology courses
    courses = courses.filter((c) =>
      c.title.includes("Newton School of Technology"),
    );

    // Get unique subject prefixes
    const subjectPrefixes = [
      ...new Set(courses.map((c) => c.short_display_name.split(" ")[0])),
    ];

    const grouped = {};
    for (const idx in subjectPrefixes) {
      const prefix = subjectPrefixes[idx];

      // Main courses: not Lab, not Tut
      const main = courses.filter(
        (c) =>
          c.short_display_name.split(" ")[0] === prefix &&
          !c.short_display_name.includes("Lab") &&
          !c.short_display_name.includes("Tut"),
      );

      // Lab/Tut courses
      const lab = courses.filter(
        (c) =>
          (c.short_display_name.includes("Lab") ||
            c.short_display_name.includes("Tut")) &&
          c.short_display_name.includes(prefix),
      );

      grouped[prefix] = { main, lab };
    }

    console.log(grouped);
    fetchAttendanceData(grouped);
  };

  // Fetch all courses for a given course hash
  const fetchAllCourses = async (courseHash) => {
    const token = await getAccessToken();
    try {
      const { data } = await axios.get(
        `https://my.newtonschool.co/api/v2/course/h/${courseHash}/learning_course/all/?pagination=false`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      groupCourses(data);
    } catch (err) {
      alert(err);
    }
  };

  // Initialize: query the active tab and start fetching
  const initialize = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0 || !tabs[0].url) {
        alert("No active tab or tab URL is undefined.");
        return;
      }

      const activeTab = tabs[0];

      if (
        !activeTab.url ||
        !activeTab.url.startsWith("https://my.newtonschool.co/course/")
      ) {
        if (activeTab.url.startsWith("https://my.newtonschool.co/dashboard")) {
          alert("Please Select a NST course first, then Open Extension");
          return;
        } else {
          alert("Please Select a NST course first, then Open Extension");
          window.open("https://my.newtonschool.co/dashboard");
          return;
        }
      }

      // Extract course hash from URL
      const courseHash = activeTab.url.split("/")[4];

      chrome.scripting
        .executeScript({
          target: { tabId: activeTab.id },
          function: fetchAllCourses(courseHash),
        })
        .catch((err) => console.error("Execution error:", err));
    });
  };

  useEffect(() => {
    initialize();
  }, []);

  return (
    <AttendanceDashboard
      AttandanceData={attendanceData}
      isLoading={isLoading}
    />
  );
}

export default App;
