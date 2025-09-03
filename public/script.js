const quoteHeader = document.getElementById("quoteHeader");
async function quoteApi() {
  const res = await fetch("/quote");
  const data = await res.json();
  quoteHeader.innerHTML = "";
  quoteHeader.innerHTML = `${data[0].h}`;
}
quoteApi();

//add habit code
const addHabitBtn = document.querySelector(".addHabitBtn");
const modalCont = document.querySelector(".addHabitsModalCont");
const modalAddHabitBtn = document.getElementById("habitNameBtn");
addHabitBtn.addEventListener("click", () => {
  modalCont.style.display = "block";
});

const closeModal = document.querySelector(".xmarkImgCont");
closeModal.addEventListener("click", () => {
  modalCont.style.display = "none";
});

modalAddHabitBtn.addEventListener("click", () => {
  modalCont.style.display = "none";
});

document.querySelector(".sampleDel").addEventListener("click", () => {
  const row = document.querySelector(".habitSampleRow");
  if (row) {
    row.remove();
    localStorage.setItem("sampleHabitDeleted", "true");
  }
});

window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("sampleHabitDeleted") === "true") {
    const row = document.querySelector(".habitSampleRow");
    if (row) row.remove();
  }
});

//date text code
const date = new Date();
const weekdays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

document.querySelector(".dateText").innerHTML = `Today, ${
  weekdays[date.getDay()]
} ${date.getDate()} ${date.getFullYear()}`;

//char on load code
function checkChartsOnLoad(totalHabits) {
  if (habitNames.length === 0) {
    if (streakChart) {
      streakChart.destroy();
      streakChart = null;
    }
    document.querySelector("#streakChart").innerHTML = "<p>No data yet</p>";
  }

  if (totalHabits === 0) {
    // Handle pie chart
    if (window.habitChart) {
      window.habitChart.destroy();
      window.habitChart = null;
    }
    document.querySelector("#chart").innerHTML = "<p>No data yet</p>";
  }
}

//rendering habit rows function
let habits = [];
const lostStreaks = [];

function renderHabitRow(habit) {
  const habitRowCont = document.createElement("div");
  habitRowCont.classList.add("habitRow");
  habitRowCont.innerHTML = `
    <div class="habitName rowItem" id="habitName-${habit._id}">${
    habit.habitName
  }</div>
    <span class="rowItem checkbox"><input type="checkbox" id="checkBox-${
      habit._id
    }"/></span>
    <span class="habitStreak rowItem" id="streak-${habit._id}">🔥 ${
    habit.streak
  } day${habit.streak !== 1 ? "s" : ""}</span>
    <span class="habitEdit rowItem">✏️</span>
    <span class="habitDel rowItem" name="deleteHabit">🗑️</span>
  `;

  renderStreakChart(habit.habitName, habit.streak);

  const delBtn = habitRowCont.querySelector(".habitDel");

  delBtn.addEventListener("click", async () => {
    const deleted = await delHabit(habit._id);

    if (deleted) {
      habitRowsCont.removeChild(habitRowCont);

      const habitNameEl = habitRowCont.querySelector(".habitName");
      const habitName = habitNameEl ? habitNameEl.textContent : null;

      if (habitName) {
        const index = habitNames.indexOf(habitName);
        if (index !== -1) {
          habitNames.splice(index, 1);
          habitStreaks.splice(index, 1);
        }
      }
      if (habitNames.length === 0) {
        if (streakChart) {
          streakChart.destroy();
          streakChart = null;
          if (window.habitChart) {
            window.habitChart.destroy();
            window.habitChart = null;
          }
        }
        document.querySelector("#streakChart").innerHTML = "<p>No data yet</p>";
        document.querySelector("#chart").innerHTML = "<p>No data yet</p>";
      } else {
        streakChart.destroy();
        streakChart = null;
        window.habitChart = null;

        habitNames.forEach((name, i) => {
          renderStreakChart(name, habitStreaks[i]);
        });
      }
      updateCompletedCount();
    }
  });

  const habEdit = habitRowCont.querySelector(".habitEdit");
  habEdit.addEventListener("click", () => {
    habitUpdate(habit._id);
  });

  habitRowsCont.prepend(habitRowCont);

  const checkBox = document.getElementById(`checkBox-${habit._id}`);

  // reset after 24h
  const now = Date.now();
  const lastCompleted = new Date(habit.lastCompleted).getTime();
  const diffHours = (now - lastCompleted) / (1000 * 60 * 60);

  if (diffHours >= 24) {
    checkBox.checked = false;
    habit.isCompleted = false;
  }

  if (diffHours >= 48) {
    habit.streak = 0;
    renderStreakChart(habit.habitName, habit.streak);
    document.getElementById(`streak-${habit._id}`).innerHTML = `🔥 ${
      habit.streak
    } day${habit.streak !== 1 ? "s" : ""} `;
    lostStreaks.push(habit.habitName);
  }
  if (lostStreaks.length > 0) {
    document.querySelector(
      ".streakLostText"
    ).innerHTML = `Streak Lost: ${lostStreaks.join(", ")}`;
  } else {
    document.querySelector(".streakLostText").innerHTML = "";
  }

  if (habit.isCompleted) {
    checkBox.checked = true;
    updateCompletedCount();
  }
  checkBox.addEventListener("change", async () => {
    habit.isCompleted = checkBox.checked;
    updateCompletedCount();
    let last;

    if (checkBox.checked) {
      last = Date.now();
      habit.streak = (habit.streak || 0) + 1;
      renderStreakChart(habit.habitName, habit.streak);
    } else {
      habit.streak = Math.max(0, (habit.streak || 0) - 1);
      renderStreakChart(habit.habitName, habit.streak);
    }

    const res = await fetch(`/dashboard/isCompleted/${habit._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isCompleted: habit.isCompleted,
        lastCompleted: last,
        streak: habit.streak,
      }),
    });

    const updatedHabit = await res.json();
    document.getElementById(`streak-${habit._id}`).textContent =
      "🔥 " + updatedHabit.streak + " days";
    habit.streak = updatedHabit.streak;
  });
}

// fetching habitName post req
const token = localStorage.getItem("authToken");
const form = document.getElementById("addHabitsForm");
const habitRowsCont = document.querySelector(".habitsRows");
let streak = 0;
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const habitName = document.getElementById("habitName").value;

  const res = await fetch("/dashboard/addHabit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ habitName }),
  });

  const habit = await res.json();
  renderHabitRow(habit);
  updateCompletedCount();
  renderStreakChart(habit.habitName, habit.streak);
  form.reset();
});

const parseJwt = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id;
  } catch (e) {
    return null;
  }
};

// displaying habits code
async function displayHabits() {
  const userId = parseJwt(token);

  try {
    const res = await fetch(`/dashboard/displayHabits/${userId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    habits = await res.json();
    let totalHabits = habits.length;
    checkChartsOnLoad(totalHabits);
    habits.forEach((habit) => {
      renderHabitRow(habit);
    });
    updateCompletedCount();
  } catch (err) {
    console.error("Error fetching habits:", err);
  }
}
displayHabits();

function updateCompletedCount() {
  const habitRows = document.querySelectorAll(".habitRow");
  if (!habitRows || habitRows.length === 0) {
    console.warn("⚠️ No habit rows found in the DOM.");
    const display = document.querySelector(".habitsCompleted");
    if (display) display.innerText = "No habits available";
    return;
  }

  const completedCount = document.querySelectorAll(
    '.habitRow input[type="checkbox"]:checked'
  ).length;

  const totalCount = document.querySelectorAll(
    '.habitRow input[type="checkbox"]'
  ).length;
  renderHabitChart(completedCount, totalCount);

  const display = document.querySelector(".habitsCompleted");
  if (display) {
    display.innerText = `Completed: ${completedCount} out of ${totalCount} habits`;
  } else {
    console.warn("⚠️ .completedCount element not found in the DOM.");
  }
}

//habitDelete Code
async function delHabit(habitId) {
  const ans = confirm("Are you sure you want to delete this habit?");
  if (!ans) return false; // Cancelled, so tell caller not to remove row

  try {
    const res = await fetch(`/dashboard/delete/${habitId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      return true; // Deletion success
    } else {
      console.error("❌ Failed to delete habit:", res.status);
      return false;
    }
  } catch (err) {
    console.error("🔥 Error deleting habit:", err);
    return false;
  }
}

//habitUpdate Code
async function habitUpdate(habitId) {
  const habitName = habitRowsCont.querySelector(`#habitName-${habitId}`);
  const oldName = habitName.textContent;

  habitName.innerHTML = `<input type="text" name="habitName" class="habitNameInp" id="editInput-${habitId}" value="${oldName}">`;

  const input = document.querySelector(`#editInput-${habitId}`);
  input.focus();

  input.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      await saveUpdate();
    }
  });

  input.addEventListener("blur", async () => {
    await saveUpdate();
  });

  async function saveUpdate() {
    const res = await fetch(`/dashboard/updateName/${habitId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ habitName: input.value }),
    });

    const updatedHabit = await res.json();
    habitName.innerHTML = updatedHabit.habitName;
    const index = habitNames.indexOf(oldName);
    if (index !== -1) {
      habitNames[index] = updatedHabit.habitName;
    }

    // ✅ Refresh chart
    if (streakChart) {
      streakChart.updateOptions({
        xaxis: { categories: habitNames },
      });
      streakChart.updateSeries([{ name: "Streak", data: habitStreaks }]);
    }
  }
}

// Common chart size settings
const chartConfig = {
  default: { height: 400, width: 600 },
  responsive: {
    breakpoint: 1200,
    height: 300,
    width: 300,
    legendPosition: "bottom",
  },
};

//pie chart integration code
function renderHabitChart(completedCount, totalHabits) {
  const notCompleted = totalHabits - completedCount;

  document.querySelector("#chart").innerHTML = "";
  if (window.habitChart) {
    window.habitChart.updateSeries([completedCount, notCompleted]);
  } else {
    var options = {
      series: [completedCount, notCompleted],
      chart: {
        type: "pie",
        height: chartConfig.default.height,
        width: chartConfig.default.width,
      },
      labels: ["Completed", "Not Completed"],
      colors: ["#28a745", "#dc3545"],
      responsive: [
        {
          breakpoint: chartConfig.responsive.breakpoint,
          options: {
            chart: {
              height: chartConfig.responsive.height,
              width: chartConfig.responsive.width,
            },
            legend: {
              position: chartConfig.responsive.legendPosition,
            },
          },
        },
      ],
    };

    window.habitChart = new ApexCharts(
      document.querySelector("#chart"),
      options
    );
    window.habitChart.render();
  }
}

let streakChart = null;
let habitStreaks = [];
let habitNames = [];

// Bar Chart integration code
function renderStreakChart(habitName, habitStreak) {
  const existingIndex = habitNames.indexOf(habitName);

  if (existingIndex !== -1) {
    habitStreaks[existingIndex] = habitStreak;
  } else {
    habitNames.push(habitName);
    habitStreaks.push(habitStreak);
  }
  document.querySelector("#streakChart").innerHTML = "";

  if (!streakChart) {
    let options = {
      chart: {
        type: "bar",
        height: chartConfig.default.height,
        width: chartConfig.default.width,
      },
      series: [{ name: "Streak", data: habitStreaks }],
      xaxis: { categories: habitNames },
      tooltip: {
        y: {
          formatter: function (val) {
            return "Streak: " + val;
          },
        },
      },
      responsive: [
        {
          breakpoint: chartConfig.responsive.breakpoint,
          options: {
            chart: {
              height: chartConfig.responsive.height,
              width: chartConfig.responsive.width,
            },
            legend: {
              position: chartConfig.responsive.legendPosition,
            },
          },
        },
      ],
    };

    streakChart = new ApexCharts(
      document.querySelector("#streakChart"),
      options
    );
    streakChart.render();
  } else {
    streakChart.updateOptions({
      xaxis: { categories: habitNames },
    });
    streakChart.updateSeries([{ name: "Streak", data: habitStreaks }]);
  }
}
