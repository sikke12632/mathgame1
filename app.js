(function () {
  "use strict";

  const core = window.ShapeTerritoryCore;
  const $ = (id) => document.getElementById(id);

  const els = {
    setupScreen: $("setupScreen"),
    setupForm: $("setupForm"),
    setupError: $("setupError"),
    shapeChoices: $("shapeChoices"),
    autoFillInput: $("autoFillInput"),
    createOnlineBtn: $("createOnlineBtn"),
    roomCodeInput: $("roomCodeInput"),
    joinOnlineBtn: $("joinOnlineBtn"),
    onlineSetupStatus: $("onlineSetupStatus"),
    onlineGameStatus: $("onlineGameStatus"),
    gameScreen: $("gameScreen"),
    resultScreen: $("resultScreen"),
    board: $("board"),
    boardHint: $("boardHint"),
    currentPlayerBadge: $("currentPlayerBadge"),
    turnText: $("turnText"),
    phaseText: $("phaseText"),
    skipNotice: $("skipNotice"),
    problemPanel: $("problemPanel"),
    problemType: $("problemType"),
    timerText: $("timerText"),
    shapeName: $("shapeName"),
    diagramBox: $("diagramBox"),
    problemPrompt: $("problemPrompt"),
    formulaText: $("formulaText"),
    answerForm: $("answerForm"),
    answerInput: $("answerInput"),
    paintPanel: $("paintPanel"),
    earnedCells: $("earnedCells"),
    usedCells: $("usedCells"),
    paintedCells: $("paintedCells"),
    neutralizedCells: $("neutralizedCells"),
    remainingEnergy: $("remainingEnergy"),
    undoSelectionBtn: $("undoSelectionBtn"),
    autoFillBtn: $("autoFillBtn"),
    confirmPaintBtn: $("confirmPaintBtn"),
    skipPaintBtn: $("skipPaintBtn"),
    feedbackPanel: $("feedbackPanel"),
    feedbackTitle: $("feedbackTitle"),
    feedbackMessage: $("feedbackMessage"),
    continueBtn: $("continueBtn"),
    newGameBtn: $("newGameBtn"),
    backSetupBtn: $("backSetupBtn"),
    resultRestartBtn: $("resultRestartBtn"),
    resultSetupBtn: $("resultSetupBtn"),
    winnerTitle: $("winnerTitle"),
    p1Cells: $("p1Cells"),
    p1Final: $("p1Final"),
    p2Cells: $("p2Cells"),
    p2Final: $("p2Final"),
    resultP1Cells: $("resultP1Cells"),
    resultP1Final: $("resultP1Final"),
    resultP2Cells: $("resultP2Cells"),
    resultP2Final: $("resultP2Final"),
  };

  let state = null;
  let lastSettings = core.defaultSettings();
  let timerId = null;
  let timerProblemId = null;
  let remainingSeconds = 0;
  let lastRenderedProblemId = null;
  let dragState = null;
  let selectionHistory = [];
  let online = createOfflineSession();

  const ANIMAL_NAMES = [
    "다람쥐",
    "사자",
    "호랑이",
    "너구리",
    "토끼",
    "고래",
    "판다",
    "여우",
    "코알라",
    "수달",
    "기린",
    "펭귄",
    "돌고래",
    "부엉이",
    "햄스터",
    "표범",
  ];

  function createOfflineSession() {
    return {
      active: false,
      db: null,
      roomRef: null,
      roomCode: "",
      role: "",
      nickname: "",
      room: null,
      syncing: false,
      configured: false,
      configError: "",
    };
  }

  function init() {
    buildShapeChoices();
    buildBoardCells();
    initFirebase();
    bindEvents();
    render();
  }

  function buildShapeChoices() {
    els.shapeChoices.innerHTML = "";
    Object.entries(core.SHAPES).forEach(([value, label]) => {
      const wrapper = document.createElement("label");
      const input = document.createElement("input");
      const text = document.createElement("span");
      input.type = "checkbox";
      input.name = "shape";
      input.value = value;
      input.checked = true;
      text.textContent = label;
      wrapper.append(input, text);
      els.shapeChoices.append(wrapper);
    });
  }

  function buildBoardCells() {
    els.board.innerHTML = "";
    for (let index = 0; index < core.BOARD_SIZE * core.BOARD_SIZE; index += 1) {
      const cell = document.createElement("button");
      const { row, col } = core.coordsOf(index);
      cell.type = "button";
      cell.className = "cell empty";
      cell.dataset.index = String(index);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", `${row + 1}행 ${col + 1}열`);
      els.board.append(cell);
    }
  }

  function initFirebase() {
    const config = window.SHAPE_TERRITORY_FIREBASE_CONFIG;
    const missingSdk = !window.firebase || !window.firebase.initializeApp || !window.firebase.database;
    const missingConfig =
      !config ||
      !config.apiKey ||
      !config.databaseURL ||
      String(config.apiKey).includes("YOUR_") ||
      String(config.databaseURL).includes("YOUR_");

    if (missingSdk) {
      online.configError = "Firebase SDK를 불러오지 못했습니다. 인터넷 연결과 GitHub Pages 배포 상태를 확인해 주세요.";
    } else if (missingConfig) {
      online.configError = "firebase-config.js에 Firebase 설정값을 넣으면 온라인 방을 사용할 수 있습니다.";
    } else {
      try {
        if (!window.firebase.apps.length) {
          window.firebase.initializeApp(config);
        }
        online.db = window.firebase.database();
        online.configured = true;
      } catch (error) {
        online.configError = "Firebase 초기화에 실패했습니다. 설정값과 databaseURL을 확인해 주세요.";
      }
    }

    renderOnlineSetupStatus();
  }

  function renderOnlineSetupStatus(message, isError) {
    if (!els.onlineSetupStatus) return;
    const text = message || online.configError || "Firebase 설정 후 온라인 방 만들기와 방 코드 입장을 사용할 수 있습니다.";
    els.onlineSetupStatus.textContent = text;
    els.onlineSetupStatus.classList.toggle("error", Boolean(isError || online.configError));
    if (els.createOnlineBtn) {
      els.createOnlineBtn.disabled = !online.configured;
    }
    if (els.joinOnlineBtn) {
      els.joinOnlineBtn.disabled = !online.configured;
    }
  }

  function bindEvents() {
    els.setupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const settings = collectSettings();
      if (!settings) return;
      leaveOnlineRoom();
      lastSettings = settings;
      state = core.createGameState(settings);
      lastRenderedProblemId = null;
      selectionHistory = [];
      render();
      window.setTimeout(() => els.answerInput.focus(), 0);
    });

    els.createOnlineBtn.addEventListener("click", async () => {
      const settings = collectSettings();
      if (!settings) return;
      await createOnlineRoom(settings);
    });

    els.joinOnlineBtn.addEventListener("click", async () => {
      const code = normalizeRoomCode(els.roomCodeInput.value);
      await joinOnlineRoom(code);
    });

    els.roomCodeInput.addEventListener("input", () => {
      els.roomCodeInput.value = normalizeRoomCode(els.roomCodeInput.value);
    });

    els.answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!state || state.phase !== "question" || !canAct()) return;
      const nextState = core.submitAnswer(state, els.answerInput.value);
      if (nextState.phase === "painting") {
        selectionHistory = [];
      }
      commitState(nextState);
      if (nextState.phase === "painting") {
        els.board.focus();
      }
    });

    els.continueBtn.addEventListener("click", () => {
      if (!state || !canAct()) return;
      const nextState = core.nextTurn(state);
      selectionHistory = [];
      commitState(nextState);
      if (nextState.phase === "question") {
        window.setTimeout(() => els.answerInput.focus(), 0);
      }
    });

    els.undoSelectionBtn.addEventListener("click", () => {
      if (!state || state.phase !== "painting" || selectionHistory.length === 0 || !canAct()) return;
      const previousSelection = selectionHistory.pop();
      state = core.selectCells(state, previousSelection);
      renderBoard();
      renderPaintPanel();
    });

    els.autoFillBtn.addEventListener("click", () => {
      if (!canAct()) return;
      const selection = core.autoFillSelection(state);
      applySelection(mergeSelections(state.selection, selection));
    });

    els.confirmPaintBtn.addEventListener("click", () => {
      if (!canAct()) return;
      confirmPaintingWithRemainingCheck(state);
    });

    els.skipPaintBtn.addEventListener("click", () => {
      if (!canAct()) return;
      confirmPaintingWithRemainingCheck(core.clearSelection(state));
    });

    els.newGameBtn.addEventListener("click", () => {
      if (isOnline() && online.role !== "player1") {
        renderOnlineSetupStatus("새 온라인 게임은 방을 만든 학생만 시작할 수 있습니다.", true);
        return;
      }
      const nextState = core.createGameState(state ? state.settings : lastSettings);
      lastRenderedProblemId = null;
      selectionHistory = [];
      commitState(nextState, { status: isOnline() ? "playing" : undefined });
    });

    els.backSetupBtn.addEventListener("click", () => {
      leaveOnlineRoom();
      state = null;
      stopTimer();
      render();
    });

    els.resultRestartBtn.addEventListener("click", () => {
      if (isOnline() && online.role !== "player1") {
        return;
      }
      const nextState = core.createGameState(lastSettings);
      lastRenderedProblemId = null;
      selectionHistory = [];
      commitState(nextState, { status: isOnline() ? "playing" : undefined });
    });

    els.resultSetupBtn.addEventListener("click", () => {
      leaveOnlineRoom();
      state = null;
      stopTimer();
      render();
    });

    els.board.addEventListener("pointerdown", onBoardPointerDown);
    els.board.addEventListener("pointermove", onBoardPointerMove);
    els.board.addEventListener("pointerup", onBoardPointerUp);
    els.board.addEventListener("pointercancel", onBoardPointerCancel);
  }

  function collectSettings() {
    const formData = new FormData(els.setupForm);
    const shapes = formData.getAll("shape");
    if (shapes.length === 0) {
      els.setupError.textContent = "등장 도형을 1개 이상 선택해 주세요.";
      return null;
    }
    els.setupError.textContent = "";
    return core.normalizeSettings({
      scope: formData.get("scope"),
      shapes,
      difficulty: formData.get("difficulty"),
      autoFill: els.autoFillInput.checked,
    });
  }

  function normalizeRoomCode(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  }

  function randomRoomCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  function randomAnimalName(usedNames) {
    const used = new Set(usedNames || []);
    const available = ANIMAL_NAMES.filter((name) => !used.has(name));
    const pool = available.length ? available : ANIMAL_NAMES;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function isOnline() {
    return online.active && online.roomRef;
  }

  function canAct() {
    if (!state) return false;
    if (!isOnline()) return true;
    const hasOpponent = Boolean(online.room && online.room.players && online.room.players.player2);
    if (!hasOpponent && state.phase !== "gameover") return false;
    return state.currentPlayer === online.role;
  }

  function reviveRemoteState(remoteState) {
    if (!remoteState) return null;
    return Object.assign({}, remoteState, {
      board: listFromFirebase(remoteState.board),
      problemHistory: listFromFirebase(remoteState.problemHistory),
      selection: listFromFirebase(remoteState.selection),
      skippedTurns: listFromFirebase(remoteState.skippedTurns),
      turnCounts: Object.assign({ player1: 0, player2: 0 }, remoteState.turnCounts || {}),
    });
  }

  function listFromFirebase(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") {
      return Object.keys(value)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => value[key]);
    }
    return [];
  }

  async function createOnlineRoom(settings) {
    if (!online.configured) {
      renderOnlineSetupStatus(null, true);
      return;
    }
    renderOnlineSetupStatus("온라인 방을 만드는 중입니다...");
    leaveOnlineRoom();

    const nickname = randomAnimalName();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = randomRoomCode();
      const roomRef = online.db.ref(`shapeTerritoryRooms/${code}`);
      const existing = await roomRef.once("value");
      if (existing.exists()) continue;

      const nextState = core.createGameState(settings);
      await roomRef.set({
        roomCode: code,
        status: "waiting",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        players: {
          player1: {
            nickname,
            joinedAt: Date.now(),
          },
        },
        settings,
        state: nextState,
      });
      enterOnlineRoom(roomRef, code, "player1", nickname);
      renderOnlineSetupStatus(`방 코드 ${code}로 만들었습니다. 내 닉네임은 ${nickname}입니다.`);
      return;
    }
    renderOnlineSetupStatus("방 코드를 만들지 못했습니다. 다시 시도해 주세요.", true);
  }

  async function joinOnlineRoom(code) {
    if (!online.configured) {
      renderOnlineSetupStatus(null, true);
      return;
    }
    if (!code || code.length < 4) {
      renderOnlineSetupStatus("방 코드를 입력해 주세요.", true);
      return;
    }
    renderOnlineSetupStatus("방에 입장하는 중입니다...");
    leaveOnlineRoom();

    const roomRef = online.db.ref(`shapeTerritoryRooms/${code}`);
    const snapshot = await roomRef.once("value");
    const room = snapshot.val();
    if (!room) {
      renderOnlineSetupStatus("해당 방을 찾을 수 없습니다.", true);
      return;
    }
    if (room.players && room.players.player2) {
      renderOnlineSetupStatus("이미 두 명이 들어간 방입니다. 새 방을 만들어 주세요.", true);
      return;
    }

    const nickname = randomAnimalName([room.players && room.players.player1 && room.players.player1.nickname]);
    await roomRef.update({
      status: "playing",
      updatedAt: Date.now(),
      "players/player2": {
        nickname,
        joinedAt: Date.now(),
      },
    });
    enterOnlineRoom(roomRef, code, "player2", nickname);
    renderOnlineSetupStatus(`방 코드 ${code}에 입장했습니다. 내 닉네임은 ${nickname}입니다.`);
  }

  function enterOnlineRoom(roomRef, code, role, nickname) {
    online.active = true;
    online.roomRef = roomRef;
    online.roomCode = code;
    online.role = role;
    online.nickname = nickname;
    online.room = null;
    roomRef.on("value", (snapshot) => {
      const room = snapshot.val();
      online.room = room;
      if (!room || !room.state) {
        return;
      }
      const incoming = reviveRemoteState(room.state);
      const previousProblemId = state && state.problem ? state.problem.id : null;
      const incomingProblemId = incoming && incoming.problem ? incoming.problem.id : null;
      online.syncing = true;
      state = incoming;
      lastSettings = incoming.settings || lastSettings;
      if (previousProblemId !== incomingProblemId) {
        lastRenderedProblemId = null;
      }
      selectionHistory = [];
      online.syncing = false;
      render();
    });
  }

  function leaveOnlineRoom() {
    if (online.roomRef) {
      online.roomRef.off();
    }
    online = Object.assign(createOfflineSession(), {
      db: online.db,
      configured: online.configured,
      configError: online.configError,
    });
  }

  function commitState(nextState, meta) {
    state = nextState;
    render();
    if (!isOnline() || online.syncing) return;
    const update = {
      state: nextState,
      updatedAt: Date.now(),
    };
    if (meta && meta.status) {
      update.status = meta.status;
    }
    online.roomRef.update(update).catch(() => {
      renderOnlineSetupStatus("온라인 저장에 실패했습니다. 인터넷 연결을 확인해 주세요.", true);
    });
  }

  function mergeSelections() {
    const merged = [];
    const seen = new Set();
    Array.from(arguments).forEach((items) => {
      (items || []).forEach((item) => {
        if (!seen.has(item)) {
          seen.add(item);
          merged.push(item);
        }
      });
    });
    return merged;
  }

  function sameSelection(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }

  function applySelection(nextSelection) {
    if (!state || state.phase !== "painting" || !canAct()) return;
    const previous = state.selection.slice();
    const nextState = core.selectCells(state, nextSelection);
    if (!sameSelection(previous, nextState.selection)) {
      selectionHistory.push(previous);
      state = nextState;
      renderBoard();
      renderPaintPanel();
    }
  }

  function confirmPaintingWithRemainingCheck(nextState) {
    if (!nextState || nextState.phase !== "painting") return;
    const stats = core.selectionStats(nextState);
    if (stats.remainingCells > 0) {
      const ok = window.confirm(
        `남은 칠 가능 에너지가 ${stats.remainingCells}칸 있습니다. 정말 색칠을 확정할까요?`
      );
      if (!ok) return;
    }
    const confirmed = core.confirmPainting(nextState);
    selectionHistory = [];
    commitState(confirmed);
  }

  function render() {
    if (!state) {
      els.setupScreen.hidden = false;
      els.gameScreen.hidden = true;
      els.resultScreen.hidden = true;
      stopTimer();
      return;
    }

    if (state.phase === "gameover") {
      els.setupScreen.hidden = true;
      els.gameScreen.hidden = true;
      els.resultScreen.hidden = false;
      stopTimer();
      renderResults();
      return;
    }

    els.setupScreen.hidden = true;
    els.gameScreen.hidden = false;
    els.resultScreen.hidden = true;
    renderScore();
    renderBoard();
    renderProblem();
    renderPaintPanel();
    renderFeedbackPanel();
    renderSkipNotice();
    renderOnlineGameStatus();
    startTimerIfNeeded();
  }

  function renderScore() {
    const scores = core.calculateScore(state);
    els.p1Cells.textContent = scores.player1.cells;
    els.p1Final.textContent = scores.player1.finalScore;
    els.p2Cells.textContent = scores.player2.cells;
    els.p2Final.textContent = scores.player2.finalScore;

    const player = state.currentPlayer;
    els.currentPlayerBadge.textContent = `${core.playerLabel(player)} 차례`;
    els.currentPlayerBadge.className = `player-badge ${player}`;
    const aTurn = Math.min(core.TURNS_PER_PLAYER, state.turnCounts.player1 + 1);
    const bTurn = Math.min(core.TURNS_PER_PLAYER, state.turnCounts.player2 + 1);
    els.turnText.textContent = `A ${aTurn}/5, B ${bTurn}/5`;

    const phaseLabel = {
      question: "문제 풀기",
      painting: "색칠하기",
      feedback: "풀이 확인",
    }[state.phase];
    els.phaseText.textContent = phaseLabel || "";
  }

  function renderBoard() {
    if (!state) return;
    const selected = new Set(state.selection);
    Array.from(els.board.children).forEach((cellEl, index) => {
      const cellState = state.board[index];
      const isSelected = selected.has(index);
      const previewText = previewCellText(cellState, isSelected);
      cellEl.className = `cell ${cellState}${isSelected ? " selected" : ""}`;
      cellEl.textContent = previewText;
      cellEl.setAttribute("aria-pressed", isSelected ? "true" : "false");
    });

    if (state.phase === "painting") {
      els.boardHint.textContent =
        "드래그한 사각형 안에서 검은 칸과 연결되지 않은 칸은 자동으로 제외됩니다. 상대 칸은 획득 칸의 절반까지만 중립화할 수 있습니다.";
    } else if (state.phase === "feedback") {
      els.boardHint.textContent = "풀이를 확인한 뒤 다음 턴으로 넘어가세요.";
    } else {
      els.boardHint.textContent = "문제를 풀면 연결된 칸을 드래그하거나 직접 눌러 색칠할 수 있습니다.";
    }
  }

  function previewCellText(cellState, isSelected) {
    if (!state) return "";
    if (cellState === "player1") return "A";
    if (cellState === "player2") return "B";
    if (cellState === "black") return "X";
    if (isSelected) return core.playerLabel(state.currentPlayer);
    return "";
  }

  function renderProblem() {
    if (!state.problem) {
      els.problemPanel.hidden = true;
      return;
    }
    const problem = state.problem;
    els.problemPanel.hidden = false;
    els.problemType.textContent = `이번 문제: ${core.QUESTION_TYPES[problem.questionType]} 구하기`;
    els.shapeName.textContent = core.SHAPES[problem.shape];
    els.problemPrompt.textContent = problem.prompt;
    els.formulaText.textContent = problem.formulaText;
    els.diagramBox.innerHTML = buildDiagram(problem);
    els.answerForm.hidden = state.phase !== "question";
    els.answerInput.disabled = state.phase !== "question" || !canAct();
    const submitButton = els.answerForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = state.phase !== "question" || !canAct();
    }
    if (lastRenderedProblemId !== problem.id) {
      els.answerInput.value = "";
      lastRenderedProblemId = problem.id;
    }

    if (state.phase === "painting") {
      els.timerText.textContent = `${remainingSeconds || core.PAINT_TIME_LIMIT}초`;
    } else if (state.phase === "feedback") {
      els.timerText.textContent = "풀이";
    }
  }

  function renderPaintPanel() {
    const isPainting = state && state.phase === "painting";
    els.paintPanel.hidden = !isPainting;
    if (!isPainting) return;

    const stats = core.selectionStats(state);
    els.earnedCells.textContent = stats.earnedCells;
    els.usedCells.textContent = `${stats.usedCells} / ${stats.earnedCells}`;
    els.paintedCells.textContent = stats.paintedCells;
    els.neutralizedCells.textContent = `${stats.neutralizedCells} / ${stats.neutralizeLimit}`;
    els.remainingEnergy.textContent = stats.remainingCells;
    els.undoSelectionBtn.disabled = selectionHistory.length === 0 || !canAct();
    els.autoFillBtn.hidden = !state.settings.autoFill;
    els.autoFillBtn.disabled = !canAct();
    els.confirmPaintBtn.disabled = stats.usedCells > stats.earnedCells || !canAct();
    els.skipPaintBtn.disabled = !canAct();
  }

  function renderFeedbackPanel() {
    const isFeedback = state && state.phase === "feedback";
    els.feedbackPanel.hidden = !isFeedback;
    if (!isFeedback) return;
    els.feedbackTitle.textContent = state.lastFeedback ? state.lastFeedback.title : "안내";
    els.feedbackMessage.textContent = state.lastFeedback ? state.lastFeedback.message : "";
    els.continueBtn.disabled = !canAct();
  }

  function renderSkipNotice() {
    const notice = state && state.phase === "question" && state.lastFeedback && state.lastFeedback.type === "skip";
    els.skipNotice.hidden = !notice;
    if (notice) {
      els.skipNotice.textContent = state.lastFeedback.message;
    }
  }

  function renderOnlineGameStatus() {
    if (!els.onlineGameStatus) return;
    if (!isOnline()) {
      els.onlineGameStatus.hidden = true;
      els.newGameBtn.disabled = false;
      els.resultRestartBtn.disabled = false;
      return;
    }

    const players = (online.room && online.room.players) || {};
    const myLabel = core.playerLabel(online.role);
    const opponentRole = online.role === "player1" ? "player2" : "player1";
    const opponent = players[opponentRole];
    const waiting = !players.player2;
    const turnLabel = state ? core.playerLabel(state.currentPlayer) : "-";
    const turnText = canAct() ? "내 차례" : waiting ? "상대 입장 대기" : "상대 차례";

    els.onlineGameStatus.hidden = false;
    els.onlineGameStatus.textContent = waiting
      ? `온라인 방 ${online.roomCode} | 나는 ${myLabel}(${online.nickname}) | 상대 학생에게 방 코드를 알려주세요.`
      : `온라인 방 ${online.roomCode} | 나는 ${myLabel}(${online.nickname}) | 상대 ${opponent ? opponent.nickname : "입장 완료"} | 현재 ${turnLabel} 차례, ${turnText}`;

    els.newGameBtn.disabled = online.role !== "player1";
    els.resultRestartBtn.disabled = online.role !== "player1";
  }

  function renderResults() {
    const scores = core.calculateScore(state);
    const a = scores.player1.finalScore;
    const b = scores.player2.finalScore;
    if (a > b) {
      els.winnerTitle.textContent = "플레이어 A 승리";
    } else if (b > a) {
      els.winnerTitle.textContent = "플레이어 B 승리";
    } else {
      els.winnerTitle.textContent = "무승부";
    }

    els.resultP1Cells.textContent = scores.player1.cells;
    els.resultP1Final.textContent = scores.player1.finalScore;
    els.resultP2Cells.textContent = scores.player2.cells;
    els.resultP2Final.textContent = scores.player2.finalScore;
    els.resultRestartBtn.disabled = isOnline() && online.role !== "player1";
  }

  function startTimerIfNeeded() {
    if (!state || !state.problem || !["question", "painting"].includes(state.phase)) {
      stopTimer();
      return;
    }
    if (isOnline() && !canAct()) {
      stopTimer();
      els.timerText.textContent = state.phase === "painting" ? "상대 색칠 중" : "상대 차례";
      return;
    }

    const timerKey = `${state.phase}:${state.problem.id}:${state.currentPlayer}`;
    if (timerProblemId === timerKey && timerId) {
      els.timerText.textContent = `${remainingSeconds}초`;
      return;
    }
    stopTimer();
    timerProblemId = timerKey;
    remainingSeconds =
      state.phase === "question" ? core.TIME_LIMITS[state.settings.difficulty] : core.PAINT_TIME_LIMIT;
    els.timerText.textContent = `${remainingSeconds}초`;
    timerId = window.setInterval(() => {
      remainingSeconds -= 1;
      if (remainingSeconds <= 0) {
        stopTimer();
        const nextState =
          state.phase === "question" ? core.timeOutTurn(state) : core.confirmPainting(state, { timedOut: true });
        selectionHistory = [];
        commitState(nextState);
        return;
      }
      els.timerText.textContent = `${remainingSeconds}초`;
    }, 1000);
  }

  function stopTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
    timerProblemId = null;
  }

  function onBoardPointerDown(event) {
    if (!state || state.phase !== "painting" || !canAct()) return;
    const cell = event.target.closest(".cell");
    if (!cell) return;
    event.preventDefault();
    const index = Number(cell.dataset.index);
    dragState = {
      pointerId: event.pointerId,
      start: index,
      last: index,
      moved: false,
      baseSelection: state.selection.slice(),
      historyPushed: false,
    };
    els.board.setPointerCapture(event.pointerId);
  }

  function onBoardPointerMove(event) {
    if (!dragState || dragState.pointerId !== event.pointerId || !state || state.phase !== "painting" || !canAct()) return;
    event.preventDefault();
    const cell = cellFromPoint(event.clientX, event.clientY);
    if (!cell) return;
    const index = Number(cell.dataset.index);
    if (index === dragState.last) return;
    dragState.last = index;
    dragState.moved = dragState.moved || index !== dragState.start;
    const nextSelection = mergeSelections(
      dragState.baseSelection,
      rectangleIndices(dragState.start, dragState.last)
    );
    const nextState = core.selectCells(state, nextSelection);
    if (!sameSelection(state.selection, nextState.selection)) {
      if (!dragState.historyPushed) {
        selectionHistory.push(dragState.baseSelection);
        dragState.historyPushed = true;
      }
      state = nextState;
      renderBoard();
      renderPaintPanel();
    }
  }

  function onBoardPointerUp(event) {
    if (!dragState || dragState.pointerId !== event.pointerId || !state || state.phase !== "painting" || !canAct()) return;
    event.preventDefault();
    if (!dragState.moved) {
      applySelection(mergeSelections(state.selection, [dragState.start]));
    }
    if (els.board.hasPointerCapture(event.pointerId)) {
      els.board.releasePointerCapture(event.pointerId);
    }
    dragState = null;
    renderBoard();
    renderPaintPanel();
  }

  function onBoardPointerCancel(event) {
    if (dragState && dragState.pointerId === event.pointerId && els.board.hasPointerCapture(event.pointerId)) {
      els.board.releasePointerCapture(event.pointerId);
    }
    dragState = null;
  }

  function cellFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest(".cell");
  }

  function rectangleIndices(a, b) {
    const start = core.coordsOf(a);
    const end = core.coordsOf(b);
    const top = Math.min(start.row, end.row);
    const bottom = Math.max(start.row, end.row);
    const left = Math.min(start.col, end.col);
    const right = Math.max(start.col, end.col);
    const indices = [];
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        indices.push(core.indexOf(row, col));
      }
    }
    return indices;
  }

  function buildDiagram(problem) {
    const labels = problem.diagramLabels || {};
    const shape = problem.shape;
    const areaMode = problem.questionType === "area";
    const fill = areaMode ? "#dbeafe" : "#fff";
    const stroke = areaMode ? "#1d4ed8" : "#0f172a";
    const perimeterStroke = problem.questionType === "perimeter" ? "#dc2626" : stroke;
    const dashed = 'stroke-dasharray="5 4"';
    const text = (x, y, value, anchor) =>
      `<text x="${x}" y="${y}" text-anchor="${anchor || "middle"}" class="svg-label">${escapeSvg(value)}</text>`;

    if (shape === "rectangle" || shape === "square") {
      const wLabel = label(labels, shape === "square" ? "s" : "w", "가로");
      const hLabel = label(labels, shape === "square" ? "s" : "h", "세로");
      return svgWrap(`
        <rect x="55" y="28" width="150" height="82" rx="2" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${text(130, 22, `${wLabel}cm`)}
        ${text(214, 73, `${hLabel}cm`, "start")}
        ${areaMode ? text(130, 74, "넓이", "middle") : ""}
      `);
    }

    if (shape === "parallelogram") {
      return svgWrap(`
        <polygon points="55,108 195,108 225,32 85,32" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        <line x1="85" y1="32" x2="85" y2="108" stroke="#0f766e" stroke-width="2" ${dashed} />
        ${text(125, 126, `${label(labels, "b", "밑변")}cm`)}
        ${text(75, 72, `${label(labels, "h", "높이")}cm`, "end")}
        ${text(220, 76, `${label(labels, "side", "옆변")}cm`, "start")}
      `);
    }

    if (shape === "triangle") {
      const heightLine = areaMode
        ? `<line x1="130" y1="34" x2="130" y2="108" stroke="#0f766e" stroke-width="2" ${dashed} />`
        : "";
      return svgWrap(`
        <polygon points="50,108 210,108 130,32" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${heightLine}
        ${areaMode ? text(130, 126, `${label(labels, "b", "밑변")}cm`) : text(130, 126, `${label(labels, "c", "변")}cm`)}
        ${areaMode ? text(140, 72, `${label(labels, "h", "높이")}cm`, "start") : text(82, 72, `${label(labels, "a", "변")}cm`)}
        ${!areaMode ? text(178, 72, `${label(labels, "b", "변")}cm`) : ""}
      `);
    }

    if (shape === "rhombus") {
      const diagonals = areaMode
        ? `<line x1="130" y1="18" x2="130" y2="122" stroke="#0f766e" stroke-width="2" ${dashed} />
           <line x1="42" y1="70" x2="218" y2="70" stroke="#0f766e" stroke-width="2" ${dashed} />`
        : "";
      return svgWrap(`
        <polygon points="130,18 218,70 130,122 42,70" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${diagonals}
        ${areaMode ? text(130, 15, `${label(labels, "d1", "대각선")}cm`) : text(184, 47, `${label(labels, "s", "한 변")}cm`)}
        ${areaMode ? text(222, 66, `${label(labels, "d2", "대각선")}cm`, "start") : ""}
      `);
    }

    if (shape === "trapezoid") {
      const heightLine = areaMode
        ? `<line x1="87" y1="35" x2="87" y2="106" stroke="#0f766e" stroke-width="2" ${dashed} />`
        : "";
      return svgWrap(`
        <polygon points="82,35 178,35 220,106 40,106" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${heightLine}
        ${text(130, 27, `${label(labels, "top", "윗변")}cm`)}
        ${text(130, 126, `${label(labels, "bottom", "아랫변")}cm`)}
        ${areaMode ? text(76, 72, `${label(labels, "h", "높이")}cm`, "end") : text(54, 72, `${label(labels, "left", "옆변")}cm`)}
        ${!areaMode ? text(205, 72, `${label(labels, "right", "옆변")}cm`, "start") : ""}
      `);
    }

    return svgWrap(`<text x="130" y="74" text-anchor="middle" class="svg-label">도형</text>`);
  }

  function svgWrap(content) {
    return `
      <svg viewBox="0 0 260 140" role="img" aria-label="문제 도형 그림">
        <style>
          .svg-label { fill: #0f172a; font: 800 12px system-ui, sans-serif; }
        </style>
        ${content}
      </svg>
    `;
  }

  function label(labels, key, fallback) {
    const value = labels[key];
    if (value === undefined || value === null || value === "") return fallback;
    return String(value);
  }

  function escapeSvg(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  init();
})();
