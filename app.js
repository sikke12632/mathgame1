(function () {
  "use strict";

  const core = window.ShapeTerritoryCore;
  const $ = (id) => document.getElementById(id);

  const els = {
    setupScreen: $("setupScreen"),
    setupForm: $("setupForm"),
    setupError: $("setupError"),
    howToPlayBtn: $("howToPlayBtn"),
    howToPlayPanel: $("howToPlayPanel"),
    shapeChoices: $("shapeChoices"),
    autoFillRow: $("autoFillRow"),
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
    roundOrderPanel: $("roundOrderPanel"),
    roundOrderEyebrow: $("roundOrderEyebrow"),
    roundOrderTitle: $("roundOrderTitle"),
    roundOrderBadges: $("roundOrderBadges"),
    roundOrderMessage: $("roundOrderMessage"),
    roundOrderDetail: $("roundOrderDetail"),
    problemPanel: $("problemPanel"),
    problemType: $("problemType"),
    timerText: $("timerText"),
    shapeName: $("shapeName"),
    diagramBox: $("diagramBox"),
    problemPrompt: $("problemPrompt"),
    formulaText: $("formulaText"),
    answerForm: $("answerForm"),
    answerLabel: $("answerLabel"),
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
    rpgScreen: $("rpgScreen"),
    rpgOnlineStatus: $("rpgOnlineStatus"),
    rpgBackSetupBtn: $("rpgBackSetupBtn"),
    rpgSolvingPanel: $("rpgSolvingPanel"),
    rpgProblemCount: $("rpgProblemCount"),
    rpgScoreText: $("rpgScoreText"),
    rpgShapeName: $("rpgShapeName"),
    rpgDiagramBox: $("rpgDiagramBox"),
    rpgProblemPrompt: $("rpgProblemPrompt"),
    rpgFormulaText: $("rpgFormulaText"),
    rpgAnswerForm: $("rpgAnswerForm"),
    rpgAnswerInput: $("rpgAnswerInput"),
    rpgOpponentSolveStatus: $("rpgOpponentSolveStatus"),
    rpgStatPanel: $("rpgStatPanel"),
    rpgStatPointText: $("rpgStatPointText"),
    rpgAnswerReview: $("rpgAnswerReview"),
    rpgHpInvest: $("rpgHpInvest"),
    rpgAttackInvest: $("rpgAttackInvest"),
    rpgDefenseInvest: $("rpgDefenseInvest"),
    rpgZeroBonusBox: $("rpgZeroBonusBox"),
    rpgPreviewHp: $("rpgPreviewHp"),
    rpgPreviewAttack: $("rpgPreviewAttack"),
    rpgPreviewDefense: $("rpgPreviewDefense"),
    rpgPreviewArchetype: $("rpgPreviewArchetype"),
    rpgStatError: $("rpgStatError"),
    rpgLockStatsBtn: $("rpgLockStatsBtn"),
    rpgOpponentStatStatus: $("rpgOpponentStatStatus"),
    rpgBattlePanel: $("rpgBattlePanel"),
    rpgP1HpBar: $("rpgP1HpBar"),
    rpgP2HpBar: $("rpgP2HpBar"),
    rpgP1Stats: $("rpgP1Stats"),
    rpgP2Stats: $("rpgP2Stats"),
    rpgTurnText: $("rpgTurnText"),
    rpgChoiceStatus: $("rpgChoiceStatus"),
    rpgBattleLog: $("rpgBattleLog"),
    rpgResultPanel: $("rpgResultPanel"),
    rpgWinnerTitle: $("rpgWinnerTitle"),
    rpgFinishReason: $("rpgFinishReason"),
    rpgFinalSummary: $("rpgFinalSummary"),
    rpgResultSetupBtn: $("rpgResultSetupBtn"),
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
  let selectedGameMode = "territory";
  let rpgChoiceSecrets = {};
  let lastRpgStatPlayer = "";
  let lastRenderedRpgProblemKey = "";
  let soloAiTimer = null;

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
      serverTimeOffset: 0,
    };
  }

  function init() {
    buildShapeChoices();
    buildBoardCells();
    initFirebase();
    bindEvents();
    updateAutoFillAvailability();
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
        online.db.ref(".info/serverTimeOffset").on("value", (snapshot) => {
          online.serverTimeOffset = Number(snapshot.val()) || 0;
        });
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
    els.howToPlayBtn.addEventListener("click", () => {
      const nextOpen = els.howToPlayPanel.hidden;
      els.howToPlayPanel.hidden = !nextOpen;
      els.howToPlayBtn.setAttribute("aria-expanded", String(nextOpen));
      els.howToPlayBtn.textContent = nextOpen ? "플레이 방법 닫기" : "플레이 방법";
    });

    document.querySelectorAll("input[name='gameMode']").forEach((input) => {
      input.addEventListener("change", updateAutoFillAvailability);
    });

    els.setupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const settings = collectSettings();
      if (!settings) return;
      leaveOnlineRoom();
      lastSettings = settings;
      selectedGameMode = collectGameMode();
      state =
        selectedGameMode === "rpg"
          ? core.createRpgState(settings, "local-" + Date.now())
          : core.createGameState(settings);
      state.solo = true;
      state.aiPlayer = "player2";
      lastRenderedProblemId = null;
      selectionHistory = [];
      rpgChoiceSecrets = {};
      lastRpgStatPlayer = "";
      render();
      window.setTimeout(() => {
        if (state && state.gameMode === "rpg" && els.rpgAnswerInput) {
          els.rpgAnswerInput.focus();
        } else {
          els.answerInput.focus();
        }
      }, 0);
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
      const submitter = activeSubmitter();
      if (!submitter) return;
      const nextState = core.submitAnswer(state, submitter, els.answerInput.value, currentSubmittedAt());
      commitState(nextState);
      if (nextState.phase === "question") {
        els.answerInput.value = "";
        window.setTimeout(() => els.answerInput.focus(), 0);
      }
    });

    els.continueBtn.addEventListener("click", () => {
      if (!state || !canAct()) return;
      const nextState = core.nextTurn(state);
      selectionHistory = [];
      commitState(nextState);
      if (nextState.phase === "question") {
        window.setTimeout(() => els.answerInput.focus(), 0);
      } else if (nextState.phase === "painting") {
        window.setTimeout(() => els.board.focus(), 0);
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
      if (isSoloGame()) {
        nextState.solo = true;
        nextState.aiPlayer = "player2";
      }
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
      if (state && state.solo) {
        nextState.solo = true;
        nextState.aiPlayer = "player2";
      }
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

    if (els.rpgBackSetupBtn) {
      els.rpgBackSetupBtn.addEventListener("click", () => {
        leaveOnlineRoom();
        state = null;
        stopTimer();
        render();
      });
    }

    if (els.rpgResultSetupBtn) {
      els.rpgResultSetupBtn.addEventListener("click", () => {
        leaveOnlineRoom();
        state = null;
        stopTimer();
        render();
      });
    }

    if (els.rpgAnswerForm) {
      els.rpgAnswerForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!isRpgState() || !canActRpg()) return;
        const player = activeRpgPlayer();
        if (!player) return;
        const nextState = core.submitRpgAnswer(state, player, els.rpgAnswerInput.value);
        commitState(nextState);
      });
    }

    ["rpgHpInvest", "rpgAttackInvest", "rpgDefenseInvest"].forEach((id) => {
      const input = els[id];
      if (input) input.addEventListener("input", renderRpgStatPreview);
    });

    document.querySelectorAll("input[name='rpgZeroBonus']").forEach((input) => {
      input.addEventListener("change", renderRpgStatPreview);
    });

    if (els.rpgLockStatsBtn) {
      els.rpgLockStatsBtn.addEventListener("click", () => {
        if (!isRpgState() || !canActRpg()) return;
        const player = activeRpgPlayer();
        if (!player) return;
        const input = collectRpgStatInput(player);
        const nextState = core.lockRpgStats(state, player, input);
        lastRpgStatPlayer = "";
        commitState(nextState);
      });
    }

    document.querySelectorAll("[data-rpg-choice]").forEach((button) => {
      button.addEventListener("click", async () => {
        if (!isRpgState() || !canActRpg()) return;
        await chooseRpgBattle(button.dataset.rpgChoice);
      });
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
      autoFill: collectGameMode() === "rpg" ? false : els.autoFillInput.checked,
    });
  }

  function collectGameMode() {
    const input = document.querySelector("input[name='gameMode']:checked");
    return input && input.value === "rpg" ? "rpg" : "territory";
  }

  function isRpgState() {
    return state && state.gameMode === "rpg";
  }

  function updateAutoFillAvailability() {
    const isRpg = collectGameMode() === "rpg";
    if (els.autoFillRow) {
      els.autoFillRow.hidden = isRpg;
    }
    if (els.autoFillInput) {
      els.autoFillInput.disabled = isRpg;
    }
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

  function isSoloGame() {
    return Boolean(state && state.solo && !isOnline());
  }

  function isAiPlayer(player) {
    return isSoloGame() && player === (state.aiPlayer || "player2");
  }

  function hasSubmitted(player) {
    return Boolean(state && state.submissions && state.submissions[player]);
  }

  function activeSubmitter() {
    if (!state || state.phase !== "question") return null;
    if (isOnline()) {
      return hasSubmitted(online.role) ? null : online.role;
    }
    if (isSoloGame()) {
      return hasSubmitted("player1") ? null : "player1";
    }
    return core.PLAYER_KEYS.find((player) => !hasSubmitted(player)) || null;
  }

  function currentSubmittedAt() {
    return Date.now() + (isOnline() ? online.serverTimeOffset || 0 : 0);
  }

  function activeRpgPlayer() {
    if (!isRpgState()) return null;
    if (isOnline()) return online.role;
    if (isSoloGame()) return "player1";
    if (state.phase === "rpgSolving") {
      return core.PLAYER_KEYS.find((player) => !state.solveFinished[player]) || "player1";
    }
    if (state.phase === "rpgStatAllocation") {
      return core.PLAYER_KEYS.find((player) => !state.statLocked[player]) || "player1";
    }
    if (state.phase === "rpgBattle" && state.battle) {
      const turnKey = String(state.battle.turnIndex);
      const choices = (state.battle.choices && state.battle.choices[turnKey]) || {};
      return core.PLAYER_KEYS.find((player) => !choices[player]) || "player1";
    }
    return "player1";
  }

  function canActRpg() {
    if (!isRpgState()) return false;
    if (!isOnline()) {
      if (!isSoloGame()) return true;
      if (state.phase === "rpgSolving") return !state.solveFinished.player1;
      if (state.phase === "rpgStatAllocation") return !state.statLocked.player1;
      if (state.phase === "rpgBattle" && state.battle) {
        const turnKey = String(state.battle.turnIndex);
        const choices = (state.battle.choices && state.battle.choices[turnKey]) || {};
        return !choices.player1;
      }
      return false;
    }
    return Boolean(online.room && online.room.players && online.room.players.player2);
  }

  function canAct() {
    if (!state) return false;
    if (!isOnline()) {
      if (!isSoloGame()) return true;
      if (state.phase === "question") return !hasSubmitted("player1");
      if (state.phase === "round-result") {
        const queue = state.actionQueue || [];
        if (!queue.length) return true;
        return queue[0] === "player1";
      }
      if (state.phase === "painting" || state.phase === "feedback") {
        return state.currentPlayer === "player1";
      }
      return true;
    }
    const hasOpponent = Boolean(online.room && online.room.players && online.room.players.player2);
    if (!hasOpponent && state.phase !== "gameover") return false;
    if (state.phase === "question") {
      return !hasSubmitted(online.role);
    }
    if (state.phase === "round-result") {
      const queue = state.actionQueue || [];
      if (!queue.length) return online.role === "player1";
      return queue[0] === online.role;
    }
    if (state.phase === "painting" || state.phase === "feedback") {
      return state.currentPlayer === online.role;
    }
    return false;
  }

  function reviveRemoteState(remoteState) {
    if (!remoteState) return null;
    if (remoteState.gameMode === "rpg") {
      return reviveRpgRemoteState(remoteState);
    }
    return Object.assign({}, remoteState, {
      board: listFromFirebase(remoteState.board),
      problemHistory: listFromFirebase(remoteState.problemHistory),
      selection: listFromFirebase(remoteState.selection),
      actionQueue: listFromFirebase(remoteState.actionQueue),
      skippedTurns: listFromFirebase(remoteState.skippedTurns),
      turnCounts: Object.assign({ player1: 0, player2: 0 }, remoteState.turnCounts || {}),
      roundIndex: remoteState.roundIndex || 0,
      currentActionIndex: remoteState.currentActionIndex || 0,
      submissions: Object.assign(core.createEmptySubmissions(), remoteState.submissions || {}),
      lastFirstActor: remoteState.lastFirstActor || null,
      consecutiveFirstActorCount: remoteState.consecutiveFirstActorCount || 0,
    });
  }

  function reviveRpgRemoteState(remoteState) {
    const battle = remoteState.battle
      ? Object.assign({}, remoteState.battle, {
          hp: Object.assign({ player1: 0, player2: 0 }, remoteState.battle.hp || {}),
          choices: Object.assign({}, remoteState.battle.choices || {}),
          reveals: Object.assign({}, remoteState.battle.reveals || {}),
          logs: listFromFirebase(remoteState.battle.logs),
        })
      : null;
    return Object.assign({}, remoteState, {
      gameMode: "rpg",
      problems: listFromFirebase(remoteState.problems),
      answers: {
        player1: listFromFirebase(remoteState.answers && remoteState.answers.player1),
        player2: listFromFirebase(remoteState.answers && remoteState.answers.player2),
      },
      solveScores: Object.assign({ player1: 0, player2: 0 }, remoteState.solveScores || {}),
      solveFinished: Object.assign({ player1: false, player2: false }, remoteState.solveFinished || {}),
      statAllocations: Object.assign({ player1: null, player2: null }, remoteState.statAllocations || {}),
      statLocked: Object.assign({ player1: false, player2: false }, remoteState.statLocked || {}),
      battle,
      winner: remoteState.winner || null,
      finishReason: remoteState.finishReason || null,
      lastRpgError: remoteState.lastRpgError || "",
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

      const gameMode = collectGameMode();
      selectedGameMode = gameMode;
      const nextState =
        gameMode === "rpg"
          ? core.createRpgState(settings, code)
          : core.createGameState(settings);
      await roomRef.set({
        roomCode: code,
        gameMode,
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
      rpgChoiceSecrets = {};
      lastRpgStatPlayer = "";
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
    selectedGameMode = room.gameMode || (room.state && room.state.gameMode) || "territory";
    rpgChoiceSecrets = {};
    lastRpgStatPlayer = "";
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
      selectedGameMode = incoming.gameMode || "territory";
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
      serverTimeOffset: online.serverTimeOffset || 0,
    });
    rpgChoiceSecrets = {};
    lastRpgStatPlayer = "";
    lastRenderedRpgProblemKey = "";
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
      if (els.rpgScreen) els.rpgScreen.hidden = true;
      stopTimer();
      return;
    }

    if (state.phase === "gameover") {
      els.setupScreen.hidden = true;
      els.gameScreen.hidden = true;
      els.resultScreen.hidden = false;
      if (els.rpgScreen) els.rpgScreen.hidden = true;
      stopTimer();
      renderResults();
      return;
    }

    if (isRpgState()) {
      renderRpg();
      stopTimer();
      return;
    }

    els.setupScreen.hidden = true;
    els.gameScreen.hidden = false;
    els.resultScreen.hidden = true;
    if (els.rpgScreen) els.rpgScreen.hidden = true;
    renderScore();
    renderBoard();
    renderRoundOrderPanel();
    renderProblem();
    renderPaintPanel();
    renderFeedbackPanel();
    renderSkipNotice();
    renderOnlineGameStatus();
    startTimerIfNeeded();
    scheduleSoloAiIfNeeded();
  }

  function renderRpg() {
    els.setupScreen.hidden = true;
    els.gameScreen.hidden = true;
    els.resultScreen.hidden = true;
    els.rpgScreen.hidden = false;

    renderRpgOnlineStatus();
    renderRpgPanels();
    scheduleSoloAiIfNeeded();
  }

  function renderRpgOnlineStatus() {
    if (!els.rpgOnlineStatus) return;
    if (!isOnline()) {
      els.rpgOnlineStatus.textContent = isSoloGame() ? "혼자서 하기 | 상대 AI" : "로컬 도형 RPG 대전";
      return;
    }
    const players = (online.room && online.room.players) || {};
    const opponentRole = online.role === "player1" ? "player2" : "player1";
    const opponent = players[opponentRole];
    els.rpgOnlineStatus.textContent = opponent
      ? `온라인 방 ${online.roomCode} | 내 닉네임 ${online.nickname} | 상대 ${opponent.nickname}`
      : `온라인 방 ${online.roomCode} | 내 닉네임 ${online.nickname} | 상대 학생에게 방 코드를 알려주세요.`;
  }

  function renderRpgPanels() {
    const phase = state.phase;
    els.rpgSolvingPanel.hidden = phase !== "rpgSolving";
    els.rpgStatPanel.hidden = phase !== "rpgStatAllocation";
    els.rpgBattlePanel.hidden = phase !== "rpgBattle";
    els.rpgResultPanel.hidden = phase !== "rpgFinished";

    if (phase === "rpgSolving") renderRpgSolving();
    if (phase === "rpgStatAllocation") renderRpgStats();
    if (phase === "rpgBattle") renderRpgBattle();
    if (phase === "rpgFinished") renderRpgResult();
  }

  function renderRpgSolving() {
    const player = activeRpgPlayer();
    const index = core.rpgPlayerAnswerIndex(state, player);
    const problem = state.problems[index];
    const score = state.solveScores[player] || 0;
    const opponent = core.opponentOf(player);
    const opponentIndex = core.rpgPlayerAnswerIndex(state, opponent);
    const canSubmit = canActRpg() && Boolean(problem);

    els.rpgScoreText.textContent = `${core.playerLabel(player)} ${score}점`;
    els.rpgOpponentSolveStatus.textContent = isOnline()
      ? `상대 진행: ${Math.min(opponentIndex, core.RPG_PROBLEM_COUNT)}/${core.RPG_PROBLEM_COUNT}`
      : `현재 풀이: ${core.playerLabel(player)} | A ${core.rpgPlayerAnswerIndex(state, "player1")}/5, B ${core.rpgPlayerAnswerIndex(state, "player2")}/5`;

    if (!problem) {
      els.rpgProblemCount.textContent = "풀이 완료";
      els.rpgShapeName.textContent = "대기";
      els.rpgDiagramBox.innerHTML = "";
      els.rpgProblemPrompt.textContent = "상대가 문제 풀이를 마치기를 기다리는 중입니다.";
      els.rpgFormulaText.textContent = "";
      els.rpgAnswerForm.hidden = true;
      return;
    }

    const problemKey = `${player}:${problem.id}:${index}`;
    els.rpgProblemCount.textContent = `${core.playerLabel(player)} 문제 ${index + 1}/${core.RPG_PROBLEM_COUNT}`;
    els.rpgShapeName.textContent = core.SHAPES[problem.shape];
    els.rpgProblemPrompt.textContent = problem.prompt;
    els.rpgFormulaText.textContent = problem.formulaText;
    els.rpgDiagramBox.innerHTML = buildDiagram(problem);
    els.rpgAnswerForm.hidden = false;
    els.rpgAnswerInput.disabled = !canSubmit;
    const submitButton = els.rpgAnswerForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = !canSubmit;
    if (lastRenderedRpgProblemKey !== problemKey) {
      els.rpgAnswerInput.value = "";
      lastRenderedRpgProblemKey = problemKey;
    }
  }

  function renderRpgStats() {
    const player = activeRpgPlayer();
    const opponent = core.opponentOf(player);
    const score = state.solveScores[player] || 0;
    const locked = state.statLocked[player];
    const opponentLocked = state.statLocked[opponent];

    if (lastRpgStatPlayer !== player) {
      fillRpgStatInputs(player);
      lastRpgStatPlayer = player;
    }

    els.rpgStatPointText.textContent = `${core.playerLabel(player)} 획득 스탯 포인트: ${score}점`;
    els.rpgZeroBonusBox.hidden = score !== 0;
    els.rpgOpponentStatStatus.textContent = isOnline()
      ? opponentLocked
        ? "상대 스탯 확정 완료"
        : "상대 스탯 투자 대기 중"
      : `A ${state.statLocked.player1 ? "확정" : "대기"} | B ${state.statLocked.player2 ? "확정" : "대기"}`;
    els.rpgLockStatsBtn.disabled = locked || !canActRpg();

    els.rpgAnswerReview.innerHTML = (state.problems || [])
      .map((problem, index) => {
        const answer = state.answers[player][index];
        if (!answer) return "";
        const submitted = answer.submittedAnswer == null ? "시간초과" : answer.submittedAnswer;
        return `<p>${index + 1}. ${answer.isCorrect ? "정답" : "오답"} | 내 답: ${submitted} | 정답: ${problem.answer} | 획득 ${answer.earnedPoints}점</p>`;
      })
      .join("");

    renderRpgStatPreview();
  }

  function fillRpgStatInputs(player) {
    const score = state.solveScores[player] || 0;
    const saved = state.statAllocations[player];
    if (saved) {
      els.rpgHpInvest.value = saved.hpInvest;
      els.rpgAttackInvest.value = saved.attackInvest;
      els.rpgDefenseInvest.value = saved.defenseInvest;
      return;
    }
    els.rpgHpInvest.value = 0;
    els.rpgAttackInvest.value = score;
    els.rpgDefenseInvest.value = 0;
  }

  function collectRpgStatInput(player) {
    const zeroInput = document.querySelector("input[name='rpgZeroBonus']:checked");
    return {
      totalPoints: state.solveScores[player] || 0,
      hpInvest: Number(els.rpgHpInvest.value || 0),
      attackInvest: Number(els.rpgAttackInvest.value || 0),
      defenseInvest: Number(els.rpgDefenseInvest.value || 0),
      zeroPointArchetype: zeroInput && zeroInput.value === "defense" ? "defense" : "attack",
    };
  }

  function renderRpgStatPreview() {
    if (!isRpgState() || state.phase !== "rpgStatAllocation") return;
    const player = activeRpgPlayer();
    const input = collectRpgStatInput(player);
    const stats = core.calculateRpgStats(input);
    const check = core.validateRpgStatInput(input);
    const locked = state.statLocked[player];

    els.rpgPreviewHp.textContent = stats.maxHp;
    els.rpgPreviewAttack.textContent = stats.attack;
    els.rpgPreviewDefense.textContent = stats.defense;
    els.rpgPreviewArchetype.textContent = stats.archetype === "attack" ? "공격형" : "방어형";
    els.rpgStatError.textContent = state.lastRpgError || (check.ok ? "" : check.message);
    els.rpgLockStatsBtn.disabled = !check.ok || locked || !canActRpg();
  }

  function renderRpgBattle() {
    const p1Stats = state.statAllocations.player1;
    const p2Stats = state.statAllocations.player2;
    const hp = state.battle.hp;
    const turnKey = String(state.battle.turnIndex);
    const choices = (state.battle.choices && state.battle.choices[turnKey]) || {};
    const player = activeRpgPlayer();
    const opponent = core.opponentOf(player);

    setHpBar(els.rpgP1HpBar, hp.player1, p1Stats.maxHp);
    setHpBar(els.rpgP2HpBar, hp.player2, p2Stats.maxHp);
    els.rpgP1Stats.textContent = `체력 ${hp.player1}/${p1Stats.maxHp} | 공격 ${p1Stats.attack} | 방어 ${p1Stats.defense} | ${p1Stats.archetype === "attack" ? "공격형" : "방어형"}`;
    els.rpgP2Stats.textContent = `체력 ${hp.player2}/${p2Stats.maxHp} | 공격 ${p2Stats.attack} | 방어 ${p2Stats.defense} | ${p2Stats.archetype === "attack" ? "공격형" : "방어형"}`;
    els.rpgTurnText.textContent = `${state.battle.turnIndex + 1}/${core.RPG_BATTLE_TURN_COUNT}턴`;
    els.rpgChoiceStatus.textContent = isOnline()
      ? `내 선택: ${choices[player] ? "완료" : "대기"} | 상대 선택: ${choices[opponent] ? "완료" : "대기"}`
      : `현재 선택: ${core.playerLabel(player)} | A ${choices.player1 ? "완료" : "대기"} | B ${choices.player2 ? "완료" : "대기"}`;

    document.querySelectorAll("[data-rpg-choice]").forEach((button) => {
      button.disabled = !canActRpg() || Boolean(choices[player]);
    });

    els.rpgBattleLog.innerHTML = (state.battle.logs || [])
      .map((log) => `<p>${log.turnIndex + 1}턴: ${log.message}</p>`)
      .join("");

    if (choices.player1 && choices.player2) {
      window.setTimeout(revealPendingRpgChoices, 0);
    }
  }

  function setHpBar(el, current, max) {
    const percent = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
    el.style.width = `${percent}%`;
  }

  function renderRpgResult() {
    const winnerText =
      state.winner === "draw" ? "무승부" : state.winner === "player1" ? "A 승리" : "B 승리";
    els.rpgWinnerTitle.textContent = winnerText;
    els.rpgFinishReason.textContent = state.finishReason || "";
    els.rpgFinalSummary.innerHTML = `
      <div class="result-box player1-line">
        <h2>A</h2>
        <p>최종 체력 <strong>${state.battle.hp.player1}</strong></p>
        <p>문제 점수 <strong>${state.solveScores.player1}</strong></p>
      </div>
      <div class="result-box player2-line">
        <h2>B</h2>
        <p>최종 체력 <strong>${state.battle.hp.player2}</strong></p>
        <p>문제 점수 <strong>${state.solveScores.player2}</strong></p>
      </div>
    `;
  }

  async function chooseRpgBattle(choice) {
    const player = activeRpgPlayer();
    if (!player || !state.battle) return;
    const turnKey = String(state.battle.turnIndex);
    const choices = (state.battle.choices && state.battle.choices[turnKey]) || {};
    if (choices[player]) return;

    const salt = createRpgSalt();
    const commitHash = await sha256Text(`${choice}:${salt}`);
    rpgChoiceSecrets[`${turnKey}:${player}`] = { choice, salt, commitHash };

    const nextState = core.commitRpgChoice(state, player, commitHash);
    commitState(nextState);
    window.setTimeout(revealPendingRpgChoices, 0);
  }

  async function revealPendingRpgChoices() {
    const latest = state;
    if (!latest || latest.phase !== "rpgBattle" || !latest.battle) return;
    const turnKey = String(latest.battle.turnIndex);
    const choices = (latest.battle.choices && latest.battle.choices[turnKey]) || {};
    const reveals = (latest.battle.reveals && latest.battle.reveals[turnKey]) || {};
    if (!choices.player1 || !choices.player2) return;

    let nextState = latest;
    let changed = false;
    for (const player of core.PLAYER_KEYS) {
      if (reveals[player]) continue;
      const secret = rpgChoiceSecrets[`${turnKey}:${player}`];
      if (!secret) continue;
      const ownCommit = choices[player] && choices[player].commitHash;
      const hashOk = ownCommit === (await sha256Text(`${secret.choice}:${secret.salt}`));
      nextState = core.revealRpgChoice(nextState, player, {
        choice: secret.choice,
        salt: secret.salt,
        hashOk,
      });
      changed = true;
    }
    if (changed) {
      commitState(nextState);
    }
  }

  function createRpgSalt() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return String(Date.now()) + "-" + Math.random().toString(36).slice(2);
  }

  async function sha256Text(text) {
    if (!window.crypto || !window.crypto.subtle) {
      return fallbackHashText(text);
    }
    const bytes = new TextEncoder().encode(text);
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  function fallbackHashText(text) {
    let hash = 0;
    String(text)
      .split("")
      .forEach((char) => {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
      });
    return String(hash);
  }

  function scheduleSoloAiIfNeeded() {
    if (!isSoloGame() || soloAiTimer) return;
    if (isRpgState()) {
      scheduleSoloRpgAiIfNeeded();
      return;
    }
    scheduleSoloTerritoryAiIfNeeded();
  }

  function scheduleSoloTerritoryAiIfNeeded() {
    if (!state) return;
    if (state.phase === "question" && hasSubmitted("player1") && !hasSubmitted("player2")) {
      scheduleSoloAiAction(() => {
        const problem = state.problem;
        const answer = aiAnswerForProblem(problem);
        const p1Submission = state.submissions && state.submissions.player1;
        const baseTime = Number.isFinite(p1Submission && p1Submission.submittedAt)
          ? p1Submission.submittedAt
          : Date.now();
        const submittedAt = baseTime + randomInt(-4000, 7000);
        commitState(core.submitAnswer(state, "player2", answer, submittedAt));
      }, 650);
      return;
    }

    if (state.phase === "round-result" && (state.actionQueue || [])[0] === "player2") {
      scheduleSoloAiAction(() => {
        commitState(core.nextTurn(state));
      }, 900);
      return;
    }

    if (state.phase === "painting" && state.currentPlayer === "player2") {
      scheduleSoloAiAction(() => {
        let nextState = state;
        const selection = core.autoFillSelection(nextState);
        if (selection.length) {
          nextState = core.selectCells(nextState, selection);
        }
        commitState(core.confirmPainting(nextState));
      }, 900);
      return;
    }

    if (state.phase === "feedback" && state.currentPlayer === "player2") {
      scheduleSoloAiAction(() => {
        commitState(core.nextTurn(state));
      }, 800);
    }
  }

  function scheduleSoloRpgAiIfNeeded() {
    if (!state) return;
    if (state.phase === "rpgSolving") {
      const humanCount = core.rpgPlayerAnswerIndex(state, "player1");
      const aiCount = core.rpgPlayerAnswerIndex(state, "player2");
      if (humanCount > aiCount && aiCount < core.RPG_PROBLEM_COUNT) {
        scheduleSoloAiAction(() => {
          const problem = state.problems[core.rpgPlayerAnswerIndex(state, "player2")];
          commitState(core.submitRpgAnswer(state, "player2", aiAnswerForProblem(problem)));
        }, 650);
      }
      return;
    }

    if (state.phase === "rpgStatAllocation" && state.statLocked.player1 && !state.statLocked.player2) {
      scheduleSoloAiAction(() => {
        const input = createAiRpgStatInput(state.solveScores.player2 || 0);
        commitState(core.lockRpgStats(state, "player2", input));
      }, 900);
      return;
    }

    if (state.phase === "rpgBattle" && state.battle) {
      const turnKey = String(state.battle.turnIndex);
      const choices = (state.battle.choices && state.battle.choices[turnKey]) || {};
      if (choices.player1 && !choices.player2) {
        scheduleSoloAiAction(async () => {
          const choice = chooseAiRpgChoice();
          const salt = createRpgSalt();
          const commitHash = await sha256Text(`${choice}:${salt}`);
          rpgChoiceSecrets[`${turnKey}:player2`] = { choice, salt, commitHash };
          commitState(core.commitRpgChoice(state, "player2", commitHash));
        }, 650);
      }
    }
  }

  function scheduleSoloAiAction(action, delay) {
    soloAiTimer = window.setTimeout(async () => {
      soloAiTimer = null;
      if (!isSoloGame()) return;
      await action();
    }, delay);
  }

  function aiAnswerForProblem(problem) {
    if (!problem) return "";
    const correct = Math.random() < 0.7;
    if (correct) return problem.answer;
    return problem.answer + randomInt(1, 5);
  }

  function createAiRpgStatInput(totalPoints) {
    const points = Math.max(0, Math.floor(Number(totalPoints) || 0));
    if (points === 0) {
      return {
        totalPoints: 0,
        hpInvest: 0,
        attackInvest: 0,
        defenseInvest: 0,
        zeroPointArchetype: "attack",
      };
    }

    let hpInvest = Math.floor(points * 0.25);
    let remaining = points - hpInvest;
    let attackInvest = Math.ceil(remaining * 0.65);
    let defenseInvest = remaining - attackInvest;

    if (attackInvest === defenseInvest) {
      if (defenseInvest > 0) {
        attackInvest += 1;
        defenseInvest -= 1;
      } else if (hpInvest > 0) {
        hpInvest -= 1;
        attackInvest += 1;
      } else {
        attackInvest = points;
        defenseInvest = 0;
      }
    }

    return {
      totalPoints: points,
      hpInvest,
      attackInvest,
      defenseInvest,
      zeroPointArchetype: "attack",
    };
  }

  function chooseAiRpgChoice() {
    const roll = Math.random();
    if (roll < 0.42) return "scissors";
    if (roll < 0.72) return "rock";
    return "paper";
  }

  function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  function renderScore() {
    const scores = core.calculateScore(state);
    els.p1Cells.textContent = scores.player1.cells;
    els.p1Final.textContent = scores.player1.finalScore;
    els.p2Cells.textContent = scores.player2.cells;
    els.p2Final.textContent = scores.player2.finalScore;

    const player = state.currentPlayer;
    if (state.phase === "question") {
      els.currentPlayerBadge.textContent = "동시 문제";
      els.currentPlayerBadge.className = "player-badge neutral";
    } else if (state.phase === "round-result") {
      els.currentPlayerBadge.textContent = "순서 결정";
      els.currentPlayerBadge.className = "player-badge neutral";
    } else {
      els.currentPlayerBadge.textContent = `${core.playerLabel(player)} 행동`;
      els.currentPlayerBadge.className = `player-badge ${player}`;
    }
    const roundNumber = Math.min(core.TURNS_PER_PLAYER, (state.roundIndex || 0) + 1);
    els.turnText.textContent = `라운드 ${roundNumber}/5`;

    const phaseLabel = {
      question: "문제 풀기",
      "round-result": "순서 확인",
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
    } else if (state.phase === "round-result") {
      els.boardHint.textContent = "이번 라운드의 선공과 후공을 확인한 뒤 행동을 시작하세요.";
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

  function orderBadge(player, title, caption, kind) {
    return `<div class="round-order-badge ${kind || ""}">
      <strong>${title}</strong>
      <span>${caption || core.playerLabel(player)}</span>
    </div>`;
  }

  function renderRoundOrderPanel() {
    const visible =
      state &&
      ["round-result", "painting", "feedback"].includes(state.phase) &&
      (state.roundResult || (state.actionQueue && state.actionQueue.length));
    els.roundOrderPanel.hidden = !visible;
    if (!visible) return;

    const result = state.roundResult || {};
    const queue = state.actionQueue || [];
    els.roundOrderPanel.className = `round-order-panel${result.protectedApplied ? " protected" : ""}`;
    els.roundOrderEyebrow.textContent = `이번 라운드`;

    if (state.phase === "painting") {
      const current = state.currentPlayer;
      const nextActor = queue[(state.currentActionIndex || 0) + 1];
      els.roundOrderTitle.textContent = `현재 행동: ${core.playerLabel(current)}`;
      els.roundOrderBadges.innerHTML = nextActor
        ? orderBadge(current, `${core.playerLabel(current)} 행동 중`, "현재 행동", "first") +
          orderBadge(nextActor, `${core.playerLabel(nextActor)} 대기`, "다음 행동", "second")
        : orderBadge(current, `${core.playerLabel(current)}만 행동`, "이번 라운드 단독 행동", "solo");
      els.roundOrderMessage.textContent = nextActor
        ? `현재 행동은 ${core.playerLabel(current)}입니다. 다음 행동은 ${core.playerLabel(nextActor)}입니다.`
        : `이번 라운드는 ${core.playerLabel(current)}만 행동합니다.`;
      els.roundOrderDetail.textContent = result.protectedApplied ? `보호 규칙 적용! ${result.detail}` : result.detail || "";
      return;
    }

    if (state.phase === "feedback") {
      const nextActor = queue[(state.currentActionIndex || 0) + 1];
      els.roundOrderTitle.textContent = nextActor
        ? `다음 행동: ${core.playerLabel(nextActor)}`
        : "이번 라운드 행동 완료";
      els.roundOrderBadges.innerHTML = nextActor
        ? orderBadge(nextActor, `${core.playerLabel(nextActor)} 행동`, "다음 행동", "second")
        : orderBadge(state.currentPlayer, "행동 완료", "다음 라운드로 이동", "none");
      els.roundOrderMessage.textContent = nextActor
        ? `${core.playerLabel(nextActor)}가 이어서 행동합니다.`
        : "이번 라운드의 행동이 끝났습니다.";
      els.roundOrderDetail.textContent = result.protectedApplied ? `보호 규칙 적용! ${result.detail}` : "";
      return;
    }

    els.roundOrderTitle.textContent = result.title || "순서 결정";
    if (result.type === "both-correct") {
      els.roundOrderBadges.innerHTML =
        orderBadge(result.firstActor, `${core.playerLabel(result.firstActor)} 선공`, "먼저 행동", "first") +
        orderBadge(result.secondActor, `${core.playerLabel(result.secondActor)} 후공`, "다음 행동", "second");
    } else if (result.type === "one-correct") {
      els.roundOrderBadges.innerHTML = orderBadge(
        result.firstActor,
        `${core.playerLabel(result.firstActor)}만 행동`,
        "오답자는 자동으로 넘어감",
        "solo"
      );
    } else {
      els.roundOrderBadges.innerHTML = orderBadge(null, "행동 없음", "두 플레이어 모두 오답", "none");
    }
    els.roundOrderMessage.textContent = result.message || "";
    els.roundOrderDetail.textContent = result.protectedApplied ? `보호 규칙 적용! ${result.detail}` : result.detail || "";
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
    const submitter = activeSubmitter();
    if (els.answerLabel) {
      els.answerLabel.textContent = submitter
        ? isOnline()
          ? `내 답 (${core.playerLabel(submitter)})`
          : `${core.playerLabel(submitter)} 정답`
        : "제출 완료";
    }
    els.answerInput.disabled = state.phase !== "question" || !submitter || !canAct();
    const submitButton = els.answerForm.querySelector("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = state.phase !== "question" || !submitter || !canAct();
    }
    if (lastRenderedProblemId !== problem.id) {
      els.answerInput.value = "";
      lastRenderedProblemId = problem.id;
    }

    if (state.phase === "painting") {
      els.timerText.textContent = `${remainingSeconds || core.PAINT_TIME_LIMIT}초`;
    } else if (state.phase === "round-result") {
      els.timerText.textContent = "결과";
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
    const isVisible = state && (state.phase === "feedback" || state.phase === "round-result");
    els.feedbackPanel.hidden = !isVisible;
    if (!isVisible) return;
    if (state.phase === "round-result" && state.roundResult) {
      els.feedbackTitle.textContent = state.roundResult.title;
      els.feedbackMessage.textContent =
        `${state.roundResult.message} 정답은 ${state.problem.answer}입니다. ${state.problem.explanation}`;
      els.continueBtn.textContent = (state.actionQueue || []).length ? "행동 시작" : "다음 라운드";
    } else {
      const nextActor = (state.actionQueue || [])[(state.currentActionIndex || 0) + 1];
      els.feedbackTitle.textContent = state.lastFeedback ? state.lastFeedback.title : "안내";
      els.feedbackMessage.textContent = state.lastFeedback ? state.lastFeedback.message : "";
      els.continueBtn.textContent = nextActor ? "다음 행동" : "다음 라운드";
    }
    els.continueBtn.disabled = !canAct();
  }

  function renderSkipNotice() {
    if (!state || state.phase !== "question") {
      els.skipNotice.hidden = true;
      return;
    }
    const submissions = state.submissions || {};
    const submittedPlayers = core.PLAYER_KEYS.filter((player) => submissions[player]);
    if (isOnline()) {
      const opponent = online.role === "player1" ? "player2" : "player1";
      if (submissions[online.role]) {
        els.skipNotice.hidden = false;
        els.skipNotice.textContent = "제출 완료! 상대가 제출할 때까지 기다려 주세요.";
        return;
      }
      if (submissions[opponent]) {
        els.skipNotice.hidden = false;
        els.skipNotice.textContent = "상대가 답을 제출했습니다.";
        return;
      }
    } else if (submittedPlayers.length === 1) {
      const nextSubmitter = core.PLAYER_KEYS.find((player) => !submissions[player]);
      els.skipNotice.hidden = false;
      els.skipNotice.textContent = `${core.playerLabel(submittedPlayers[0])} 제출 완료! ${core.playerLabel(nextSubmitter)}도 답을 입력하세요.`;
      return;
    }
    els.skipNotice.hidden = true;
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
    let turnText = waiting ? "상대 입장 대기" : "";
    if (!waiting && state) {
      if (state.phase === "question") {
        turnText = hasSubmitted(online.role)
          ? "내 제출 완료, 상대 제출 대기"
          : state.submissions && state.submissions[opponentRole]
            ? "상대 제출 완료, 내 답 제출"
            : "동시 문제 풀이";
      } else if (state.phase === "round-result") {
        turnText = canAct() ? "행동 시작 가능" : "상대가 진행";
      } else if (state.phase === "painting") {
        turnText = `${core.playerLabel(state.currentPlayer)} 색칠 중`;
      } else if (state.phase === "feedback") {
        turnText = canAct() ? "계속 진행 가능" : "상대 확인 중";
      }
    }

    els.onlineGameStatus.hidden = false;
    els.onlineGameStatus.textContent = waiting
      ? `온라인 방 ${online.roomCode} | 나는 ${myLabel}(${online.nickname}) | 상대 학생에게 방 코드를 알려주세요.`
      : `온라인 방 ${online.roomCode} | 나는 ${myLabel}(${online.nickname}) | 상대 ${opponent ? opponent.nickname : "입장 완료"} | ${turnText}`;

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
      els.timerText.textContent = state.phase === "painting" ? "상대 색칠 중" : "상대 제출 대기";
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

    if (shape === "rectangle") {
      const wLabel = label(labels, "w", "가로");
      const hLabel = label(labels, "h", "세로");
      return svgWrap(`
        <rect x="55" y="28" width="150" height="82" rx="2" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${text(130, 22, `${wLabel}cm`)}
        ${text(214, 73, `${hLabel}cm`, "start")}
        ${areaMode ? text(130, 74, "넓이", "middle") : ""}
      `);
    }

    if (shape === "square") {
      const sLabel = label(labels, "s", "한 변");
      return svgWrap(`
        <rect x="78" y="22" width="96" height="96" rx="2" fill="${fill}" stroke="${perimeterStroke}" stroke-width="4" />
        ${text(126, 17, `${sLabel}cm`)}
        ${text(183, 73, `${sLabel}cm`, "start")}
        ${areaMode ? text(126, 74, "넓이", "middle") : ""}
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
