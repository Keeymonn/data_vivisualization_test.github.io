    const createTestBtn = document.getElementById('createTestBtn');
    const checkBtn = document.getElementById('checkBtn');
    const quizContainer = document.getElementById('quizContainer');
    const loading = document.getElementById('loading');

    async function fetchQuestions(count, answerType, difficulty) {
      const prompt = `
Ты — эксперт по визуализации данных, который оценивает пользователей (статистика, анализ данных, дизайн, программирование визуализации). 
Необходимо создать тест для проверки знаний по курсу "Визуализация данных", он должен содержать разностроннии вопросы, которые будут охватывать весь объем знаний по курсу, 
используй литератуту по предмету и методические пособия. Важно охватывать разные темы в одном тесте: 
Основные типы диаграмм и графиков (гистограммы, линейные графики, круговые диаграммы, тепловые карты и др.)
Принципы выбора визуализации для разных типов данных,
Интерпретация и анализ визуальных представлений данных,
Цветовые схемы и восприятие цвета,
Ошибки и искажения в визуализации данных,
Инструменты и библиотеки для визуализации,
Основы статистики, важные для визуализации (распределения, корреляции).
Сгенерируй ${count} вопрос${count > 1 ? 'ов' : ''} для теста по визуализации данных.
Каждый вопрос должен иметь 3-4 варианта ответа.
Тип ответа: ${answerType === 'single' ? 'одиночный выбор' : answerType === 'multiple' ? 'множественный выбор' : 'комбинированный (часть вопросов с одиночным, часть с множественным выбором)'}.
Сложность вопросов: ${difficulty}.
Вопросы не должны содержать изображений.
Формат ответа JSON-массив с объектами:
[
  {
    "question": "текст вопроса",
    "type": "single" или "multiple",
    "options": ["вариант 1", "вариант 2", "вариант 3", "вариант 4"],
    "correct": [индексы правильных вариантов, например [0] или [1,3]]
  },
  ...
]
Ответь только JSON без дополнительного текста.
      `;

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3-235b-a22b:free',
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Ошибка сети: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Ответ нейросети пустой');

      try {
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']');
        const jsonString = content.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonString);
      } catch (e) {
        throw new Error('Не удалось распарсить JSON от нейросети: ' + e.message);
      }
    }

    function renderTest(questions, globalAnswerType) {
      quizContainer.innerHTML = '';
      questions.forEach((q, i) => {
        const block = document.createElement('section');
        block.className = 'question-block';
        block.id = `question-${i}`;
        block.setAttribute('tabindex', '-1');

        const qNumber = document.createElement('h3');
        qNumber.className = 'question-text';
        qNumber.textContent = `Вопрос ${i + 1}: ${q.question}`;
        block.appendChild(qNumber);

        let type = globalAnswerType === 'combined' ? q.type : globalAnswerType;
        if (type !== 'single' && type !== 'multiple') type = 'single';

        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';

        q.options.forEach((opt, idx) => {
          const optionId = `q${i}_opt${idx}`;
          const label = document.createElement('label');
          label.htmlFor = optionId;

          const input = document.createElement('input');
          input.type = type === 'single' ? 'radio' : 'checkbox';
          input.name = `q${i}`;
          input.id = optionId;
          input.value = idx;

          label.appendChild(input);
          label.appendChild(document.createTextNode(opt));

          optionsDiv.appendChild(label);
        });

        block.appendChild(optionsDiv);
        quizContainer.appendChild(block);
      });
    }

    function checkAnswers(questions, globalAnswerType) {
  let firstUnanswered = null;

  questions.forEach((q, i) => {
    const block = document.getElementById(`question-${i}`);
    block.classList.remove('required');

    const inputs = quizContainer.querySelectorAll(`[name="q${i}"]`);
    const selectedIndexes = [];
    inputs.forEach(input => {
      if (input.checked) selectedIndexes.push(Number(input.value));
    });

    if (selectedIndexes.length === 0 && !firstUnanswered) {
      firstUnanswered = block;
      block.classList.add('required');
    }
  });

  if (firstUnanswered) {
    firstUnanswered.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false; // Есть неотвеченные вопросы
  }

  questions.forEach((q, i) => {
    const type = globalAnswerType === 'combined' ? q.type : globalAnswerType;
    const inputs = quizContainer.querySelectorAll(`[name="q${i}"]`);

    inputs.forEach(input => {
      input.disabled = true; // Запрет менять ответы после проверки
    });

    inputs.forEach(input => {
      const label = input.parentElement;
      const idx = Number(input.value);
      label.classList.remove('correct', 'incorrect');

      if (q.correct.includes(idx)) {
        label.classList.add('correct'); // Подсветка правильных вариантов
      }

      if (!q.correct.includes(idx) && input.checked) {
        label.classList.add('incorrect'); // Подсветить неверно выбранные варианты
      }
    });
  });

  return true;
}


    createTestBtn.addEventListener('click', async () => {
      checkBtn.style.display = 'none';
      checkBtn.disabled = false;
      quizContainer.innerHTML = '';
      loading.style.display = 'flex';

      const count = parseInt(document.getElementById('questionCount').value, 10);
      const answerType = document.getElementById('answerType').value;
      const difficulty = document.getElementById('difficulty').value;

      if (isNaN(count) || count < 1 || count > 10) {
        alert('Введите количество вопросов от 1 до 10');
        loading.style.display = 'none';
        return;
      }

      try {
        const questions = await fetchQuestions(count, answerType, difficulty);
        loading.style.display = 'none';

        if (!Array.isArray(questions) || questions.length === 0) {
          alert('Не удалось получить вопросы от нейросети.');
          return;
        }

        renderTest(questions, answerType);
        checkBtn.style.display = 'block';

        // Разрешаем прокрутку страницы после генерации теста
        document.body.classList.add('scroll-enabled');

        const firstQuestion = document.querySelector('.question-block');
        if (firstQuestion) {
          firstQuestion.focus();
          firstQuestion.scrollIntoView({ behavior: 'smooth' });
        }

        window.currentTest = { questions, answerType };
      } catch (e) {
        loading.style.display = 'none';
        alert('Ошибка при генерации теста: ' + e.message);
      }
    });

    checkBtn.addEventListener('click', () => {
      if (!window.currentTest) return;

      const { questions, answerType } = window.currentTest;
      const allAnswered = checkAnswers(questions, answerType);

      if (allAnswered) {
        checkBtn.disabled = true;
      }
    });
