const quizSets = window.QUIZ_SETS || [
  {
    id: "default",
    title: "Đề ôn tập",
    questions: window.QUIZ_QUESTIONS || [],
  },
];

let activeSet = quizSets[0] || { id: "default", title: "Đề ôn tập", questions: [] };
let sourceQuestions = activeSet.questions || [];

const state = {
  questions: sourceQuestions.map(cloneQuestion),
  currentIndex: 0,
  answers: new Map(),
  elapsedSeconds: 0,
  timerId: null,
  finished: false,
};

const els = {
  totalQuestions: document.getElementById("totalQuestions"),
  timer: document.getElementById("timer"),
  answeredCount: document.getElementById("answeredCount"),
  correctCount: document.getElementById("correctCount"),
  wrongCount: document.getElementById("wrongCount"),
  remainingCount: document.getElementById("remainingCount"),
  progressBar: document.getElementById("progressBar"),
  progressText: document.getElementById("progressText"),
  shuffleBtn: document.getElementById("shuffleBtn"),
  resetBtn: document.getElementById("resetBtn"),
  finishBtn: document.getElementById("finishBtn"),
  quizSetSelect: document.getElementById("quizSetSelect"),
  searchInput: document.getElementById("searchInput"),
  questionNav: document.getElementById("questionNav"),
  questionNumber: document.getElementById("questionNumber"),
  questionState: document.getElementById("questionState"),
  questionText: document.getElementById("questionText"),
  optionsList: document.getElementById("optionsList"),
  feedback: document.getElementById("feedback"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  resultPanel: document.getElementById("resultPanel"),
  resultTitle: document.getElementById("resultTitle"),
  resultCorrect: document.getElementById("resultCorrect"),
  resultWrong: document.getElementById("resultWrong"),
  resultTime: document.getElementById("resultTime"),
};

function startTimer() {
  if (state.timerId) return;
  state.timerId = window.setInterval(() => {
    state.elapsedSeconds += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  window.clearInterval(state.timerId);
  state.timerId = null;
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  els.timer.textContent = formatTime(state.elapsedSeconds);
}

function getStats() {
  let answered = 0;
  let correct = 0;

  state.questions.forEach((question) => {
    const answerState = getAnswerState(question);
    if (answerState === "correct" || answerState === "wrong") answered += 1;
    if (answerState === "correct") correct += 1;
  });

  return {
    answered,
    correct,
    wrong: answered - correct,
    remaining: state.questions.length - answered,
  };
}

function getCurrentQuestion() {
  return state.questions[state.currentIndex];
}

function getCorrectIndexes(question) {
  if (Array.isArray(question.correctIndexes)) return question.correctIndexes;
  return [question.correctIndex];
}

function cloneQuestion(question) {
  return {
    ...question,
    options: [...question.options],
    correctIndexes: Array.isArray(question.correctIndexes) ? [...question.correctIndexes] : undefined,
  };
}

function shuffleItems(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function shuffleQuestionOptions(question) {
  const correctIndexes = getCorrectIndexes(question);
  const shuffledOptions = shuffleItems(question.options.map((option, index) => ({ option, index })));
  const nextCorrectIndexes = shuffledOptions
    .map((option, index) => (correctIndexes.includes(option.index) ? index : -1))
    .filter((index) => index !== -1);

  const nextQuestion = {
    ...question,
    options: shuffledOptions.map(({ option }) => option),
  };

  if (nextCorrectIndexes.length > 1) {
    nextQuestion.correctIndexes = nextCorrectIndexes;
    delete nextQuestion.correctIndex;
  } else {
    nextQuestion.correctIndex = nextCorrectIndexes[0];
    delete nextQuestion.correctIndexes;
  }

  return nextQuestion;
}

function getSelectedIndexes(question) {
  return state.answers.get(question.id) || [];
}

function hasSameIndexes(selectedIndexes, correctIndexes) {
  if (selectedIndexes.length !== correctIndexes.length) return false;
  const selected = [...selectedIndexes].sort((a, b) => a - b);
  const correct = [...correctIndexes].sort((a, b) => a - b);
  return selected.every((value, index) => value === correct[index]);
}

function getAnswerState(question) {
  if (!state.answers.has(question.id)) return "unanswered";
  const selectedIndexes = getSelectedIndexes(question);
  const correctIndexes = getCorrectIndexes(question);
  if (selectedIndexes.length === 0) return "unanswered";
  if (correctIndexes.length > 1 && selectedIndexes.length < correctIndexes.length) return "partial";
  return hasSameIndexes(selectedIndexes, correctIndexes) ? "correct" : "wrong";
}

function renderStats() {
  const stats = getStats();
  const percent = state.questions.length ? Math.round((stats.answered / state.questions.length) * 100) : 0;

  els.totalQuestions.textContent = state.questions.length;
  els.answeredCount.textContent = stats.answered;
  els.correctCount.textContent = stats.correct;
  els.wrongCount.textContent = stats.wrong;
  els.remainingCount.textContent = stats.remaining;
  els.progressBar.style.width = `${percent}%`;
  els.progressText.textContent = `${percent}%`;
}

function renderNavigation() {
  const query = els.searchInput.value.trim().toLowerCase();
  els.questionNav.innerHTML = "";

  state.questions.forEach((question, index) => {
    const haystack = `${question.question} ${question.options.join(" ")}`.toLowerCase();
    if (query && !haystack.includes(query)) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-dot";
    button.textContent = index + 1;
    button.title = `Câu ${index + 1}`;

    const answerState = getAnswerState(question);
    if (index === state.currentIndex) button.classList.add("is-active");
    if (answerState === "correct") button.classList.add("is-correct");
    if (answerState === "wrong") button.classList.add("is-wrong");
    if (answerState === "partial") button.classList.add("is-partial");

    button.addEventListener("click", () => {
      state.currentIndex = index;
      render();
    });

    els.questionNav.appendChild(button);
  });
}

function renderQuestion() {
  const question = getCurrentQuestion();
  if (!question) return;

  const selected = getSelectedIndexes(question);
  const correctIndexes = getCorrectIndexes(question);
  const isMultiple = correctIndexes.length > 1;
  const answerState = getAnswerState(question);
  const shouldReveal = answerState === "correct" || answerState === "wrong";

  els.questionNumber.textContent = `Câu ${state.currentIndex + 1}/${state.questions.length}`;
  els.questionText.textContent = question.question;
  els.questionState.className = "state-pill";

  if (answerState === "correct") {
    els.questionState.textContent = "Đúng";
    els.questionState.classList.add("is-correct");
  } else if (answerState === "wrong") {
    els.questionState.textContent = "Sai";
    els.questionState.classList.add("is-wrong");
  } else if (answerState === "partial") {
    els.questionState.textContent = "Đang chọn";
  } else {
    els.questionState.textContent = "Chưa làm";
  }

  els.optionsList.innerHTML = "";
  question.options.forEach((option, optionIndex) => {
    if (!option.trim()) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.innerHTML = `
      <span class="option-letter">${String.fromCharCode(65 + optionIndex)}</span>
      <span>${option}</span>
      <span class="option-status" aria-hidden="true"></span>
    `;

    if (selected.includes(optionIndex)) {
      button.classList.add("is-selected");
    }

    if (shouldReveal) {
      if (correctIndexes.includes(optionIndex)) {
        button.classList.add("is-correct");
        button.querySelector(".option-status").textContent = "✓";
      }

      if (selected.includes(optionIndex) && !correctIndexes.includes(optionIndex)) {
        button.classList.add("is-wrong");
        button.querySelector(".option-status").textContent = "×";
      }
    }

    button.addEventListener("click", () => chooseAnswer(question, optionIndex));
    els.optionsList.appendChild(button);
  });

  els.feedback.className = "feedback";
  if (answerState === "unanswered") {
    els.feedback.textContent = isMultiple ? `Câu này chọn ${correctIndexes.length} đáp án.` : "";
  } else if (answerState === "partial") {
    els.feedback.textContent = `Đã chọn ${selected.length}/${correctIndexes.length} đáp án.`;
  } else if (answerState === "correct") {
    els.feedback.textContent = "Chính xác. Câu này đã được đánh dấu tích xanh.";
    els.feedback.classList.add("is-correct");
  } else {
    const answerLetters = correctIndexes.map((index) => String.fromCharCode(65 + index)).join(", ");
    els.feedback.textContent = `Chưa đúng. Đáp án đúng là ${answerLetters}.`;
    els.feedback.classList.add("is-wrong");
  }

  els.prevBtn.disabled = state.currentIndex === 0;
  els.nextBtn.textContent = state.currentIndex === state.questions.length - 1 ? "Xem kết quả" : "Tiếp";
}

function chooseAnswer(question, optionIndex) {
  if (state.finished) return;
  startTimer();

  const correctIndexes = getCorrectIndexes(question);
  if (correctIndexes.length > 1) {
    const selectedIndexes = getSelectedIndexes(question);
    const nextIndexes = selectedIndexes.includes(optionIndex)
      ? selectedIndexes.filter((index) => index !== optionIndex)
      : [...selectedIndexes, optionIndex];
    state.answers.set(question.id, nextIndexes);
  } else {
    state.answers.set(question.id, [optionIndex]);
  }

  render();

  if (getStats().answered === state.questions.length) {
    showResult();
  }
}

function showResult() {
  state.finished = true;
  stopTimer();

  const stats = getStats();
  const percent = state.questions.length ? Math.round((stats.correct / state.questions.length) * 100) : 0;
  els.resultTitle.textContent = `Bạn đúng ${stats.correct}/${state.questions.length} câu (${percent}%).`;
  els.resultCorrect.textContent = stats.correct;
  els.resultWrong.textContent = state.questions.length - stats.correct;
  els.resultTime.textContent = formatTime(state.elapsedSeconds);
  els.resultPanel.hidden = false;
  els.resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function resetQuiz({ shuffle = false } = {}) {
  stopTimer();
  state.answers.clear();
  state.currentIndex = 0;
  state.elapsedSeconds = 0;
  state.finished = false;
  els.resultPanel.hidden = true;

  if (shuffle) {
    state.questions = shuffleItems(sourceQuestions.map(cloneQuestion)).map(shuffleQuestionOptions);
  } else {
    state.questions = sourceQuestions.map(cloneQuestion);
  }

  updateTimer();
  startTimer();
  render();
}

function changeQuizSet(setId) {
  activeSet = quizSets.find((set) => set.id === setId) || quizSets[0];
  sourceQuestions = activeSet.questions || [];
  resetQuiz();
}

function renderSetPicker() {
  if (!els.quizSetSelect) return;
  els.quizSetSelect.innerHTML = "";
  quizSets.forEach((set) => {
    const option = document.createElement("option");
    option.value = set.id;
    option.textContent = `${set.title} (${set.questions.length} câu)`;
    els.quizSetSelect.appendChild(option);
  });
  els.quizSetSelect.value = activeSet.id;
}

function render() {
  renderStats();
  renderNavigation();
  renderQuestion();
}

els.prevBtn.addEventListener("click", () => {
  state.currentIndex = Math.max(0, state.currentIndex - 1);
  render();
});

els.nextBtn.addEventListener("click", () => {
  if (state.currentIndex === state.questions.length - 1) {
    showResult();
    return;
  }

  state.currentIndex += 1;
  render();
});

els.resetBtn.addEventListener("click", () => resetQuiz());
els.shuffleBtn.addEventListener("click", () => resetQuiz({ shuffle: true }));
els.finishBtn.addEventListener("click", showResult);
els.searchInput.addEventListener("input", renderNavigation);
els.quizSetSelect?.addEventListener("change", (event) => changeQuizSet(event.target.value));

updateTimer();
renderSetPicker();
startTimer();
render();
