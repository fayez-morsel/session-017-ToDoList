let state = {
  todos: [],
  filters: {
    text: "",
    status: "all",
    category: "all",
  },
  sort: {
    by: "dueDate",
    direction: "asc",
  },
  editingId: null,
  currentTodo: {},
  showHistory: null,
  currentHistoryIndex: {},
  nextId: 1,
};

const CATEGORIES = [
  "shopping",
  "school",
  "house work",
  "personal",
  "work",
  "health",
  "other",
];

function loadFromStorage() {
  const saved = localStorage.getItem("todoAppState");
  if (saved) {
    const parsed = JSON.parse(saved);
    state = { ...state, ...parsed };
    if (state.todos.length > 0) {
      state.nextId = Math.max(...state.todos.map((t) => t.id)) + 1;
    } else {
      state.nextId = 1; // If no todos, reset nextId to 1
    }
  }
}

function saveToStorage() {
  localStorage.setItem("todoAppState", JSON.stringify(state));
}

function addTodo(title, description, category, dueDate) {
  if (!title.trim()) return;

  const newTodo = {
    id: state.nextId++,
    title: title.trim(),
    description: description.trim(),
    category,
    dueDate,
    status: "incomplete",
    createdAt: new Date().toISOString(),
    history: [
      {
        timestamp: new Date().toISOString(),
        action: "created",
        data: {
          title: title.trim(),
          description: description.trim(),
          category,
          dueDate,
          status: "incomplete",
        },
      },
    ],
  };

  state.todos = [...state.todos, newTodo];
  state.currentTodo = {};
  saveToStorage();
  rerenderUI();
}

function updateTodo(id, updates) {
  state.todos = state.todos.map((todo) => {
    if (todo.id === id) {
      const updatedTodo = { ...todo, ...updates };

      const historyEntry = {
        timestamp: new Date().toISOString(),
        action: "updated",
        data: { ...updatedTodo },
      };
      updatedTodo.history = [...(todo.history || []), historyEntry];

      return updatedTodo;
    }
    return todo;
  });

  state.editingId = null;
  state.currentTodo = {};
  saveToStorage();
  rerenderUI();
}

function deleteTodo(id) {
  if (confirm("Are you sure you want to delete this todo?")) {
    state.todos = state.todos.filter((todo) => todo.id !== id);
    state.showHistory = null; // Ensure history view is closed after deletion
    saveToStorage();
    rerenderUI();
  }
}

function toggleTodoStatus(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo) return;

  const newStatus = todo.status === "complete" ? "incomplete" : "complete";
  if (newStatus === "complete") {
    playCompletionSound();
    showCompletionAnimation(id);
  }

  updateTodo(id, { status: newStatus });
}

function setFilter(filterType, value) {
  state.filters = { ...state.filters, [filterType]: value };
  rerenderUI();
}

function setSort(sortBy) {
  if (state.sort.by === sortBy) {
    state.sort.direction = state.sort.direction === "asc" ? "desc" : "asc";
  } else {
    state.sort = { by: sortBy, direction: "asc" };
  }
  rerenderUI();
}

function startEditing(id) {
  state.editingId = id;
  const todo = state.todos.find((t) => t.id === id);
  state.currentTodo = { ...todo };
  rerenderUI();
}

function cancelEditing() {
  state.editingId = null;
  state.currentTodo = {};
  rerenderUI();
}

function showHistory(id) {
  state.showHistory = id;
  const todo = state.todos.find((t) => t.id === id);
  if (todo && todo.history) {
    state.currentHistoryIndex[id] = todo.history.length - 1;
  }
  rerenderUI();
}

function navigateHistory(id, direction) {
  const todo = state.todos.find((t) => t.id === id);
  if (!todo || !todo.history) return;

  const currentIndex = state.currentHistoryIndex[id] || 0;
  let newIndex = currentIndex + direction;

  if (newIndex < 0) newIndex = 0;
  if (newIndex >= todo.history.length) newIndex = todo.history.length - 1;

  state.currentHistoryIndex[id] = newIndex;
  rerenderUI();
}

function closeHistory() {
  state.showHistory = null;
  rerenderUI();
}

function playCompletionSound() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2);

  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.3
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
}

function showCompletionAnimation(id) {
  setTimeout(() => {
    const todoElement = document.querySelector(`[data-todo-id="${id}"]`);
    if (todoElement) {
      const animation = document.createElement("div");
      animation.className = "completion-animation";
      todoElement.appendChild(animation);

      setTimeout(() => {
        if (animation.parentNode) {
          animation.parentNode.removeChild(animation);
        }
      }, 600);
    }
  }, 100);
}

function getFilteredTodos() {
  let filtered = [...state.todos];

  if (state.filters.text) {
    const searchText = state.filters.text.toLowerCase();
    filtered = filtered.filter(
      (todo) =>
        todo.title.toLowerCase().includes(searchText) ||
        todo.description.toLowerCase().includes(searchText)
    );
  }

  if (state.filters.status !== "all") {
    filtered = filtered.filter((todo) => todo.status === state.filters.status);
  }

  if (state.filters.category !== "all") {
    filtered = filtered.filter(
      (todo) => todo.category === state.filters.category
    );
  }

  filtered.sort((a, b) => {
    let aVal, bVal;

    if (state.sort.by === "dueDate") {
      aVal = new Date(a.dueDate);
      bVal = new Date(b.dueDate);
    } else if (state.sort.by === "title") {
      aVal = a.title.toLowerCase();
      bVal = b.title.toLowerCase();
    }

    if (aVal < bVal) return state.sort.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return state.sort.direction === "asc" ? 1 : -1;
    return 0;
  });

  return filtered;
}

function isOverdue(dueDate) {
  return new Date(dueDate) < new Date();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function rerenderUI() {
  const app = document.getElementById("app");
  const filteredTodos = getFilteredTodos();
  const completedCount = state.todos.filter(
    (t) => t.status === "complete"
  ).length;
  const totalCount = state.todos.length;
  app.innerHTML = `
    <div class="container">
      <div class="header">
        <h1>To Do Manager</h1>
        <p>Add Your Task And Don't Forget It.</p>
      </div>

      <div class="main-content">
        <div class="controls">
          <div class="form-section">
            <h3>
              Add New Todo
            </h3>
            <form onsubmit="handleAddTodo(event)">
              <div class="form-group">
                <label for="title">Title *</label>
                <input type="text" id="title" name="title" required placeholder="Enter todo title..." />
              </div>
              <div class="form-group">
                <label for="category">Category</label>
                <select id="category" name="category">
                  ${CATEGORIES.map(
                    (cat) =>
                      `<option value="${cat}">${
                        cat.charAt(0).toUpperCase() + cat.slice(1)
                      }</option>`
                  ).join("")}
                </select>
              </div>
              <div class="form-group">
                <label for="dueDate">Due Date</label>
                <input type="date" id="dueDate" name="dueDate" />
              </div>
              <div class="form-group">
                <label for="description">Description</label>
                <textarea id="description" name="description" placeholder="Enter todo description..."></textarea>
              </div>
              <button type="submit" class="btn btn-primary">Add Todo</button>
            </form>
          </div>

          <div class="filter-section">
            <h3>Filter & Sort</h3>
            <div class="filter-controls">
              <div class="form-group">
                <label for="filterText">Search</label>
                <input type="text" id="filterText" value="${
                  state.filters.text
                }" onchange="setFilter('text', this.value)" placeholder="Search todos..." />
              </div>
              <div class="form-group">
                <label for="filterStatus">Status</label>
                <select id="filterStatus" onchange="setFilter('status', this.value)">
                  <option value="all" ${
                    state.filters.status === "all" ? "selected" : ""
                  }>All</option>
                  <option value="incomplete" ${
                    state.filters.status === "incomplete" ? "selected" : ""
                  }>Incomplete</option>
                  <option value="complete" ${
                    state.filters.status === "complete" ? "selected" : ""
                  }>Complete</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="filterCategory">Category</label>
              <select id="filterCategory" onchange="setFilter('category', this.value)">
                <option value="all" ${
                  state.filters.category === "all" ? "selected" : ""
                }>All Categories</option>
                ${CATEGORIES.map(
                  (cat) =>
                    `<option value="${cat}" ${
                      state.filters.category === cat ? "selected" : ""
                    }>${cat.charAt(0).toUpperCase() + cat.slice(1)}</option>`
                ).join("")}
              </select>
            </div>
            <div class="sort-controls">
              <button class="btn ${
                state.sort.by === "dueDate" ? "btn-primary" : "btn-secondary"
              }" onclick="setSort('dueDate')">Due Date ${
    state.sort.by === "dueDate"
      ? state.sort.direction === "asc"
        ? "↑"
        : "↓"
      : ""
  }</button>
              <button class="btn ${
                state.sort.by === "title" ? "btn-primary" : "btn-secondary"
              }" onclick="setSort('title')">Title ${
    state.sort.by === "title"
      ? state.sort.direction === "asc"
        ? "↑"
        : "↓"
      : ""
  }</button>
            </div>
          </div>
        </div>

        <div class="todos-section">
          <div class="todos-header">
            <h3>Your Todos</h3>
            <div class="todos-stats">${completedCount}/${totalCount} completed • ${
    filteredTodos.length
  } shown</div>
          </div>

          <div class="todo-list">
            ${
              filteredTodos.length === 0
                ? `<div class="no-todos"><h4>No todos found</h4><p>Create your first todo or adjust your filters</p></div>`
                : filteredTodos
                    .map(
                      (todo) => `
              <div class="todo-item ${todo.status}" data-todo-id="${todo.id}">
                <div class="todo-header">
                  <div>
                    <div class="todo-title">${todo.title}</div>
                    <span class="todo-category">${todo.category}</span>
                  </div>
                  <label class="status-toggle">
                    <input type="checkbox" ${
                      todo.status === "complete" ? "checked" : ""
                    } onchange="toggleTodoStatus(${todo.id})" />
                    <span class="slider"></span>
                  </label>
                </div>

                ${
                  todo.dueDate
                    ? `<div class="todo-due-date ${
                        isOverdue(todo.dueDate) && todo.status === "incomplete"
                          ? "overdue"
                          : ""
                      }">Due: ${formatDate(todo.dueDate)} ${
                        isOverdue(todo.dueDate) && todo.status === "incomplete"
                          ? "(OVERDUE)"
                          : ""
                      }</div>`
                    : ""
                }

                ${
                  todo.description
                    ? `<div class="todo-description">${todo.description}</div>`
                    : ""
                }

                <div class="todo-actions">
                  <button class="btn btn-secondary" onclick="startEditing(${
                    todo.id
                  })">Edit</button>
                  <button class="btn btn-secondary" onclick="showHistory(${
                    todo.id
                  })">History</button>
                  <button class="btn btn-danger" onclick="deleteTodo(${
                    todo.id
                  })">Delete</button>
                </div>

                ${
                  state.editingId === todo.id
                    ? `<div class="edit-form">
                        <h4>Edit Todo</h4>
                        <form onsubmit="handleUpdateTodo(event, ${todo.id})">
                          <div class="form-group">
                            <label>Title</label>
                            <input type="text" name="title" value="${
                              state.currentTodo.title || ""
                            }" required />
                          </div>
                          <div class="form-group">
                            <label>Category</label>
                            <select name="category">
                              ${CATEGORIES.map(
                                (cat) =>
                                  `<option value="${cat}" ${
                                    (state.currentTodo.category ||
                                      todo.category) === cat
                                      ? "selected"
                                      : ""
                                  }>${
                                    cat.charAt(0).toUpperCase() + cat.slice(1)
                                  }</option>`
                              ).join("")}
                            </select>
                          </div>
                          <div class="form-group">
                            <label>Due Date</label>
                            <input type="date" name="dueDate" value="${
                              state.currentTodo.dueDate || ""
                            }" />
                          </div>
                          <div class="form-group">
                            <label>Description</label>
                            <textarea name="description">${
                              state.currentTodo.description || ""
                            }</textarea>
                          </div>
                          <button type="submit" class="btn btn-primary">Update</button>
                          <button type="button" class="btn btn-secondary" onclick="cancelEditing()">Cancel</button>
                        </form>
                      </div>`
                    : ""
                }
              </div>`
                    )
                    .join("")
            }
          </div>
        </div>
      </div>
    </div>
  `;
}

function handleAddTodo(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  addTodo(
    formData.get("title"),
    formData.get("description"),
    formData.get("category"),
    formData.get("dueDate")
  );
  event.target.reset();
}

function handleUpdateTodo(event, id) {
  event.preventDefault();
  const formData = new FormData(event.target);
  updateTodo(id, {
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    dueDate: formData.get("dueDate"),
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadFromStorage();
  rerenderUI();
  setInterval(saveToStorage, 30000);
});
