document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const submitBtn = document.getElementById('submit-btn');
    const currentQuestionSpan = document.getElementById('current-question');
    const totalQuestionsSpan = document.getElementById('total-questions');
    const scoreSpan = document.getElementById('score');
    const timeSpan = document.getElementById('time');
    const progressBar = document.getElementById('progress-bar');
    const explanationContainer = document.getElementById('explanation-container');
    const explanationText = document.getElementById('explanation-text');
    const continueBtn = document.getElementById('continue-btn');
	const viewresultsBtn = document.getElementById('view-results-btn');
	const redoBtn = document.getElementById('redo-btn');
	
	//Initial changes
	document.body.classList.remove('exam-submitted');
    document.getElementById('view-results-btn').style.display = 'block';
    
    // Exam configuration
    const EXAM_QUESTION_COUNT = 60;
    const PASSING_PERCENTAGE = 68;
    
    // Exam variables
    let originalQuestions = [];
    let selectedQuestions = [];
    let questions = [];
    let currentQuestionIndex = 0;
    let userAnswers = [];
    let score = 0;
    let timeLeft = 60 * 60; // 60 minutes in seconds
    let timerInterval;
	let examAttempts = JSON.parse(localStorage.getItem('java21ExamAttempts')) || [];
	
	// Save and load the state of the exam
	function saveExamState() {
		const examState = {
			questions: questions,
			selectedQuestions: selectedQuestions,
			currentQuestionIndex: currentQuestionIndex,
			userAnswers: userAnswers,
			timeLeft: timeLeft,
			score: score
		};
		localStorage.setItem('java21ExamState', JSON.stringify(examState));
	}

	function loadExamState() {
		const savedState = localStorage.getItem('java21ExamState');
		if (savedState) {
			const state = JSON.parse(savedState);
			return confirm("Load previous exam progress?") ? state : null;
		}
		return null;
	}
    
	function startNewExam() {
		// Save current exam state if in progress
		if (currentQuestionIndex >= 0 && !document.getElementById('submit-btn').classList.contains('hidden')) {
			saveExamState();
		}
		
		// Select new random questions
		selectedQuestions = selectRandomQuestions(originalQuestions, EXAM_QUESTION_COUNT)
			.map((q, i) => ({ ...q, id: i + 1 }));
		questions = JSON.parse(JSON.stringify(selectedQuestions));
		userAnswers = new Array(questions.length).fill(null);
		currentQuestionIndex = 0;
		score = 0;
		timeLeft = 60 * 60;
		
		// Reset UI
		document.getElementById('submit-btn').classList.remove('hidden');
		document.body.classList.remove('exam-submitted');
		explanationContainer.style.display = 'none';
		startTimer();
		showQuestion();
	}
	
    fetch('questions.json')
		.then(response => response.json())
		.then(data => {
			originalQuestions = data;
			const savedState = loadExamState();
			
			if (savedState) {
				// Restore saved state
				questions = savedState.questions;
				selectedQuestions = savedState.selectedQuestions;
				currentQuestionIndex = savedState.currentQuestionIndex;
				userAnswers = savedState.userAnswers;
				timeLeft = savedState.timeLeft;
				score = savedState.score;
			} else {
				// Start new exam
				selectedQuestions = selectRandomQuestions(data, EXAM_QUESTION_COUNT)
					.map((q, i) => ({ ...q, id: i + 1 }));
				questions = JSON.parse(JSON.stringify(selectedQuestions));
				userAnswers = new Array(questions.length).fill(null);
			}
			
			startTimer();
			showQuestion();
		})
		.catch(error => console.error('Error loading questions:', error));
    
	
    // Select random questions without replacement
    function selectRandomQuestions(questionPool, count) {
        const shuffled = [...questionPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
    
    // Check if options should be randomized for a question
    function shouldRandomizeOptions(question) {
        // Don't randomize if any option is "All of the above" or similar
        const fixedOrderPatterns = [
            /all of the above/i,
            /none of the above/i,
            /both [a-z] and [a-z]/i,
            /[a-z] and [a-z]/i
        ];
        
        return !fixedOrderPatterns.some(pattern => 
            question.options.some(option => pattern.test(option))
        );
    }
    
    // Display current question with properly ordered options
    function showQuestion() {
        const question = questions[currentQuestionIndex];
        questionText.textContent = `${question.id}. ${question.question}`;
        optionsContainer.innerHTML = '';
        
        // Determine if we should randomize options
        const shouldRandomize = shouldRandomizeOptions(question);
        let displayOptions = [...question.options];
        let correctAnswerIndex = question.answer;
        
        if (shouldRandomize) {
            // Create shuffled options while tracking correct answer
            const shuffledOptions = [...question.options];
            for (let i = shuffledOptions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledOptions[i], shuffledOptions[j]] = [shuffledOptions[j], shuffledOptions[i]];
                
                // Update correct answer index if we moved it
                if (correctAnswerIndex === i) correctAnswerIndex = j;
                else if (correctAnswerIndex === j) correctAnswerIndex = i;
            }
            displayOptions = shuffledOptions;
            
            // Update the question with new option order
            questions[currentQuestionIndex].options = displayOptions;
            questions[currentQuestionIndex].answer = correctAnswerIndex;
            
            // Update user answer if exists
            if (userAnswers[currentQuestionIndex] !== null) {
                const originalAnswer = question.options[userAnswers[currentQuestionIndex]];
                userAnswers[currentQuestionIndex] = displayOptions.indexOf(originalAnswer);
            }
        }
        
        // Display options
        displayOptions.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.classList.add('option');
            
            if (userAnswers[currentQuestionIndex] === index) {
                optionElement.classList.add('selected');
            }
            
            optionElement.textContent = option;
            optionElement.dataset.index = index;
            optionElement.addEventListener('click', selectOption);
            optionsContainer.appendChild(optionElement);
        });
        
        currentQuestionSpan.textContent = currentQuestionIndex + 1;
        updateNavigationButtons();
        updateProgressBar();
    }
    
    // Select an option
    function selectOption(e) {
        const selectedOptionIndex = parseInt(e.target.dataset.index);
        userAnswers[currentQuestionIndex] = selectedOptionIndex;
        
        // Update UI
        document.querySelectorAll('.option').forEach(option => {
            option.classList.remove('selected');
        });
        e.target.classList.add('selected');
    }
    
    // Update navigation buttons state
    function updateNavigationButtons() {
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = false;
        
        if (currentQuestionIndex === questions.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitBtn.style.display = 'none';
        }
    }
    
    // Update progress bar
    function updateProgressBar() {
        const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
        progressBar.style.width = `${progress}%`;
    }
    
    // Navigation handlers
    prevBtn.addEventListener('click', () => currentQuestionIndex > 0 && goToQuestion(currentQuestionIndex - 1));
	nextBtn.addEventListener('click', () => currentQuestionIndex < questions.length - 1 && goToQuestion(currentQuestionIndex + 1));
	submitBtn.addEventListener('click', submitExam);
	viewresultsBtn.addEventListener('click', viewPreviousResults);
	redoBtn.addEventListener('click', startNewExam);
    
	// Add this to your navigation functions (next/prev)
	function goToQuestion(index) {
		saveExamState(); // Save on every navigation
		currentQuestionIndex = index;
		showQuestion();
	}
	
    // Submit exam and show results
    function submitExam() {
		// Calculate score
		score = 0;
		userAnswers.forEach((userAnswer, index) => {
			const originalQuestion = selectedQuestions.find(q => q.id === questions[index].id);
			if (originalQuestion && userAnswer !== null) {
				const userSelectedOption = questions[index].options[userAnswer];
				const isCorrect = originalQuestion.options[originalQuestion.answer] === userSelectedOption;
				if (isCorrect) score++;
			}
		});
		
		// Save attempt
		const attempt = {
			date: new Date().toISOString(),
			questions: selectedQuestions.map((q, i) => ({
				id: q.id,
				question: q.question,
				userAnswer: userAnswers[i] !== null ? questions[i].options[userAnswers[i]] : "Not answered",
				correctAnswer: q.options[q.answer],
				explanation: q.explanation,
				isCorrect: userAnswers[i] === questions[i].answer
			})),
			score: score,
			total: questions.length,
			percentage: Math.round((score / questions.length) * 100),
			isPassed: Math.round((score / questions.length) * 100) >= PASSING_PERCENTAGE
		};
		
		examAttempts.push(attempt);
		localStorage.setItem('java21ExamAttempts', JSON.stringify(examAttempts));
		
		// Hide submit button
		document.getElementById('submit-btn').classList.add('hidden');
		document.body.classList.add('exam-submitted');
		
		// Show results
		showResultsOverview(attempt);
		clearInterval(timerInterval);
	}
    
    // Show comprehensive results
    function showResultsOverview(attempt) {
		const percentage = attempt.percentage;
		const isPassed = attempt.isPassed;
		
		questionText.innerHTML = `
			<div class="result-header">
				<h2>Exam Results (${new Date(attempt.date).toLocaleString()})</h2>
				<div class="score-display ${isPassed ? 'passed' : 'failed'}">
					${attempt.score}/${attempt.total} (${percentage}%)
					<div class="pass-fail">${isPassed ? 'PASSED' : 'FAILED'}</div>
					<div class="minimum">Minimum passing score: ${PASSING_PERCENTAGE}%</div>
				</div>
			</div>
		`;
		
		let resultsHTML = '<div class="results-grid">';
		attempt.questions.forEach((q, index) => {
			resultsHTML += `
				<div class="question-result ${q.isCorrect ? 'correct' : 'incorrect'}">
					<h3>Question ${index + 1}: ${q.question}</h3>
					<div class="user-answer">Your answer: ${q.userAnswer}</div>
					<div class="correct-answer">Correct answer: ${q.correctAnswer}</div>
					<div class="explanation">Explanation: ${q.explanation}</div>
				</div>
			`;
		});
		optionsContainer.innerHTML = resultsHTML;
	}
    
    // Timer functionality
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                submitExam();
                alert('Time is up! Your exam has been submitted.');
            }
        }, 1000);
    }
    
    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timeSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
	
	function viewPreviousResults() {
		const savedResults = localStorage.getItem('java21ExamResults');
		/*if (savedResults) {
			const results = JSON.parse(savedResults);
			
			// Display results (similar to submitExam but without calculation)
			questionText.innerHTML = `
				<div class="result-header">
					<h2>Previous Exam Results</h2>
					<div class="score-display ${results.isPassed ? 'passed' : 'failed'}">
						${results.score}/${results.total} (${results.percentage}%)
						<div class="pass-fail">${results.isPassed ? 'PASSED' : 'FAILED'}</div>
						<div class="minimum">Minimum passing score: ${PASSING_PERCENTAGE}%</div>
					</div>
				</div>
			`;
			
			let resultsHTML = '<div class="results-grid">';
			results.questions.forEach((q, index) => {
				resultsHTML += `
					<div class="question-result ${q.isCorrect ? 'correct' : 'incorrect'}">
						<h3>Question ${index + 1}: ${q.question}</h3>
						<div class="user-answer">Your answer: ${q.userAnswer}</div>
						<div class="correct-answer">Correct answer: ${q.correctAnswer}</div>
						<div class="explanation">Explanation: ${q.explanation}</div>
					</div>
				`;
			});
			optionsContainer.innerHTML = resultsHTML;
		} else {
			alert("No previous results found");
			return;
		}*/
		
		if (examAttempts.length === 0) {
			alert("No previous exam results found");
			return;
		}
		
		// Show most recent attempt by default
		showResultsOverview(examAttempts[examAttempts.length - 1]);
	}
});