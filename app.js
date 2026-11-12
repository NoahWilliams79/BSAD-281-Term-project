(function () {
  "use strict";

  const STORAGE_KEY = "criticalFailCavern";
  const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
  let loadError = false;
  const state = loadState();
  const miniForm = document.getElementById("mini-form");
  const miniMessage = document.getElementById("mini-message");
  const miniSearch = document.getElementById("mini-search");
  const miniList = document.getElementById("mini-list");
  const miniEmpty = document.getElementById("mini-empty");
  const miniCount = document.getElementById("mini-count");
  const combatantForm = document.getElementById("combatant-form");
  const combatantMessage = document.getElementById("combatant-message");
  const turnMessage = document.getElementById("turn-message");
  const turnOrder = document.getElementById("turn-order");
  const orderEmpty = document.getElementById("order-empty");

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        minis: Array.isArray(saved.minis) ? saved.minis : [],
        combatants: Array.isArray(saved.combatants) ? saved.combatants : [],
        currentId: saved.currentId || null,
        started: Boolean(saved.started),
        round: Number.isInteger(saved.round) && saved.round > 0 ? saved.round : 1
      };
    } catch (error) {
      loadError = true;
      return { minis: [], combatants: [], currentId: null, started: false, round: 1 };
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      return false;
    }
  }

  function showView() {
    const requested = (window.location.hash || "#home").slice(1);
    const views = document.querySelectorAll("[data-view]");
    const current = Array.prototype.some.call(views, function (view) {
      return view.id === requested;
    }) ? requested : "home";

    views.forEach(function (view) {
      view.hidden = view.id !== current;
    });
    document.querySelectorAll("nav a").forEach(function (link) {
      if (link.getAttribute("href") === "#" + current) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
    window.scrollTo(0, 0);
  }

  function setMessage(element, message, isError) {
    element.textContent = message;
    element.classList.toggle("error-message", Boolean(isError));
  }

  function renderMinis() {
    const query = miniSearch.value.trim().toLowerCase();
    const matchingMinis = state.minis.filter(function (mini) {
      return (mini.name + " " + mini.type).toLowerCase().includes(query);
    });
    miniList.replaceChildren();
    miniCount.textContent = state.minis.length + (state.minis.length === 1 ? " mini" : " minis");
    miniEmpty.hidden = matchingMinis.length > 0;
    miniEmpty.textContent = state.minis.length === 0
      ? "Your vault is waiting for its first mini."
      : "No minis match that search.";

    matchingMinis.forEach(function (mini) {
      const card = document.createElement("article");
      card.className = "mini-card";
      if (mini.photo) {
        const image = document.createElement("img");
        image.className = "mini-photo";
        image.src = mini.photo;
        image.alt = "Photo of " + mini.name;
        card.appendChild(image);
      } else {
        const placeholder = document.createElement("div");
        placeholder.className = "mini-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
        placeholder.textContent = "♟";
        card.appendChild(placeholder);
      }

      const details = document.createElement("div");
      details.className = "mini-details";
      const name = document.createElement("h3");
      name.textContent = mini.name;
      const type = document.createElement("p");
      type.textContent = mini.type;
      const status = document.createElement("span");
      status.className = "paint-status" + (mini.painted ? " painted" : "");
      status.textContent = mini.painted ? "Painted" : "Unpainted";
      details.append(name, type, status);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button remove-mini";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + mini.name + " from your vault");
      remove.addEventListener("click", function () {
        const previousMinis = state.minis;
        state.minis = state.minis.filter(function (item) { return item.id !== mini.id; });
        if (saveState()) {
          setMessage(miniMessage, "Mini removed from your vault.", false);
          renderMinis();
        } else {
          state.minis = previousMinis;
          setMessage(miniMessage, "Could not save your change. Browser storage may be full or unavailable.", true);
        }
      });

      card.append(details, remove);
      miniList.appendChild(card);
    });
  }

  function currentCombatantIndex() {
    return state.combatants.findIndex(function (combatant) {
      return combatant.id === state.currentId;
    });
  }

  function renderInitiative() {
    let activeIndex = currentCombatantIndex();
    if (state.combatants.length && activeIndex === -1) {
      state.currentId = state.combatants[0].id;
      activeIndex = 0;
    }

    const active = activeIndex === -1 ? null : state.combatants[activeIndex];
    document.getElementById("round-label").textContent = "Round " + state.round;
    document.getElementById("current-name").textContent = active ? active.name : "No combatants yet";
    document.getElementById("current-initiative").textContent = active
      ? "Initiative " + active.initiative
      : "Add a combatant to begin.";
    document.getElementById("end-turn").disabled = !active;
    document.getElementById("combatant-count").textContent =
      state.combatants.length + (state.combatants.length === 1 ? " combatant" : " combatants");
    orderEmpty.hidden = state.combatants.length > 0;
    turnOrder.replaceChildren();

    state.combatants.forEach(function (combatant, index) {
      const item = document.createElement("li");
      item.className = "turn-item" + (combatant.id === state.currentId ? " is-current" : "");
      const position = document.createElement("span");
      position.className = "turn-number";
      position.textContent = String(index + 1).padStart(2, "0");
      const details = document.createElement("span");
      details.className = "turn-details";
      const name = document.createElement("strong");
      name.textContent = combatant.name;
      const label = document.createElement("span");
      label.textContent = combatant.id === state.currentId ? "Current turn" : "Combatant";
      details.append(name, label);
      const score = document.createElement("span");
      score.className = "initiative-score";
      score.textContent = String(combatant.initiative);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.textContent = "Remove";
      remove.setAttribute("aria-label", "Remove " + combatant.name + " from the encounter");
      remove.addEventListener("click", function () {
        const previousCombatants = state.combatants;
        const previousCurrentId = state.currentId;
        const previousRound = state.round;
        const previousStarted = state.started;
        const wasCurrent = combatant.id === state.currentId;
        state.combatants = state.combatants.filter(function (entry) { return entry.id !== combatant.id; });
        if (!state.combatants.length) {
          state.currentId = null;
          state.round = 1;
        } else if (wasCurrent) {
          state.currentId = state.combatants[Math.min(index, state.combatants.length - 1)].id;
        }
        if (!state.combatants.length) state.started = false;
        if (saveState()) {
          setMessage(turnMessage, combatant.name + " removed from the encounter.", false);
          renderInitiative();
        } else {
          state.combatants = previousCombatants;
          state.currentId = previousCurrentId;
          state.round = previousRound;
          state.started = previousStarted;
          setMessage(turnMessage, "Could not save your change. Browser storage may be full or unavailable.", true);
        }
      });
      item.append(position, details, score, remove);
      turnOrder.appendChild(item);
    });
  }

  function readPhoto(file) {
    return new Promise(function (resolve, reject) {
      if (!file) {
        resolve("");
        return;
      }
      if (!file.type.startsWith("image/")) {
        reject(new Error("Choose an image file for the mini photo."));
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        reject(new Error("That image is larger than 8 MB. Choose a smaller photo."));
        return;
      }

      const reader = new FileReader();
      reader.onload = function () {
        if (typeof reader.result === "string") {
          resolve(reader.result);
        } else {
          reject(new Error("The selected photo could not be read."));
        }
      };
      reader.onerror = function () {
        reject(new Error("The selected photo could not be read."));
      };
      reader.readAsDataURL(file);
    });
  }

  miniForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    setMessage(miniMessage, "", false);
    const name = document.getElementById("mini-name").value.trim();
    const type = document.getElementById("mini-type").value.trim();
    const photoFile = document.getElementById("mini-photo").files[0];
    try {
      const photo = await readPhoto(photoFile);
      state.minis.push({
        id: makeId(),
        name: name,
        type: type,
        painted: document.getElementById("mini-painted").checked,
        photo: photo
      });
      if (!saveState()) {
        state.minis.pop();
        setMessage(miniMessage, "Could not save this mini. Browser storage may be full; try a smaller photo or remove some minis.", true);
        return;
      }
      miniForm.reset();
      setMessage(miniMessage, "Mini added to your vault.", false);
      renderMinis();
    } catch (error) {
      setMessage(miniMessage, error.message, true);
    }
  });

  combatantForm.addEventListener("submit", function (event) {
    event.preventDefault();
    setMessage(combatantMessage, "", false);
    const name = document.getElementById("combatant-name").value.trim();
    const initiative = Number(document.getElementById("combatant-initiative").value);
    if (!name || !Number.isFinite(initiative)) {
      setMessage(combatantMessage, "Enter a name and a valid initiative score.", true);
      return;
    }

    const combatant = { id: makeId(), name: name, initiative: initiative };
    const previousCurrentId = state.currentId;
    state.combatants.push(combatant);
    state.combatants.sort(function (a, b) { return b.initiative - a.initiative; });
    if (!state.started) {
      state.currentId = state.combatants[0].id;
      state.round = 1;
    }
    if (!saveState()) {
      state.combatants = state.combatants.filter(function (entry) { return entry.id !== combatant.id; });
      state.currentId = previousCurrentId;
      setMessage(combatantMessage, "Could not save this combatant. Browser storage may be full or unavailable.", true);
      renderInitiative();
      return;
    }
    combatantForm.reset();
    setMessage(combatantMessage, "Combatant added to the turn order.", false);
    renderInitiative();
  });

  document.getElementById("end-turn").addEventListener("click", function () {
    const index = currentCombatantIndex();
    if (index === -1) return;
    const nextIndex = (index + 1) % state.combatants.length;
    const previousRound = state.round;
    const previousStarted = state.started;
    if (nextIndex === 0) state.round += 1;
    state.currentId = state.combatants[nextIndex].id;
    state.started = true;
    if (!saveState()) {
      state.currentId = state.combatants[index].id;
      state.started = previousStarted;
      state.round = previousRound;
      setMessage(turnMessage, "Could not save the turn change. Browser storage may be full or unavailable.", true);
      return;
    }
    setMessage(turnMessage, "", false);
    renderInitiative();
  });

  document.getElementById("reset-encounter").addEventListener("click", function () {
    if (!state.combatants.length) return;
    const previous = {
      combatants: state.combatants,
      currentId: state.currentId,
      started: state.started,
      round: state.round
    };
    state.combatants = [];
    state.currentId = null;
    state.started = false;
    state.round = 1;
    if (!saveState()) {
      state.combatants = previous.combatants;
      state.currentId = previous.currentId;
      state.started = previous.started;
      state.round = previous.round;
      setMessage(turnMessage, "Could not clear the encounter. Browser storage may be full or unavailable.", true);
    } else {
      setMessage(turnMessage, "Encounter cleared.", false);
    }
    renderInitiative();
  });

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  miniSearch.addEventListener("input", renderMinis);
  window.addEventListener("hashchange", showView);
  document.title = "Critical Fail Cavern";
  renderMinis();
  renderInitiative();
  if (loadError) {
    setMessage(miniMessage, "Saved data could not be read. The vault is shown empty; avoid adding data until you have checked browser storage.", true);
  }
  showView();
})();
