(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.ShapeTerritoryCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const BOARD_SIZE = 20;
  const TURNS_PER_PLAYER = 5;
  const PLAYER_KEYS = ["player1", "player2"];
  const OBSTACLE_COUNTS = { easy: 10, normal: 20, hard: 30 };
  const TIME_LIMITS = { easy: 40, normal: 45, hard: 50 };
  const PAINT_TIME_LIMIT = 20;
  const RPG_PROBLEM_COUNT = 5;
  const RPG_BATTLE_TURN_COUNT = 5;
  const RPG_BASE_HP = 100;
  const RPG_BASE_ATTACK = 10;
  const RPG_BASE_DEFENSE = 10;
  const RPG_CHOICES = ["scissors", "rock", "paper"];
  const NUMBER_RANGES = {
    easy: [2, 9],
    normal: [3, 12],
    hard: [4, 15],
  };
  const ANSWER_RANGES = {
    easy: [8, 60],
    normal: [12, 90],
    hard: [20, 120],
  };
  const SHAPES = {
    rectangle: "직사각형",
    square: "정사각형",
    parallelogram: "평행사변형",
    triangle: "삼각형",
    rhombus: "마름모",
    trapezoid: "사다리꼴",
  };
  const QUESTION_TYPES = {
    perimeter: "둘레",
    area: "넓이",
  };

  let problemSerial = 1;

  function createRng(seed) {
    let value = seed >>> 0;
    return function rng() {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }

  function defaultSettings() {
    return {
      scope: "both",
      shapes: Object.keys(SHAPES),
      difficulty: "normal",
      autoFill: true,
    };
  }

  function normalizeSettings(settings) {
    const base = defaultSettings();
    const merged = Object.assign({}, base, settings || {});
    if (!["perimeter", "area", "both"].includes(merged.scope)) {
      merged.scope = base.scope;
    }
    if (!["easy", "normal", "hard"].includes(merged.difficulty)) {
      merged.difficulty = base.difficulty;
    }
    const allowedShapes = Object.keys(SHAPES);
    merged.shapes = (merged.shapes || []).filter((shape) => allowedShapes.includes(shape));
    if (merged.shapes.length === 0) {
      merged.shapes = allowedShapes.slice();
    }
    merged.autoFill = merged.autoFill !== false;
    return merged;
  }

  function indexOf(row, col) {
    return row * BOARD_SIZE + col;
  }

  function coordsOf(index) {
    return {
      row: Math.floor(index / BOARD_SIZE),
      col: index % BOARD_SIZE,
    };
  }

  function inBounds(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function neighbors(index) {
    const { row, col } = coordsOf(index);
    const result = [];
    [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].forEach(([nextRow, nextCol]) => {
      if (inBounds(nextRow, nextCol)) {
        result.push(indexOf(nextRow, nextCol));
      }
    });
    return result;
  }

  function opponentOf(player) {
    return player === "player1" ? "player2" : "player1";
  }

  function playerLabel(player) {
    return player === "player1" ? "A" : "B";
  }

  function startingCells(player) {
    if (player === "player1") {
      return [indexOf(0, 0), indexOf(0, 1), indexOf(1, 0), indexOf(1, 1)];
    }
    return [indexOf(18, 18), indexOf(18, 19), indexOf(19, 18), indexOf(19, 19)];
  }

  function createBlankBoard() {
    return Array.from({ length: BOARD_SIZE * BOARD_SIZE }, () => "empty");
  }

  function createInitialBoard(difficulty, rng) {
    const random = rng || Math.random;
    const obstacleCount = OBSTACLE_COUNTS[difficulty] || OBSTACLE_COUNTS.normal;
    const startSet = new Set([...startingCells("player1"), ...startingCells("player2")]);
    const forbidden = new Set(startSet);
    startSet.forEach((cell) => neighbors(cell).forEach((next) => forbidden.add(next)));

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const board = createBlankBoard();
      startingCells("player1").forEach((cell) => {
        board[cell] = "player1";
      });
      startingCells("player2").forEach((cell) => {
        board[cell] = "player2";
      });

      const candidates = [];
      for (let i = 0; i < board.length; i += 1) {
        if (!forbidden.has(i)) candidates.push(i);
      }
      shuffle(candidates, random);
      candidates.slice(0, obstacleCount).forEach((cell) => {
        board[cell] = "black";
      });

      if (hasAnyPaintableMoveOnBoard(board, "player1") && hasAnyPaintableMoveOnBoard(board, "player2")) {
        return board;
      }
    }

    const fallback = createBlankBoard();
    startingCells("player1").forEach((cell) => {
      fallback[cell] = "player1";
    });
    startingCells("player2").forEach((cell) => {
      fallback[cell] = "player2";
    });
    return fallback;
  }

  function shuffle(items, rng) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function rangeForDifficulty(difficulty) {
    return NUMBER_RANGES[difficulty] || NUMBER_RANGES.normal;
  }

  function answerRangeForDifficulty(difficulty) {
    return ANSWER_RANGES[difficulty] || ANSWER_RANGES.normal;
  }

  function chooseQuestionType(settings, history, rng) {
    if (settings.scope === "perimeter") return "perimeter";
    if (settings.scope === "area") return "area";
    const counts = { perimeter: 0, area: 0 };
    history.forEach((item) => {
      if (item && counts[item.questionType] !== undefined) {
        counts[item.questionType] += 1;
      }
    });
    const minCount = Math.min(counts.perimeter, counts.area);
    const candidates = ["perimeter", "area"].filter((type) => counts[type] === minCount);
    return candidates[randInt(rng, 0, candidates.length - 1)];
  }

  function chooseShape(settings, history, rng) {
    const shapes = settings.shapes.slice();
    if (shapes.length === 1) return shapes[0];
    const counts = Object.fromEntries(shapes.map((shape) => [shape, 0]));
    history.forEach((item) => {
      if (item && counts[item.shape] !== undefined) {
        counts[item.shape] += 1;
      }
    });
    const minCount = Math.min(...shapes.map((shape) => counts[shape]));
    let candidates = shapes.filter((shape) => counts[shape] === minCount);
    const lastShape = history.length ? history[history.length - 1].shape : "";
    if (candidates.length > 1) {
      candidates = candidates.filter((shape) => shape !== lastShape);
    }
    return candidates[randInt(rng, 0, candidates.length - 1)];
  }

  function generateProblem(settingsInput, historyInput, rngInput) {
    const settings = normalizeSettings(settingsInput);
    const history = historyInput || [];
    const rng = rngInput || Math.random;
    const shape = chooseShape(settings, history, rng);
    const questionType = chooseQuestionType(settings, history, rng);
    const [minAnswer, maxAnswer] = answerRangeForDifficulty(settings.difficulty);
    let fallback = null;
    const recentAnswers = history.slice(-3).map((item) => item.answer);

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const problem = makeProblem(shape, questionType, settings.difficulty, rng);
      fallback = fallback || problem;
      if (Number.isInteger(problem.answer) && problem.answer > 0) {
        if (problem.answer >= minAnswer && problem.answer <= maxAnswer) {
          if (!recentAnswers.includes(problem.answer) || attempt > 60) {
            return problem;
          }
        }
      }
    }
    return fallback || makeProblem(shape, questionType, settings.difficulty, rng);
  }

  function makeProblem(shape, questionType, difficulty, rng) {
    if (questionType === "area") {
      return makeAreaProblem(shape, difficulty, rng);
    }
    return makePerimeterProblem(shape, difficulty, rng);
  }

  function withProblemBase(problem) {
    return Object.assign(
      {
        id: "p" + problemSerial++,
        diagramLabels: {},
      },
      problem
    );
  }

  function makeAreaProblem(shape, difficulty, rng) {
    const [min, max] = rangeForDifficulty(difficulty);
    if (shape === "rectangle") {
      if (difficulty === "easy") {
        const w = randInt(rng, min + 2, max + 2);
        const h = randInt(rng, min, max);
        const answer = w * h;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `직사각형의 가로는 ${w}cm, 세로는 ${h}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "직사각형의 넓이 = 가로 × 세로",
          explanation: `직사각형의 넓이는 가로 × 세로이므로 ${w} × ${h} = ${answer}㎠입니다.`,
          diagramLabels: { w, h },
        });
      }
      if (difficulty === "normal") {
        const w = randInt(rng, min + 4, max + 4);
        const d = randInt(rng, 1, Math.min(5, w - 2));
        const h = w - d;
        const answer = w * h;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `직사각형의 가로는 ${w}cm입니다. 세로는 가로보다 ${d}cm 짧습니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "직사각형의 넓이 = 가로 × 세로",
          explanation: `세로는 ${w} - ${d} = ${h}cm입니다. 넓이는 ${w} × ${h} = ${answer}㎠입니다.`,
          diagramLabels: { w, h: `${w}-${d}` },
        });
      }
      const w = randInt(rng, min + 4, max + 4);
      const h = randInt(rng, min, max);
      const perimeter = 2 * (w + h);
      const answer = w * h;
      return withProblemBase({
        shape,
        questionType: "area",
        difficulty,
        prompt: `직사각형의 둘레는 ${perimeter}cm입니다. 가로는 ${w}cm입니다. 넓이는 몇 ㎠일까요?`,
        answer,
        formulaText: "직사각형의 넓이 = 가로 × 세로",
        explanation: `둘레가 ${perimeter}cm이므로 가로 + 세로는 ${perimeter} ÷ 2 = ${w + h}cm입니다. 세로는 ${w + h} - ${w} = ${h}cm, 넓이는 ${w} × ${h} = ${answer}㎠입니다.`,
        diagramLabels: { w, h: "?" },
      });
    }

    if (shape === "square") {
      if (difficulty === "easy") {
        const s = randInt(rng, min, max);
        const answer = s * s;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `정사각형의 한 변은 ${s}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "정사각형의 넓이 = 한 변 × 한 변",
          explanation: `정사각형의 넓이는 한 변 × 한 변이므로 ${s} × ${s} = ${answer}㎠입니다.`,
          diagramLabels: { s },
        });
      }
      if (difficulty === "normal") {
        const base = randInt(rng, min, max);
        const d = randInt(rng, 1, 4);
        const s = base + d;
        const answer = s * s;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `정사각형의 한 변은 ${base}cm보다 ${d}cm 깁니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "정사각형의 넓이 = 한 변 × 한 변",
          explanation: `한 변은 ${base} + ${d} = ${s}cm입니다. 넓이는 ${s} × ${s} = ${answer}㎠입니다.`,
          diagramLabels: { s: `${base}+${d}` },
        });
      }
      const s = randInt(rng, min + 1, max);
      const longSide = s * 2;
      const answer = s * s;
      return withProblemBase({
        shape,
        questionType: "area",
        difficulty,
        prompt: `같은 크기의 정사각형 2개를 옆으로 붙여 직사각형을 만들었습니다. 만들어진 직사각형의 긴 변은 ${longSide}cm입니다. 처음 정사각형 1개의 넓이는 몇 ㎠일까요?`,
        answer,
        formulaText: "정사각형의 넓이 = 한 변 × 한 변",
        explanation: `정사각형 2개를 붙였으므로 한 변은 ${longSide} ÷ 2 = ${s}cm입니다. 넓이는 ${s} × ${s} = ${answer}㎠입니다.`,
        diagramLabels: { s: "?" },
      });
    }

    if (shape === "parallelogram") {
      if (difficulty === "easy") {
        const b = randInt(rng, min + 2, max + 2);
        const h = randInt(rng, min, max);
        const answer = b * h;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `평행사변형의 밑변은 ${b}cm, 높이는 ${h}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "평행사변형의 넓이 = 밑변 × 높이",
          explanation: `평행사변형의 넓이는 밑변 × 높이이므로 ${b} × ${h} = ${answer}㎠입니다.`,
          diagramLabels: { b, h },
        });
      }
      if (difficulty === "normal") {
        const b = randInt(rng, min + 4, max + 4);
        const d = randInt(rng, 1, Math.min(5, b - 2));
        const h = b - d;
        const answer = b * h;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `평행사변형의 밑변은 ${b}cm입니다. 높이는 밑변보다 ${d}cm 짧습니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "평행사변형의 넓이 = 밑변 × 높이",
          explanation: `높이는 ${b} - ${d} = ${h}cm입니다. 넓이는 ${b} × ${h} = ${answer}㎠입니다.`,
          diagramLabels: { b, h: `${b}-${d}` },
        });
      }
      const b = randInt(rng, min + 4, max + 4);
      const d = randInt(rng, 1, Math.min(5, b - 2));
      const h = b - d;
      const side = randInt(rng, min + 1, max + 3);
      const answer = b * h;
      return withProblemBase({
        shape,
        questionType: "area",
        difficulty,
        prompt: `평행사변형의 밑변은 ${b}cm입니다. 높이는 밑변보다 ${d}cm 짧고, 옆변은 ${side}cm입니다. 넓이는 몇 ㎠일까요?`,
        answer,
        formulaText: "평행사변형의 넓이 = 밑변 × 높이",
        explanation: `넓이를 구할 때는 옆변이 아니라 높이를 씁니다. 높이는 ${b} - ${d} = ${h}cm이므로 넓이는 ${b} × ${h} = ${answer}㎠입니다.`,
        diagramLabels: { b, h: `${b}-${d}`, side },
      });
    }

    if (shape === "triangle") {
      if (difficulty === "easy") {
        const pair = evenProductPair(rng, min + 2, max + 4, min, max);
        const b = pair[0];
        const h = pair[1];
        const answer = (b * h) / 2;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `삼각형의 밑변은 ${b}cm, 높이는 ${h}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "삼각형의 넓이 = 밑변 × 높이 ÷ 2",
          explanation: `삼각형의 넓이는 밑변 × 높이 ÷ 2이므로 ${b} × ${h} ÷ 2 = ${answer}㎠입니다.`,
          diagramLabels: { b, h },
        });
      }
      if (difficulty === "normal") {
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const b = randInt(rng, min + 4, max + 4);
          const d = randInt(rng, 1, Math.min(5, b - 2));
          const h = b - d;
          if ((b * h) % 2 === 0) {
            const answer = (b * h) / 2;
            return withProblemBase({
              shape,
              questionType: "area",
              difficulty,
              prompt: `삼각형의 밑변은 ${b}cm입니다. 높이는 밑변보다 ${d}cm 짧습니다. 넓이는 몇 ㎠일까요?`,
              answer,
              formulaText: "삼각형의 넓이 = 밑변 × 높이 ÷ 2",
              explanation: `높이는 ${b} - ${d} = ${h}cm입니다. 넓이는 ${b} × ${h} ÷ 2 = ${answer}㎠입니다.`,
              diagramLabels: { b, h: `${b}-${d}` },
            });
          }
        }
      }
      const paraArea = randInt(rng, 12, 60) * 2;
      const answer = paraArea / 2;
      return withProblemBase({
        shape,
        questionType: "area",
        difficulty,
        prompt: `어떤 평행사변형의 넓이는 ${paraArea}㎠입니다. 이 평행사변형과 밑변과 높이가 같은 삼각형의 넓이는 몇 ㎠일까요?`,
        answer,
        formulaText: "같은 밑변과 높이에서 삼각형의 넓이는 평행사변형의 절반",
        explanation: `같은 밑변과 높이를 가진 삼각형의 넓이는 평행사변형 넓이의 절반입니다. ${paraArea} ÷ 2 = ${answer}㎠입니다.`,
        diagramLabels: { b: "같음", h: "같음" },
      });
    }

    if (shape === "rhombus") {
      if (difficulty === "easy") {
        const pair = evenProductPair(rng, min + 2, max + 5, min + 1, max + 4);
        const d1 = pair[0];
        const d2 = pair[1];
        const answer = (d1 * d2) / 2;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `마름모의 두 대각선은 각각 ${d1}cm, ${d2}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "마름모의 넓이 = 두 대각선의 곱 ÷ 2",
          explanation: `마름모의 넓이는 두 대각선의 곱을 2로 나누므로 ${d1} × ${d2} ÷ 2 = ${answer}㎠입니다.`,
          diagramLabels: { d1, d2 },
        });
      }
      if (difficulty === "normal") {
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const d1 = randInt(rng, min + 5, max + 6);
          const gap = randInt(rng, 1, 5);
          const d2 = d1 - gap;
          if (d2 > 0 && (d1 * d2) % 2 === 0) {
            const answer = (d1 * d2) / 2;
            return withProblemBase({
              shape,
              questionType: "area",
              difficulty,
              prompt: `마름모의 한 대각선은 ${d1}cm입니다. 다른 대각선은 이 대각선보다 ${gap}cm 짧습니다. 넓이는 몇 ㎠일까요?`,
              answer,
              formulaText: "마름모의 넓이 = 두 대각선의 곱 ÷ 2",
              explanation: `다른 대각선은 ${d1} - ${gap} = ${d2}cm입니다. 넓이는 ${d1} × ${d2} ÷ 2 = ${answer}㎠입니다.`,
              diagramLabels: { d1, d2: `${d1}-${gap}` },
            });
          }
        }
      }
      const d1 = randInt(rng, min + 4, max + 5);
      const halfD2 = randInt(rng, min, max);
      const d2 = halfD2 * 2;
      const answer = (d1 * d2) / 2;
      return withProblemBase({
        shape,
        questionType: "area",
        difficulty,
        prompt: `마름모의 한 대각선은 ${d1}cm입니다. 다른 대각선의 절반은 ${halfD2}cm입니다. 넓이는 몇 ㎠일까요?`,
        answer,
        formulaText: "마름모의 넓이 = 두 대각선의 곱 ÷ 2",
        explanation: `다른 대각선 전체는 ${halfD2} × 2 = ${d2}cm입니다. 넓이는 ${d1} × ${d2} ÷ 2 = ${answer}㎠입니다.`,
        diagramLabels: { d1, d2: `${halfD2}×2` },
      });
    }

    if (shape === "trapezoid") {
      if (difficulty === "easy") {
        const values = trapezoidEvenValues(rng, min, max);
        const answer = ((values.top + values.bottom) * values.h) / 2;
        return withProblemBase({
          shape,
          questionType: "area",
          difficulty,
          prompt: `사다리꼴의 윗변은 ${values.top}cm, 아랫변은 ${values.bottom}cm, 높이는 ${values.h}cm입니다. 넓이는 몇 ㎠일까요?`,
          answer,
          formulaText: "사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2",
          explanation: `사다리꼴의 넓이는 (${values.top} + ${values.bottom}) × ${values.h} ÷ 2 = ${answer}㎠입니다.`,
          diagramLabels: values,
        });
      }
      if (difficulty === "normal") {
        for (let attempt = 0; attempt < 40; attempt += 1) {
          const top = randInt(rng, min, max);
          const gap = randInt(rng, 2, 7);
          const bottom = top + gap;
          const h = randInt(rng, min, max);
          if (((top + bottom) * h) % 2 === 0) {
            const answer = ((top + bottom) * h) / 2;
            return withProblemBase({
              shape,
              questionType: "area",
              difficulty,
              prompt: `사다리꼴의 윗변은 ${top}cm입니다. 아랫변은 윗변보다 ${gap}cm 깁니다. 높이는 ${h}cm입니다. 넓이는 몇 ㎠일까요?`,
              answer,
              formulaText: "사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2",
              explanation: `아랫변은 ${top} + ${gap} = ${bottom}cm입니다. 넓이는 (${top} + ${bottom}) × ${h} ÷ 2 = ${answer}㎠입니다.`,
              diagramLabels: { top, bottom: `${top}+${gap}`, h },
            });
          }
        }
      }
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const top = randInt(rng, min + 2, max);
        const bottom = top * 2;
        const d = randInt(rng, 1, Math.min(5, top - 1));
        const h = top - d;
        if (h > 0 && ((top + bottom) * h) % 2 === 0) {
          const answer = ((top + bottom) * h) / 2;
          return withProblemBase({
            shape,
            questionType: "area",
            difficulty,
            prompt: `사다리꼴의 윗변은 ${top}cm입니다. 아랫변은 윗변의 2배입니다. 높이는 윗변보다 ${d}cm 짧습니다. 넓이는 몇 ㎠일까요?`,
            answer,
            formulaText: "사다리꼴의 넓이 = (윗변 + 아랫변) × 높이 ÷ 2",
            explanation: `아랫변은 ${top} × 2 = ${bottom}cm, 높이는 ${top} - ${d} = ${h}cm입니다. 넓이는 (${top} + ${bottom}) × ${h} ÷ 2 = ${answer}㎠입니다.`,
            diagramLabels: { top, bottom: `${top}×2`, h: `${top}-${d}` },
          });
        }
      }
    }

    return makeAreaProblem("rectangle", "easy", rng);
  }

  function makePerimeterProblem(shape, difficulty, rng) {
    const [min, max] = rangeForDifficulty(difficulty);
    if (shape === "rectangle") {
      if (difficulty === "easy") {
        const w = randInt(rng, min + 2, max + 3);
        const h = randInt(rng, min, max);
        const answer = 2 * (w + h);
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `직사각형의 가로는 ${w}cm, 세로는 ${h}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "직사각형의 둘레 = (가로 + 세로) × 2",
          explanation: `직사각형의 둘레는 (가로 + 세로) × 2이므로 (${w} + ${h}) × 2 = ${answer}cm입니다.`,
          diagramLabels: { w, h },
        });
      }
      if (difficulty === "normal") {
        const w = randInt(rng, min + 4, max + 4);
        const d = randInt(rng, 1, Math.min(5, w - 2));
        const h = w - d;
        const answer = 2 * (w + h);
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `직사각형의 가로는 ${w}cm입니다. 세로는 가로보다 ${d}cm 짧습니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "직사각형의 둘레 = (가로 + 세로) × 2",
          explanation: `세로는 ${w} - ${d} = ${h}cm입니다. 둘레는 (${w} + ${h}) × 2 = ${answer}cm입니다.`,
          diagramLabels: { w, h: `${w}-${d}` },
        });
      }
      const sum = randInt(rng, min + 8, max + 10);
      const answer = sum * 2;
      return withProblemBase({
        shape,
        questionType: "perimeter",
        difficulty,
        prompt: `직사각형의 가로와 세로의 합은 ${sum}cm입니다. 이 직사각형의 둘레는 몇 cm일까요?`,
        answer,
        formulaText: "직사각형의 둘레 = (가로 + 세로) × 2",
        explanation: `가로와 세로의 합이 ${sum}cm이므로 둘레는 ${sum} × 2 = ${answer}cm입니다.`,
        diagramLabels: { w: "?", h: "?", sum },
      });
    }

    if (shape === "square") {
      if (difficulty === "easy") {
        const s = randInt(rng, min, max + 2);
        const answer = 4 * s;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `정사각형의 한 변은 ${s}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "정사각형의 둘레 = 한 변 × 4",
          explanation: `정사각형은 네 변의 길이가 모두 같으므로 ${s} × 4 = ${answer}cm입니다.`,
          diagramLabels: { s },
        });
      }
      if (difficulty === "normal") {
        const base = randInt(rng, min, max);
        const d = randInt(rng, 1, 5);
        const s = base + d;
        const answer = 4 * s;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `정사각형의 한 변은 ${base}cm보다 ${d}cm 깁니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "정사각형의 둘레 = 한 변 × 4",
          explanation: `한 변은 ${base} + ${d} = ${s}cm입니다. 둘레는 ${s} × 4 = ${answer}cm입니다.`,
          diagramLabels: { s: `${base}+${d}` },
        });
      }
      const s = randInt(rng, min + 1, max + 2);
      const longSide = s * 2;
      const answer = 4 * s;
      return withProblemBase({
        shape,
        questionType: "perimeter",
        difficulty,
        prompt: `같은 크기의 정사각형 2개를 옆으로 붙여 직사각형을 만들었습니다. 만들어진 직사각형의 긴 변은 ${longSide}cm입니다. 처음 정사각형 1개의 둘레는 몇 cm일까요?`,
        answer,
        formulaText: "정사각형의 둘레 = 한 변 × 4",
        explanation: `정사각형 2개를 붙였으므로 한 변은 ${longSide} ÷ 2 = ${s}cm입니다. 둘레는 ${s} × 4 = ${answer}cm입니다.`,
        diagramLabels: { s: "?" },
      });
    }

    if (shape === "parallelogram") {
      if (difficulty === "easy") {
        const b = randInt(rng, min + 2, max + 3);
        const side = randInt(rng, min, max);
        const answer = 2 * (b + side);
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `평행사변형의 밑변은 ${b}cm, 옆변은 ${side}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "평행사변형의 둘레 = (밑변 + 옆변) × 2",
          explanation: `평행사변형의 둘레는 마주 보는 변이 같으므로 (${b} + ${side}) × 2 = ${answer}cm입니다.`,
          diagramLabels: { b, side },
        });
      }
      if (difficulty === "normal") {
        const b = randInt(rng, min + 4, max + 4);
        const d = randInt(rng, 1, Math.min(5, b - 2));
        const side = b - d;
        const answer = 2 * (b + side);
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `평행사변형의 밑변은 ${b}cm입니다. 옆변은 밑변보다 ${d}cm 짧습니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "평행사변형의 둘레 = (밑변 + 옆변) × 2",
          explanation: `옆변은 ${b} - ${d} = ${side}cm입니다. 둘레는 (${b} + ${side}) × 2 = ${answer}cm입니다.`,
          diagramLabels: { b, side: `${b}-${d}` },
        });
      }
      const b = randInt(rng, min + 3, max + 5);
      const side = randInt(rng, min + 1, max + 3);
      const h = randInt(rng, min, max);
      const answer = 2 * (b + side);
      return withProblemBase({
        shape,
        questionType: "perimeter",
        difficulty,
        prompt: `평행사변형의 밑변은 ${b}cm, 옆변은 ${side}cm, 높이는 ${h}cm입니다. 둘레는 몇 cm일까요?`,
        answer,
        formulaText: "평행사변형의 둘레 = (밑변 + 옆변) × 2",
        explanation: `둘레를 구할 때는 높이를 쓰지 않고 바깥 변의 길이를 더합니다. (${b} + ${side}) × 2 = ${answer}cm입니다.`,
        diagramLabels: { b, side, h },
      });
    }

    if (shape === "triangle") {
      if (difficulty === "easy") {
        const sides = validTriangleSides(rng, min, max + 5);
        const answer = sides.a + sides.b + sides.c;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `삼각형의 세 변은 각각 ${sides.a}cm, ${sides.b}cm, ${sides.c}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "삼각형의 둘레 = 세 변의 길이의 합",
          explanation: `삼각형의 둘레는 세 변을 모두 더하므로 ${sides.a} + ${sides.b} + ${sides.c} = ${answer}cm입니다.`,
          diagramLabels: sides,
        });
      }
      if (difficulty === "normal") {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const a = randInt(rng, min + 1, max + 4);
          const b = randInt(rng, min + 1, max + 4);
          const d = randInt(rng, 1, 5);
          const c = b + d;
          if (isValidTriangle(a, b, c)) {
            const answer = a + b + c;
            return withProblemBase({
              shape,
              questionType: "perimeter",
              difficulty,
              prompt: `삼각형의 두 변은 각각 ${a}cm, ${b}cm입니다. 나머지 한 변은 ${b}cm보다 ${d}cm 깁니다. 둘레는 몇 cm일까요?`,
              answer,
              formulaText: "삼각형의 둘레 = 세 변의 길이의 합",
              explanation: `나머지 한 변은 ${b} + ${d} = ${c}cm입니다. 둘레는 ${a} + ${b} + ${c} = ${answer}cm입니다.`,
              diagramLabels: { a, b, c: `${b}+${d}` },
            });
          }
        }
      }
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const same = randInt(rng, min + 2, max + 5);
        const base = randInt(rng, min + 1, max + 4);
        if (same + same > base) {
          const answer = same + same + base;
          return withProblemBase({
            shape,
            questionType: "perimeter",
            difficulty,
            prompt: `이등변삼각형이 있습니다. 같은 길이의 두 변은 각각 ${same}cm이고, 나머지 한 변은 ${base}cm입니다. 둘레는 몇 cm일까요?`,
            answer,
            formulaText: "삼각형의 둘레 = 세 변의 길이의 합",
            explanation: `이등변삼각형도 둘레는 세 변의 합입니다. ${same} + ${same} + ${base} = ${answer}cm입니다.`,
            diagramLabels: { a: same, b: same, c: base },
          });
        }
      }
    }

    if (shape === "rhombus") {
      if (difficulty === "easy") {
        const s = randInt(rng, min, max + 3);
        const answer = 4 * s;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `마름모의 한 변은 ${s}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "마름모의 둘레 = 한 변 × 4",
          explanation: `마름모는 네 변의 길이가 모두 같으므로 ${s} × 4 = ${answer}cm입니다.`,
          diagramLabels: { s },
        });
      }
      if (difficulty === "normal") {
        const base = randInt(rng, min, max + 2);
        const d = randInt(rng, 1, 5);
        const s = base + d;
        const answer = 4 * s;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `마름모의 한 변은 ${base}cm보다 ${d}cm 깁니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "마름모의 둘레 = 한 변 × 4",
          explanation: `한 변은 ${base} + ${d} = ${s}cm입니다. 마름모의 둘레는 ${s} × 4 = ${answer}cm입니다.`,
          diagramLabels: { s: `${base}+${d}` },
        });
      }
      const s = randInt(rng, min + 1, max + 4);
      const answer = 4 * s;
      return withProblemBase({
        shape,
        questionType: "perimeter",
        difficulty,
        prompt: `마름모는 네 변의 길이가 모두 같습니다. 한 변의 길이가 ${s}cm일 때 마름모의 둘레는 몇 cm일까요?`,
        answer,
        formulaText: "마름모의 둘레 = 한 변 × 4",
        explanation: `마름모는 네 변의 길이가 모두 같으므로 한 변의 길이를 4번 더합니다. ${s} × 4 = ${answer}cm입니다.`,
        diagramLabels: { s },
      });
    }

    if (shape === "trapezoid") {
      if (difficulty === "easy") {
        const top = randInt(rng, min, max);
        const bottom = randInt(rng, top + 1, max + 6);
        const left = randInt(rng, min, max + 2);
        const right = randInt(rng, min, max + 2);
        const answer = top + bottom + left + right;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `사다리꼴의 네 변은 각각 ${top}cm, ${bottom}cm, ${left}cm, ${right}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "사다리꼴의 둘레 = 네 변의 길이의 합",
          explanation: `사다리꼴의 둘레는 네 변을 모두 더하므로 ${top} + ${bottom} + ${left} + ${right} = ${answer}cm입니다.`,
          diagramLabels: { top, bottom, left, right },
        });
      }
      if (difficulty === "normal") {
        const top = randInt(rng, min, max);
        const gap = randInt(rng, 2, 7);
        const bottom = top + gap;
        const left = randInt(rng, min + 1, max + 2);
        const right = randInt(rng, min + 1, max + 2);
        const answer = top + bottom + left + right;
        return withProblemBase({
          shape,
          questionType: "perimeter",
          difficulty,
          prompt: `사다리꼴의 윗변은 ${top}cm입니다. 아랫변은 윗변보다 ${gap}cm 깁니다. 두 옆변은 각각 ${left}cm, ${right}cm입니다. 둘레는 몇 cm일까요?`,
          answer,
          formulaText: "사다리꼴의 둘레 = 네 변의 길이의 합",
          explanation: `아랫변은 ${top} + ${gap} = ${bottom}cm입니다. 둘레는 ${top} + ${bottom} + ${left} + ${right} = ${answer}cm입니다.`,
          diagramLabels: { top, bottom: `${top}+${gap}`, left, right },
        });
      }
      const top = randInt(rng, min, max);
      const gap = randInt(rng, 2, 7);
      const bottom = top + gap;
      const side = randInt(rng, min + 1, max + 3);
      const h = randInt(rng, min, max);
      const answer = top + bottom + side + side;
      return withProblemBase({
        shape,
        questionType: "perimeter",
        difficulty,
        prompt: `사다리꼴의 윗변은 ${top}cm입니다. 아랫변은 윗변보다 ${gap}cm 깁니다. 두 옆변은 각각 ${side}cm로 같습니다. 높이는 ${h}cm입니다. 둘레는 몇 cm일까요?`,
        answer,
        formulaText: "사다리꼴의 둘레 = 네 변의 길이의 합",
        explanation: `둘레를 구할 때는 높이를 쓰지 않고 바깥쪽 변을 더합니다. 아랫변은 ${top} + ${gap} = ${bottom}cm, 둘레는 ${top} + ${bottom} + ${side} + ${side} = ${answer}cm입니다.`,
        diagramLabels: { top, bottom: `${top}+${gap}`, left: side, right: side, h },
      });
    }

    return makePerimeterProblem("rectangle", "easy", rng);
  }

  function evenProductPair(rng, aMin, aMax, bMin, bMax) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const a = randInt(rng, aMin, aMax);
      const b = randInt(rng, bMin, bMax);
      if ((a * b) % 2 === 0) return [a, b];
    }
    return [aMin % 2 === 0 ? aMin : aMin + 1, bMin];
  }

  function trapezoidEvenValues(rng, min, max) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const top = randInt(rng, min, max);
      const bottom = randInt(rng, top + 1, max + 6);
      const h = randInt(rng, min, max);
      if (((top + bottom) * h) % 2 === 0) {
        return { top, bottom, h };
      }
    }
    return { top: 4, bottom: 8, h: 6 };
  }

  function validTriangleSides(rng, min, max) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const a = randInt(rng, min, max);
      const b = randInt(rng, min, max);
      const c = randInt(rng, min, max);
      if (isValidTriangle(a, b, c)) {
        return { a, b, c };
      }
    }
    return { a: 6, b: 7, c: 8 };
  }

  function isValidTriangle(a, b, c) {
    return a + b > c && a + c > b && b + c > a;
  }

  function createEmptySubmissions() {
    return { player1: null, player2: null };
  }

  function normalizeSubmission(player, answerInput, problem, submittedAt, timedOut) {
    const rawAnswer = timedOut ? "" : String(answerInput == null ? "" : answerInput).trim();
    const answer = Number(rawAnswer);
    const hasIntegerAnswer = Number.isInteger(answer);
    return {
      player,
      answer: hasIntegerAnswer ? answer : null,
      correct: !timedOut && hasIntegerAnswer && answer === problem.answer,
      timedOut: Boolean(timedOut),
      submittedAt: Number.isFinite(submittedAt) ? submittedAt : Date.now(),
    };
  }

  function playerSubmitted(state, player) {
    return Boolean(state && state.submissions && state.submissions[player]);
  }

  function allPlayersSubmitted(state) {
    return PLAYER_KEYS.every((player) => playerSubmitted(state, player));
  }

  function chooseTieFirstActor(state) {
    if (state.lastFirstActor) return opponentOf(state.lastFirstActor);
    return "player1";
  }

  function fasterCorrectPlayer(state) {
    const a = state.submissions.player1;
    const b = state.submissions.player2;
    const aTime = Number.isFinite(a && a.submittedAt) ? a.submittedAt : Infinity;
    const bTime = Number.isFinite(b && b.submittedAt) ? b.submittedAt : Infinity;
    if (aTime < bTime) return "player1";
    if (bTime < aTime) return "player2";
    return chooseTieFirstActor(state);
  }

  function updateFirstActorStreak(state, firstActor) {
    if (!firstActor) {
      return {
        lastFirstActor: state.lastFirstActor || null,
        consecutiveFirstActorCount: state.consecutiveFirstActorCount || 0,
      };
    }
    if (state.lastFirstActor === firstActor) {
      return {
        lastFirstActor: firstActor,
        consecutiveFirstActorCount: (state.consecutiveFirstActorCount || 0) + 1,
      };
    }
    return {
      lastFirstActor: firstActor,
      consecutiveFirstActorCount: 1,
    };
  }

  function submissionLabel(submission) {
    if (!submission) return "미제출";
    if (submission.timedOut) return "시간 초과";
    return submission.correct ? "정답" : "오답";
  }

  function resolveRoundSubmissions(state) {
    const correctPlayers = PLAYER_KEYS.filter((player) => state.submissions[player] && state.submissions[player].correct);
    let actionQueue = [];
    let firstActor = null;
    let secondActor = null;
    let protectedApplied = false;
    let protectedPlayer = null;
    let title = "";
    let message = "";
    let detail = "";
    let resultType = "both-wrong";

    if (correctPlayers.length === 2) {
      const candidate = fasterCorrectPlayer(state);
      firstActor = candidate;
      secondActor = opponentOf(candidate);
      if (state.lastFirstActor === candidate && (state.consecutiveFirstActorCount || 0) >= 2) {
        protectedApplied = true;
        protectedPlayer = candidate;
        firstActor = opponentOf(candidate);
        secondActor = candidate;
      }
      actionQueue = [firstActor, secondActor];
      resultType = "both-correct";
      title = `${playerLabel(firstActor)} 선공!`;
      message = `이번 라운드 선공은 ${playerLabel(firstActor)}, 후공은 ${playerLabel(secondActor)}입니다.`;
      detail = protectedApplied
        ? `${playerLabel(protectedPlayer)}가 연속으로 먼저 행동했기 때문에 이번 라운드는 ${playerLabel(firstActor)}가 먼저 행동합니다.`
        : `두 플레이어 모두 정답입니다. 더 빨리 제출한 ${playerLabel(candidate)}가 기본 선공 후보였습니다.`;
    } else if (correctPlayers.length === 1) {
      firstActor = correctPlayers[0];
      actionQueue = [firstActor];
      resultType = "one-correct";
      title = `${playerLabel(firstActor)}만 행동합니다!`;
      message = `${playerLabel(firstActor)} 정답! ${playerLabel(opponentOf(firstActor))}는 오답이라 이번 라운드에는 행동할 수 없습니다.`;
      detail = "한 명만 정답인 라운드는 보호 규칙을 적용하지 않습니다.";
    } else {
      resultType = "both-wrong";
      title = "이번 라운드는 행동 없음";
      message = "두 플레이어 모두 오답입니다. 이번 라운드는 행동 없이 넘어갑니다.";
      detail = "아무도 행동하지 않으므로 연속 먼저 행동 기록은 그대로 유지됩니다.";
    }

    const streak = updateFirstActorStreak(state, firstActor);
    return cloneState(state, {
      phase: "round-result",
      currentPlayer: firstActor || state.currentPlayer || "player1",
      actionQueue,
      currentActionIndex: 0,
      lastFirstActor: streak.lastFirstActor,
      consecutiveFirstActorCount: streak.consecutiveFirstActorCount,
      selection: [],
      earnedCells: 0,
      roundResult: {
        type: resultType,
        title,
        message,
        detail,
        actionQueue: actionQueue.slice(),
        firstActor,
        secondActor,
        protectedApplied,
        protectedPlayer,
        submissions: {
          player1: Object.assign({}, state.submissions.player1),
          player2: Object.assign({}, state.submissions.player2),
        },
        submissionLabels: {
          player1: submissionLabel(state.submissions.player1),
          player2: submissionLabel(state.submissions.player2),
        },
      },
      lastFeedback: {
        type: "round-result",
        title,
        message: detail ? `${message} ${detail}` : message,
      },
    });
  }

  function createGameState(settingsInput, rngInput) {
    const settings = normalizeSettings(settingsInput);
    const rng = rngInput || Math.random;
    const board = createInitialBoard(settings.difficulty, rng);
    const problem = generateProblem(settings, [], rng);
    return {
      gameMode: "territory",
      settings,
      board,
      currentPlayer: "player1",
      turnCounts: { player1: 0, player2: 0 },
      roundIndex: 0,
      phase: "question",
      problem,
      problemHistory: [problem],
      submissions: createEmptySubmissions(),
      actionQueue: [],
      currentActionIndex: 0,
      lastFirstActor: null,
      consecutiveFirstActorCount: 0,
      roundResult: null,
      earnedCells: 0,
      selection: [],
      lastFeedback: null,
      skippedTurns: [],
    };
  }

  function cloneState(state, overrides) {
    return Object.assign(
      {},
      state,
      {
        board: state.board.slice(),
        turnCounts: Object.assign({}, state.turnCounts),
        submissions: Object.assign(createEmptySubmissions(), state.submissions || {}),
        actionQueue: (state.actionQueue || []).slice(),
        problemHistory: state.problemHistory.slice(),
        selection: state.selection.slice(),
        skippedTurns: (state.skippedTurns || []).slice(),
      },
      overrides || {}
    );
  }

  function submitAnswer(state, playerOrAnswer, answerInput, submittedAt) {
    if (state.phase !== "question" || !state.problem) return state;
    const player = PLAYER_KEYS.includes(playerOrAnswer) ? playerOrAnswer : state.currentPlayer || "player1";
    const rawAnswer = PLAYER_KEYS.includes(playerOrAnswer) ? answerInput : playerOrAnswer;
    if (playerSubmitted(state, player)) return state;

    const submissions = Object.assign(createEmptySubmissions(), state.submissions || {});
    submissions[player] = normalizeSubmission(player, rawAnswer, state.problem, submittedAt, false);
    const next = cloneState(state, {
      submissions,
      lastFeedback: {
        type: "submitted",
        title: "제출 완료!",
        message: "상대가 제출할 때까지 기다려 주세요.",
      },
    });
    if (allPlayersSubmitted(next)) {
      return resolveRoundSubmissions(next);
    }
    return next;
  }

  function timeOutTurn(state) {
    if (state.phase !== "question" || !state.problem) return state;
    const submissions = Object.assign(createEmptySubmissions(), state.submissions || {});
    PLAYER_KEYS.forEach((player) => {
      if (!submissions[player]) {
        submissions[player] = normalizeSubmission(player, "", state.problem, Infinity, true);
      }
    });
    return resolveRoundSubmissions(
      cloneState(state, {
        submissions,
        lastFeedback: {
          type: "timeout",
          title: "시간이 끝났습니다",
          message: `정답은 ${state.problem.answer}입니다. ${state.problem.explanation}`,
        },
      })
    );
  }

  function cellRefToIndex(cell) {
    if (typeof cell === "number") return cell;
    if (cell && typeof cell.row === "number" && typeof cell.col === "number") {
      return indexOf(cell.row, cell.col);
    }
    return -1;
  }

  function uniqueValidIndices(cells) {
    const result = [];
    const seen = new Set();
    (cells || []).forEach((cell) => {
      const index = cellRefToIndex(cell);
      if (index >= 0 && index < BOARD_SIZE * BOARD_SIZE && !seen.has(index)) {
        seen.add(index);
        result.push(index);
      }
    });
    return result;
  }

  function isAdjacentToAny(cell, set) {
    return neighbors(cell).some((next) => set.has(next));
  }

  function ownCellSet(board, player) {
    const set = new Set();
    board.forEach((cell, index) => {
      if (cell === player) set.add(index);
    });
    return set;
  }

  function connectedEmptySelection(board, player, candidateSet) {
    const own = ownCellSet(board, player);
    const queue = [];
    const visited = new Set();
    const order = [];

    candidateSet.forEach((cell) => {
      if (board[cell] === "empty" && isAdjacentToAny(cell, own)) {
        visited.add(cell);
        queue.push(cell);
        order.push(cell);
      }
    });

    while (queue.length > 0) {
      const cell = queue.shift();
      neighbors(cell).forEach((next) => {
        if (!visited.has(next) && candidateSet.has(next) && board[next] === "empty") {
          visited.add(next);
          queue.push(next);
          order.push(next);
        }
      });
    }

    return { set: visited, order };
  }

  function selectCells(state, selectionInput) {
    if (state.phase !== "painting") return state;
    const candidateOrder = uniqueValidIndices(selectionInput);
    const candidateSet = new Set(candidateOrder);
    const player = state.currentPlayer;
    const opponent = opponentOf(player);
    const earned = Math.max(0, state.earnedCells || 0);
    const neutralizeLimit = Math.floor(earned / 2);
    const connected = connectedEmptySelection(state.board, player, candidateSet);
    const own = ownCellSet(state.board, player);
    const emptyBridgeSet = new Set([...own, ...connected.set]);
    const selected = [];
    const selectedSet = new Set();
    let neutralized = 0;

    connected.order.forEach((cell) => {
      if (selected.length < earned && !selectedSet.has(cell)) {
        selected.push(cell);
        selectedSet.add(cell);
      }
    });

    candidateOrder.forEach((cell) => {
      if (selected.length >= earned) return;
      if (state.board[cell] !== opponent) return;
      if (neutralized >= neutralizeLimit) return;
      if (!isAdjacentToAny(cell, emptyBridgeSet)) return;
      selected.push(cell);
      selectedSet.add(cell);
      neutralized += 1;
    });

    return cloneState(state, { selection: selected });
  }

  function toggleCell(state, cellRef) {
    if (state.phase !== "painting") return state;
    const cell = cellRefToIndex(cellRef);
    if (cell < 0 || cell >= BOARD_SIZE * BOARD_SIZE) return state;
    if (state.selection.includes(cell)) return state;
    return selectCells(state, state.selection.concat(cell));
  }

  function clearSelection(state) {
    if (state.phase !== "painting") return state;
    return cloneState(state, { selection: [] });
  }

  function selectionStats(state) {
    const player = state.currentPlayer;
    const opponent = opponentOf(player);
    let paintedCells = 0;
    let neutralizedCells = 0;
    state.selection.forEach((cell) => {
      if (state.board[cell] === "empty") paintedCells += 1;
      if (state.board[cell] === opponent) neutralizedCells += 1;
    });
    const usedCells = paintedCells + neutralizedCells;
    return {
      earnedCells: state.earnedCells || 0,
      paintedCells,
      neutralizedCells,
      usedCells,
      neutralizeLimit: Math.floor((state.earnedCells || 0) / 2),
      remainingCells: Math.max(0, (state.earnedCells || 0) - usedCells),
    };
  }

  function confirmPainting(state, options) {
    if (state.phase !== "painting") return state;
    const settings = options || {};
    const next = cloneState(state);
    const player = state.currentPlayer;
    const opponent = opponentOf(player);
    const stats = selectionStats(next);

    next.selection.forEach((cell) => {
      if (next.board[cell] === "empty") next.board[cell] = player;
      if (next.board[cell] === opponent) next.board[cell] = "black";
    });
    next.turnCounts[player] = Math.min(TURNS_PER_PLAYER, (next.turnCounts[player] || 0) + 1);
    next.phase = "feedback";
    next.selection = [];
    next.earnedCells = 0;
    next.lastFeedback = {
      type: settings.timedOut ? "paint-timeout" : "painted",
      title: settings.timedOut ? "색칠 시간이 끝났습니다" : "색칠이 확정되었습니다",
      message: `${stats.paintedCells}칸을 칠하고 ${stats.neutralizedCells}칸을 중립화했습니다. 남은 ${stats.remainingCells} 에너지는 사용하지 않았습니다.`,
    };
    return next;
  }

  function autoFillSelection(state) {
    if (state.phase !== "painting") return [];
    const player = state.currentPlayer;
    const earned = state.earnedCells || 0;
    const visited = new Set();
    const queue = [];
    const result = [];

    state.board.forEach((cell, index) => {
      if (cell === player) {
        visited.add(index);
        queue.push(index);
      }
    });

    while (queue.length > 0 && result.length < earned) {
      const cell = queue.shift();
      neighbors(cell).forEach((next) => {
        if (visited.has(next)) return;
        visited.add(next);
        if (state.board[next] === "empty") {
          result.push(next);
          queue.push(next);
        }
      });
    }
    return result;
  }

  function hasAnyPaintableMoveOnBoard(board, player) {
    const opponent = opponentOf(player);
    for (let i = 0; i < board.length; i += 1) {
      if (board[i] !== player) continue;
      for (const next of neighbors(i)) {
        if (board[next] === "empty" || board[next] === opponent) {
          return true;
        }
      }
    }
    return false;
  }

  function hasAnyPaintableMove(state, player) {
    return hasAnyPaintableMoveOnBoard(state.board, player);
  }

  function isGameOver(state) {
    const turnsDone = (state.roundIndex || 0) >= TURNS_PER_PLAYER;
    const noMoves = PLAYER_KEYS.every((player) => !hasAnyPaintableMove(state, player));
    return turnsDone || noMoves;
  }

  function createNextRound(state, rng) {
    const nextRoundIndex = (state.roundIndex || 0) + 1;
    const next = cloneState(state, {
      roundIndex: nextRoundIndex,
      selection: [],
      earnedCells: 0,
      submissions: createEmptySubmissions(),
      actionQueue: [],
      currentActionIndex: 0,
      roundResult: null,
      skippedTurns: [],
    });
    if (isGameOver(next)) {
      next.phase = "gameover";
      next.problem = null;
      next.lastFeedback = {
        type: "gameover",
        title: "게임 종료",
        message: "모든 라운드가 끝났거나 더 이상 칠할 수 있는 칸이 없습니다.",
      };
      return next;
    }
    const problem = generateProblem(next.settings, next.problemHistory, rng);
    next.problem = problem;
    next.problemHistory.push(problem);
    next.currentPlayer = next.lastFirstActor || "player1";
    next.phase = "question";
    next.lastFeedback = null;
    return next;
  }

  function nextTurn(state, rngInput) {
    const rng = rngInput || Math.random;
    if (state.phase === "round-result") {
      const queue = state.actionQueue || [];
      if (!queue.length) {
        return createNextRound(state, rng);
      }
      return cloneState(state, {
        phase: "painting",
        currentPlayer: queue[0],
        currentActionIndex: 0,
        earnedCells: state.problem ? state.problem.answer : 0,
        selection: [],
        lastFeedback: {
          type: "action-start",
          title: `${playerLabel(queue[0])} 행동`,
          message:
            queue.length > 1
              ? `현재 행동은 ${playerLabel(queue[0])}입니다. 다음 행동은 ${playerLabel(queue[1])}입니다.`
              : `현재 행동은 ${playerLabel(queue[0])}입니다. 이번 라운드는 ${playerLabel(queue[0])}만 행동합니다.`,
        },
      });
    }
    if (state.phase === "feedback") {
      const queue = state.actionQueue || [];
      const nextActionIndex = (state.currentActionIndex || 0) + 1;
      if (nextActionIndex < queue.length) {
        const actor = queue[nextActionIndex];
        return cloneState(state, {
          phase: "painting",
          currentPlayer: actor,
          currentActionIndex: nextActionIndex,
          earnedCells: state.problem ? state.problem.answer : 0,
          selection: [],
          lastFeedback: {
            type: "action-start",
            title: `${playerLabel(actor)} 행동`,
            message: `현재 행동은 ${playerLabel(actor)}입니다.`,
          },
        });
      }
      return createNextRound(state, rng);
    }
    return state;
  }

  function countCells(board, cellState) {
    return board.reduce((count, cell) => count + (cell === cellState ? 1 : 0), 0);
  }

  function calculateScore(state) {
    const player1Cells = countCells(state.board, "player1");
    const player2Cells = countCells(state.board, "player2");
    return {
      player1: {
        cells: player1Cells,
        finalScore: player1Cells,
      },
      player2: {
        cells: player2Cells,
        finalScore: player2Cells,
      },
    };
  }

  function allConnectedOwnCells(board, player) {
    const cells = [];
    board.forEach((cell, index) => {
      if (cell === player) cells.push(index);
    });
    if (cells.length === 0) return true;
    const seen = new Set([cells[0]]);
    const queue = [cells[0]];
    while (queue.length) {
      const cell = queue.shift();
      neighbors(cell).forEach((next) => {
        if (board[next] === player && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      });
    }
    return cells.every((cell) => seen.has(cell));
  }

  function hashSeedText(text) {
    let hash = 2166136261;
    String(text || "rpg")
      .split("")
      .forEach((char) => {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      });
    return hash >>> 0;
  }

  function createRpgProblemSet(settingsInput, seedInput) {
    const settings = normalizeSettings(settingsInput);
    const rng = createRng(hashSeedText(seedInput || Date.now()));
    const history = [];
    const problems = [];
    for (let index = 0; index < RPG_PROBLEM_COUNT; index += 1) {
      const problem = generateProblem(settings, history, rng);
      history.push(problem);
      problems.push(problem);
    }
    return problems;
  }

  function createRpgState(settingsInput, seedInput) {
    const settings = normalizeSettings(settingsInput);
    const seed = String(seedInput || Date.now());
    const problems = createRpgProblemSet(settings, seed);
    return {
      gameMode: "rpg",
      settings,
      seed,
      phase: "rpgSolving",
      problems,
      answers: {
        player1: [],
        player2: [],
      },
      solveScores: {
        player1: 0,
        player2: 0,
      },
      solveFinished: {
        player1: false,
        player2: false,
      },
      statAllocations: {
        player1: null,
        player2: null,
      },
      statLocked: {
        player1: false,
        player2: false,
      },
      battle: null,
      winner: null,
      finishReason: null,
      lastRpgError: "",
    };
  }

  function rpgPlayerAnswerIndex(state, player) {
    const answers = (state.answers && state.answers[player]) || [];
    return Math.min(answers.length, RPG_PROBLEM_COUNT);
  }

  function submitRpgAnswer(state, player, answerInput, options) {
    if (!state || state.phase !== "rpgSolving") return state;
    if (!PLAYER_KEYS.includes(player)) return state;

    const index = rpgPlayerAnswerIndex(state, player);
    if (index >= RPG_PROBLEM_COUNT) return state;

    const problem = state.problems[index];
    const timedOut = Boolean(options && options.timedOut);
    const submittedAnswer = timedOut ? null : Number(String(answerInput).trim());
    const isCorrect = !timedOut && Number.isInteger(submittedAnswer) && submittedAnswer === problem.answer;
    const earnedPoints = isCorrect ? problem.answer : 0;

    const next = cloneRpgState(state, { lastRpgError: "" });
    next.answers[player].push({
      problemId: problem.id,
      submittedAnswer,
      correctAnswer: problem.answer,
      isCorrect,
      earnedPoints,
      timedOut,
    });
    next.solveScores[player] = next.answers[player].reduce((sum, item) => sum + item.earnedPoints, 0);
    next.solveFinished[player] = next.answers[player].length >= RPG_PROBLEM_COUNT;

    if (next.solveFinished.player1 && next.solveFinished.player2) {
      next.phase = "rpgStatAllocation";
    }

    return next;
  }

  function cloneRpgState(state, overrides) {
    return Object.assign(
      {},
      state,
      {
        problems: (state.problems || []).slice(),
        answers: {
          player1: ((state.answers && state.answers.player1) || []).slice(),
          player2: ((state.answers && state.answers.player2) || []).slice(),
        },
        solveScores: Object.assign({ player1: 0, player2: 0 }, state.solveScores || {}),
        solveFinished: Object.assign({ player1: false, player2: false }, state.solveFinished || {}),
        statAllocations: Object.assign({ player1: null, player2: null }, state.statAllocations || {}),
        statLocked: Object.assign({ player1: false, player2: false }, state.statLocked || {}),
        battle: state.battle ? cloneRpgBattle(state.battle) : null,
      },
      overrides || {}
    );
  }

  function cloneRpgTurnMap(map) {
    const cloned = {};
    Object.keys(map || {}).forEach((turnKey) => {
      cloned[turnKey] = Object.assign({}, map[turnKey]);
    });
    return cloned;
  }

  function cloneRpgBattle(battle) {
    return Object.assign({}, battle, {
      hp: Object.assign({ player1: 0, player2: 0 }, battle.hp || {}),
      choices: cloneRpgTurnMap(battle.choices),
      reveals: cloneRpgTurnMap(battle.reveals),
      logs: (battle.logs || []).slice(),
    });
  }

  function calculateRpgStats(input) {
    const totalPoints = Math.max(0, Number(input.totalPoints) || 0);
    const hpInvest = Math.max(0, Number(input.hpInvest) || 0);
    const attackInvest = Math.max(0, Number(input.attackInvest) || 0);
    const defenseInvest = Math.max(0, Number(input.defenseInvest) || 0);
    const zeroPointArchetype = input.zeroPointArchetype === "defense" ? "defense" : "attack";
    const attackBonus = totalPoints === 0 && zeroPointArchetype === "attack" ? 1 : 0;
    const defenseBonus = totalPoints === 0 && zeroPointArchetype === "defense" ? 1 : 0;
    const maxHp = RPG_BASE_HP + hpInvest * 2;
    const attack = RPG_BASE_ATTACK + attackInvest + attackBonus;
    const defense = RPG_BASE_DEFENSE + defenseInvest + defenseBonus;
    return {
      totalPoints,
      hpInvest,
      attackInvest,
      defenseInvest,
      maxHp,
      currentHp: maxHp,
      attack,
      defense,
      archetype: attack > defense ? "attack" : "defense",
      zeroPointArchetype: totalPoints === 0 ? zeroPointArchetype : null,
    };
  }

  function validateRpgStatInput(input) {
    const totalPoints = Number(input.totalPoints);
    const hpInvest = Number(input.hpInvest);
    const attackInvest = Number(input.attackInvest);
    const defenseInvest = Number(input.defenseInvest);
    const values = [totalPoints, hpInvest, attackInvest, defenseInvest];

    if (values.some((value) => !Number.isInteger(value))) {
      return { ok: false, message: "스탯은 소수 없이 정수로 입력해야 합니다." };
    }
    if (values.some((value) => value < 0)) {
      return { ok: false, message: "스탯은 0보다 작을 수 없습니다." };
    }
    if (hpInvest + attackInvest + defenseInvest !== totalPoints) {
      return { ok: false, message: "사용 포인트와 획득 포인트가 같아야 합니다." };
    }

    const stats = calculateRpgStats(input);
    if (stats.attack === stats.defense) {
      return {
        ok: false,
        message: "공격력과 방어력은 같을 수 없습니다. 공격형 또는 방어형이 되도록 다시 배분하세요.",
      };
    }
    return { ok: true, message: "", stats };
  }

  function lockRpgStats(state, player, input) {
    if (!state || state.phase !== "rpgStatAllocation") return state;
    if (!PLAYER_KEYS.includes(player)) return state;

    const check = validateRpgStatInput(input);
    if (!check.ok) {
      return Object.assign(cloneRpgState(state), {
        lastRpgError: check.message,
      });
    }

    const next = cloneRpgState(state, { lastRpgError: "" });
    next.statAllocations[player] = check.stats;
    next.statLocked[player] = true;

    if (next.statLocked.player1 && next.statLocked.player2) {
      next.phase = "rpgBattle";
      next.battle = {
        turnIndex: 0,
        hp: {
          player1: next.statAllocations.player1.currentHp,
          player2: next.statAllocations.player2.currentHp,
        },
        choices: {},
        reveals: {},
        logs: [],
      };
    }

    return next;
  }

  function commitRpgChoice(state, player, commitHash) {
    if (!state || state.phase !== "rpgBattle" || !state.battle) return state;
    if (!PLAYER_KEYS.includes(player)) return state;

    const turnKey = String(state.battle.turnIndex);
    const next = cloneRpgState(state);
    if (!next.battle.choices[turnKey]) next.battle.choices[turnKey] = {};
    if (next.battle.choices[turnKey][player]) return next;
    next.battle.choices[turnKey][player] = {
      commitHash,
      committedAt: Date.now(),
    };
    return next;
  }

  function revealRpgChoice(state, player, reveal) {
    if (!state || state.phase !== "rpgBattle" || !state.battle) return state;
    if (!PLAYER_KEYS.includes(player)) return state;

    const turnKey = String(state.battle.turnIndex);
    const next = cloneRpgState(state);
    if (!next.battle.reveals[turnKey]) next.battle.reveals[turnKey] = {};
    if (next.battle.reveals[turnKey][player]) return next;
    next.battle.reveals[turnKey][player] = {
      choice: reveal.choice,
      salt: reveal.salt,
      hashOk: reveal.hashOk !== false,
      revealedAt: Date.now(),
    };

    const bothRevealed =
      next.battle.reveals[turnKey].player1 &&
      next.battle.reveals[turnKey].player2;

    if (bothRevealed) {
      return resolveRpgBattleTurn(next);
    }
    return next;
  }

  function resolveRpgBattleTurn(state) {
    const turnKey = String(state.battle.turnIndex);
    const reveals = state.battle.reveals[turnKey] || {};
    if (!reveals.player1 || !reveals.player2) return state;

    const p1Choice = normalizeRpgChoice(reveals.player1.choice);
    const p2Choice = normalizeRpgChoice(reveals.player2.choice);
    const p1 = rpgBattlePlayer(state, "player1");
    const p2 = rpgBattlePlayer(state, "player2");
    let result;

    if (reveals.player1.hashOk === false || reveals.player2.hashOk === false) {
      result = invalidRpgRevealResult(state, p1Choice, p2Choice, reveals);
    } else {
      result = resolveRpgTurn({
        turnIndex: state.battle.turnIndex,
        player1: p1,
        player2: p2,
        player1Choice: p1Choice,
        player2Choice: p2Choice,
      });
    }

    const next = cloneRpgState(state);
    next.battle.hp.player1 = result.player1HpAfter;
    next.battle.hp.player2 = result.player2HpAfter;
    next.battle.logs.push(result);

    const finish = determineRpgWinner(next);
    if (finish.winner) {
      next.phase = "rpgFinished";
      next.winner = finish.winner;
      next.finishReason = finish.reason;
      return next;
    }

    next.battle.turnIndex += 1;
    return next;
  }

  function normalizeRpgChoice(choice) {
    return RPG_CHOICES.includes(choice) ? choice : "rock";
  }

  function rpgBattlePlayer(state, player) {
    const stats = state.statAllocations[player];
    return {
      playerId: player,
      maxHp: stats.maxHp,
      currentHp: state.battle.hp[player],
      attack: stats.attack,
      defense: stats.defense,
      archetype: stats.archetype,
    };
  }

  function resolveRpgTurn(input) {
    const p1 = Object.assign({}, input.player1);
    const p2 = Object.assign({}, input.player2);
    const rpsWinner = rpgWinner(input.player1Choice, input.player2Choice);
    const effect =
      rpsWinner === "draw"
        ? rpgDrawEffect(p1, p2, input.player1Choice)
        : rpgWinEffect(
            rpsWinner === "player1" ? p1 : p2,
            rpsWinner === "player1" ? p2 : p1,
            rpsWinner === "player1" ? input.player1Choice : input.player2Choice
          );

    applyRpgEffect(effect, p1, p2);

    return {
      turnIndex: input.turnIndex,
      player1Choice: input.player1Choice,
      player2Choice: input.player2Choice,
      rpsWinner,
      player1HpBefore: input.player1.currentHp,
      player2HpBefore: input.player2.currentHp,
      player1HpAfter: p1.currentHp,
      player2HpAfter: p2.currentHp,
      effect,
      message: rpgTurnMessage(input.player1Choice, input.player2Choice, effect),
    };
  }

  function rpgWinner(a, b) {
    if (a === b) return "draw";
    if (
      (a === "scissors" && b === "paper") ||
      (a === "rock" && b === "scissors") ||
      (a === "paper" && b === "rock")
    ) {
      return "player1";
    }
    return "player2";
  }

  function rpgWinEffect(actor, target, choice) {
    if (choice === "scissors") {
      return { type: "damage", actor: actor.playerId, target: target.playerId, amount: actor.attack };
    }
    if (choice === "paper") {
      return { type: "heal", actor: actor.playerId, target: actor.playerId, amount: actor.defense };
    }
    if (actor.archetype === "attack") {
      return { type: "damage", actor: actor.playerId, target: target.playerId, amount: actor.attack };
    }
    return { type: "heal", actor: actor.playerId, target: actor.playerId, amount: actor.defense };
  }

  function rpgDrawEffect(player1, player2, choice) {
    if (choice === "scissors") return rpgCompareDamage(player1, player2, player1.attack, player2.attack);
    if (choice === "paper") return rpgCompareHeal(player1, player2, player1.defense, player2.defense);

    const p1Value = player1.archetype === "attack" ? player1.attack : player1.defense;
    const p2Value = player2.archetype === "attack" ? player2.attack : player2.defense;
    if (p1Value === p2Value) return { type: "none", actor: null, target: null, amount: 0 };
    const actor = p1Value > p2Value ? player1 : player2;
    const target = p1Value > p2Value ? player2 : player1;
    const amount = Math.abs(p1Value - p2Value);
    if (actor.archetype === "attack") {
      return { type: "damage", actor: actor.playerId, target: target.playerId, amount };
    }
    return { type: "heal", actor: actor.playerId, target: actor.playerId, amount };
  }

  function rpgCompareDamage(player1, player2, value1, value2) {
    if (value1 === value2) return { type: "none", actor: null, target: null, amount: 0 };
    const actor = value1 > value2 ? player1 : player2;
    const target = value1 > value2 ? player2 : player1;
    return { type: "damage", actor: actor.playerId, target: target.playerId, amount: Math.abs(value1 - value2) };
  }

  function rpgCompareHeal(player1, player2, value1, value2) {
    if (value1 === value2) return { type: "none", actor: null, target: null, amount: 0 };
    const actor = value1 > value2 ? player1 : player2;
    return { type: "heal", actor: actor.playerId, target: actor.playerId, amount: Math.abs(value1 - value2) };
  }

  function applyRpgEffect(effect, player1, player2) {
    if (!effect || effect.type === "none" || !effect.target) return;
    const target = effect.target === "player1" ? player1 : player2;
    if (effect.type === "damage") {
      target.currentHp = Math.max(0, target.currentHp - effect.amount);
    } else {
      target.currentHp = Math.min(target.maxHp, target.currentHp + effect.amount);
    }
  }

  function rpgTurnMessage(p1Choice, p2Choice, effect) {
    const labels = { scissors: "가위", rock: "바위", paper: "보" };
    const open = `A는 ${labels[p1Choice]}, B는 ${labels[p2Choice]}를 냈습니다.`;
    if (!effect || effect.type === "none") return `${open} 아무 효과도 일어나지 않았습니다.`;
    const actor = playerLabel(effect.actor);
    if (effect.type === "damage") {
      return `${open} ${actor}가 ${playerLabel(effect.target)}에게 ${effect.amount} 피해를 주었습니다.`;
    }
    return `${open} ${actor}가 ${effect.amount}만큼 회복했습니다.`;
  }

  function invalidRpgRevealResult(state, p1Choice, p2Choice, reveals) {
    const p1Penalty = reveals.player1.hashOk === false ? 20 : 0;
    const p2Penalty = reveals.player2.hashOk === false ? 20 : 0;
    return {
      turnIndex: state.battle.turnIndex,
      player1Choice: p1Choice,
      player2Choice: p2Choice,
      rpsWinner: p1Penalty && !p2Penalty ? "player2" : p2Penalty && !p1Penalty ? "player1" : "draw",
      player1HpBefore: state.battle.hp.player1,
      player2HpBefore: state.battle.hp.player2,
      player1HpAfter: Math.max(0, state.battle.hp.player1 - p1Penalty),
      player2HpAfter: Math.max(0, state.battle.hp.player2 - p2Penalty),
      effect: {
        type: p1Penalty || p2Penalty ? "damage" : "none",
        actor: null,
        target: p1Penalty ? "player1" : p2Penalty ? "player2" : null,
        amount: p1Penalty || p2Penalty,
      },
      message: "선택 검증에 실패했습니다. 해당 턴은 패배 처리됩니다.",
    };
  }

  function determineRpgWinner(state) {
    const hp1 = state.battle.hp.player1;
    const hp2 = state.battle.hp.player2;
    if (hp1 <= 0 && hp2 <= 0) return { winner: "draw", reason: "두 플레이어의 체력이 동시에 0이 되었습니다." };
    if (hp1 <= 0) return { winner: "player2", reason: "A의 체력이 0이 되었습니다." };
    if (hp2 <= 0) return { winner: "player1", reason: "B의 체력이 0이 되었습니다." };
    if (state.battle.turnIndex + 1 < RPG_BATTLE_TURN_COUNT) return { winner: null, reason: null };
    if (hp1 > hp2) return { winner: "player1", reason: "5턴 종료 후 A의 남은 체력이 더 높습니다." };
    if (hp2 > hp1) return { winner: "player2", reason: "5턴 종료 후 B의 남은 체력이 더 높습니다." };
    if (state.solveScores.player1 > state.solveScores.player2) {
      return { winner: "player1", reason: "체력이 같아 문제 풀이 점수로 A가 승리했습니다." };
    }
    if (state.solveScores.player2 > state.solveScores.player1) {
      return { winner: "player2", reason: "체력이 같아 문제 풀이 점수로 B가 승리했습니다." };
    }
    return { winner: "draw", reason: "체력과 문제 풀이 점수가 모두 같아 무승부입니다." };
  }

  return {
    BOARD_SIZE,
    TURNS_PER_PLAYER,
    PLAYER_KEYS,
    OBSTACLE_COUNTS,
    TIME_LIMITS,
    PAINT_TIME_LIMIT,
    RPG_PROBLEM_COUNT,
    RPG_BATTLE_TURN_COUNT,
    RPG_BASE_HP,
    RPG_BASE_ATTACK,
    RPG_BASE_DEFENSE,
    RPG_CHOICES,
    SHAPES,
    QUESTION_TYPES,
    createRng,
    defaultSettings,
    normalizeSettings,
    indexOf,
    coordsOf,
    neighbors,
    opponentOf,
    playerLabel,
    startingCells,
    createBlankBoard,
    createInitialBoard,
    generateProblem,
    createGameState,
    createEmptySubmissions,
    createRpgProblemSet,
    createRpgState,
    rpgPlayerAnswerIndex,
    submitRpgAnswer,
    calculateRpgStats,
    validateRpgStatInput,
    lockRpgStats,
    commitRpgChoice,
    revealRpgChoice,
    resolveRpgTurn,
    determineRpgWinner,
    submitAnswer,
    timeOutTurn,
    selectCells,
    toggleCell,
    clearSelection,
    selectionStats,
    confirmPainting,
    autoFillSelection,
    hasAnyPaintableMove,
    hasAnyPaintableMoveOnBoard,
    nextTurn,
    calculateScore,
    countCells,
    isGameOver,
    isValidTriangle,
    allConnectedOwnCells,
  };
});
