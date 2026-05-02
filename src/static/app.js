document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const teacherStatus = document.getElementById("teacher-status");

  const userMenuBtn = document.getElementById("user-menu-btn");
  const userMenuDropdown = document.getElementById("user-menu-dropdown");
  const openLoginModalBtn = document.getElementById("open-login-modal");
  const logoutBtn = document.getElementById("logout-btn");

  const loginModal = document.getElementById("login-modal");
  const closeLoginModalBtn = document.getElementById("close-login-modal");
  const loginForm = document.getElementById("login-form");
  const usernameInput = document.getElementById("teacher-username");
  const passwordInput = document.getElementById("teacher-password");

  let teacher = null;

  function showMessage(text, kind) {
    messageDiv.textContent = text;
    messageDiv.className = kind;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateTeacherUI() {
    const loggedIn = Boolean(teacher);
    signupForm.classList.toggle("hidden", !loggedIn);
    openLoginModalBtn.classList.toggle("hidden", loggedIn);
    logoutBtn.classList.toggle("hidden", !loggedIn);

    if (loggedIn) {
      teacherStatus.textContent = `Logged in as ${teacher}. You can register and unregister students.`;
    } else {
      teacherStatus.textContent = "Students can view activities. Teachers must log in to register or unregister students.";
    }
  }

  async function fetchAdminStatus() {
    try {
      const response = await fetch("/admin/status", { credentials: "include" });
      const data = await response.json();
      teacher = data.logged_in ? data.username : null;
    } catch (error) {
      teacher = null;
      console.error("Error fetching admin status:", error);
    }
    updateTeacherUI();
  }

  function openLoginModal() {
    loginModal.classList.remove("hidden");
    usernameInput.focus();
  }

  function closeLoginModal() {
    loginModal.classList.add("hidden");
    loginForm.reset();
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        teacher
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    if (!teacher) {
      showMessage("Teacher login required.", "error");
      return;
    }

    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!teacher) {
      showMessage("Teacher login required.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          credentials: "include",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: usernameInput.value,
          password: passwordInput.value,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        showMessage(result.detail || "Login failed.", "error");
        return;
      }

      showMessage(result.message, "success");
      closeLoginModal();
      await fetchAdminStatus();
      await fetchActivities();
    } catch (error) {
      showMessage("Login failed. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("/admin/logout", {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json();
      showMessage(result.message || "Logged out", "success");
    } catch (error) {
      showMessage("Logout failed. Please try again.", "error");
      console.error("Error logging out:", error);
    }

    teacher = null;
    updateTeacherUI();
    fetchActivities();
    userMenuDropdown.classList.add("hidden");
  });

  userMenuBtn.addEventListener("click", () => {
    userMenuDropdown.classList.toggle("hidden");
  });

  openLoginModalBtn.addEventListener("click", () => {
    userMenuDropdown.classList.add("hidden");
    openLoginModal();
  });

  closeLoginModalBtn.addEventListener("click", closeLoginModal);

  window.addEventListener("click", (event) => {
    if (!userMenuBtn.contains(event.target) && !userMenuDropdown.contains(event.target)) {
      userMenuDropdown.classList.add("hidden");
    }

    if (event.target === loginModal) {
      closeLoginModal();
    }
  });

  // Initialize app
  fetchAdminStatus().then(fetchActivities);
});
