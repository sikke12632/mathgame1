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
    const recent = history.slice(-2).map((item) => item.questionType);
    if (recent.length === 2 && recent[0] === recent[1]) {
      return recent[0] === "area" ? "perimeter" : "area";
    }
    return rng() < 0.5 ? "perimeter" : "area";
  }

  function chooseShape(settings, history, rng) {
    const shapes = settings.shapes.slice();
    if (shapes.length === 1) return shapes[0];
    const recent = history.slice(-2).map((item) => item.shape);
    if (recent.length === 2 && recent[0] === recent[1]) {
      const alternatives = shapes.filter((shape) => shape !== recent[0]);
      return alternatives[randInt(rng, 0, alternatives.length - 1)];
    }
    return shapes[randInt(rng, 0, shapes.length - 1)];
  }

  function generateProblem(settingsInput, historyInput, rngInput) {
    const settings = normalizeSettings(settingsInput);
    const history = historyInput || [];
    const rng = rngInput || Math.random;
    const shape = chooseShape(settings, history, rng);
    const questionType = chooseQuestionType(settings, history, rng);
    const [minAnswer, maxAnswer] = answerRangeForDifficulty(settings.difficulty);
    let fallback = null;

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const problem = makeProblem(shape, questionType, settings.difficulty, rng);
      fallback = fallback || problem;
      if (Number.isInteger(problem.answer) && problem.answer > 0) {
        if (problem.answer >= minAnswer && problem.answer <= maxAnswer) {
          return problem;
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

  function createGameState(settingsInput, rngInput) {
    const settings = normalizeSettings(settingsInput);
    const rng = rngInput || Math.random;
    const board = createInitialBoard(settings.difficulty, rng);
    const problem = generateProblem(settings, [], rng);
    return {
      settings,
      board,
      currentPlayer: "player1",
      turnCounts: { player1: 0, player2: 0 },
      phase: "question",
      problem,
      problemHistory: [problem],
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
        problemHistory: state.problemHistory.slice(),
        selection: state.selection.slice(),
        skippedTurns: (state.skippedTurns || []).slice(),
      },
      overrides || {}
    );
  }

  function submitAnswer(state, answerInput) {
    if (state.phase !== "question" || !state.problem) return state;
    const answer = Number(String(answerInput).trim());
    if (Number.isInteger(answer) && answer === state.problem.answer) {
      return cloneState(state, {
        phase: "painting",
        earnedCells: state.problem.answer,
        selection: [],
        lastFeedback: {
          type: "correct",
          title: "정답입니다",
          message: `${state.problem.answer}칸을 획득했습니다. 연결된 빈칸을 칠하거나 상대 칸을 중립화할 수 있습니다.`,
        },
      });
    }
    return cloneState(state, {
      phase: "feedback",
      selection: [],
      earnedCells: 0,
      lastFeedback: {
        type: "wrong",
        title: "아쉬워요",
        message: `정답은 ${state.problem.answer}입니다. ${state.problem.explanation}`,
      },
    });
  }

  function timeOutTurn(state) {
    if (state.phase !== "question" || !state.problem) return state;
    return cloneState(state, {
      phase: "feedback",
      selection: [],
      earnedCells: 0,
      lastFeedback: {
        type: "timeout",
        title: "시간이 끝났습니다",
        message: `정답은 ${state.problem.answer}입니다. ${state.problem.explanation}`,
      },
    });
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
    const turnsDone = PLAYER_KEYS.every((player) => state.turnCounts[player] >= TURNS_PER_PLAYER);
    const noMoves = PLAYER_KEYS.every((player) => !hasAnyPaintableMove(state, player));
    return turnsDone || noMoves;
  }

  function nextTurn(state, rngInput) {
    const rng = rngInput || Math.random;
    let next = cloneState(state, {
      selection: [],
      earnedCells: 0,
      skippedTurns: [],
    });
    next.turnCounts[next.currentPlayer] = Math.min(
      TURNS_PER_PLAYER,
      next.turnCounts[next.currentPlayer] + 1
    );
    next.currentPlayer = opponentOf(next.currentPlayer);

    while (!isGameOver(next)) {
      if (next.turnCounts[next.currentPlayer] >= TURNS_PER_PLAYER) {
        next.currentPlayer = opponentOf(next.currentPlayer);
        continue;
      }
      if (!hasAnyPaintableMove(next, next.currentPlayer)) {
        next.skippedTurns.push(next.currentPlayer);
        next.turnCounts[next.currentPlayer] = Math.min(
          TURNS_PER_PLAYER,
          next.turnCounts[next.currentPlayer] + 1
        );
        next.currentPlayer = opponentOf(next.currentPlayer);
        continue;
      }
      const problem = generateProblem(next.settings, next.problemHistory, rng);
      next.problem = problem;
      next.problemHistory.push(problem);
      next.phase = "question";
      next.lastFeedback = next.skippedTurns.length
        ? {
            type: "skip",
            title: "자동으로 턴을 넘겼습니다",
            message: `${next.skippedTurns.map(playerLabel).join(", ")} 플레이어는 칠할 수 있는 칸이 없어 턴을 넘겼습니다.`,
          }
        : null;
      return next;
    }

    next.phase = "gameover";
    next.problem = null;
    next.lastFeedback = {
      type: "gameover",
      title: "게임 종료",
      message: "모든 턴이 끝났거나 더 이상 칠할 수 있는 칸이 없습니다.",
    };
    return next;
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

  return {
    BOARD_SIZE,
    TURNS_PER_PLAYER,
    PLAYER_KEYS,
    OBSTACLE_COUNTS,
    TIME_LIMITS,
    PAINT_TIME_LIMIT,
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
