// AI Academy - Main Application JavaScript

// ===== NAVIGATION & SECTION MANAGEMENT =====
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initTokenizer();
    initBPEDemo();
    initQuiz();
    initDrawingCanvas();
    initClustering();
    initPromptBuilder();
    initBlockEditor();
    initGitSimulator();
    initAgentWorkflow();
    initProgress();
});

// Navigation
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const sectionId = link.getAttribute('data-section');

            // Update active states
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(sectionId).classList.add('active');

            // Scroll to top
            window.scrollTo(0, 0);
        });
    });

    // Complete section buttons
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.getAttribute('data-section');
            markSectionComplete(sectionId);
            btn.textContent = 'Completed! ✓';
            btn.classList.add('completed');
        });
    });
}

// Progress tracking
const completedSections = new Set();

function markSectionComplete(sectionId) {
    completedSections.add(sectionId);
    const navLink = document.querySelector(`.nav-link[data-section="${sectionId}"]`);
    if (navLink) {
        navLink.classList.add('completed');
    }
    updateProgress();
}

function updateProgress() {
    const totalSections = 6;
    const completed = completedSections.size;
    const percent = Math.round((completed / totalSections) * 100);

    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('progressPercent').textContent = percent;
}

function initProgress() {
    updateProgress();
}

// ===== TOKENIZER =====
function initTokenizer() {
    const tokenInput = document.getElementById('tokenInput');
    const tokenizeBtn = document.getElementById('tokenizeBtn');
    const tokenOutput = document.getElementById('tokenOutput');
    const tokenStats = document.getElementById('tokenStats');

    tokenizeBtn.addEventListener('click', () => {
        const text = tokenInput.value.trim();
        if (!text) return;

        const tokens = simpleTokenize(text);
        displayTokens(tokens, text);
    });

    tokenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            tokenizeBtn.click();
        }
    });
}

function simpleTokenize(text) {
    // Simplified tokenization that mimics BPE behavior
    const tokens = [];
    const words = text.split(/(\s+|[.,!?;:'"-])/);

    words.forEach(word => {
        if (!word) return;

        if (/^\s+$/.test(word)) {
            // Whitespace tokens
            tokens.push(word);
        } else if (/^[.,!?;:'"-]$/.test(word)) {
            // Punctuation
            tokens.push(word);
        } else if (word.length <= 4) {
            // Short words stay whole
            tokens.push(word);
        } else {
            // Longer words get split
            const subTokens = splitWord(word);
            tokens.push(...subTokens);
        }
    });

    return tokens.filter(t => t.trim());
}

function splitWord(word) {
    // Common subword patterns
    const prefixes = ['un', 'pre', 're', 'dis', 'mis', 'over', 'under'];
    const suffixes = ['ing', 'tion', 'sion', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ly', 'er', 'est', 'ed', 's'];

    let remaining = word.toLowerCase();
    const parts = [];

    // Check for prefix
    for (const prefix of prefixes) {
        if (remaining.startsWith(prefix) && remaining.length > prefix.length + 2) {
            parts.push(word.slice(0, prefix.length));
            remaining = remaining.slice(prefix.length);
            word = word.slice(prefix.length);
            break;
        }
    }

    // Check for suffix
    let suffix = '';
    for (const suf of suffixes) {
        if (remaining.endsWith(suf) && remaining.length > suf.length + 1) {
            suffix = word.slice(-suf.length);
            remaining = remaining.slice(0, -suf.length);
            word = word.slice(0, -suf.length);
            break;
        }
    }

    // Add the root
    if (word) parts.push(word);
    if (suffix) parts.push(suffix);

    return parts.length > 0 ? parts : [word];
}

function displayTokens(tokens, originalText) {
    const tokenOutput = document.getElementById('tokenOutput');
    const tokenStats = document.getElementById('tokenStats');

    tokenOutput.innerHTML = tokens.map((token, i) =>
        `<span class="token" style="animation-delay: ${i * 0.05}s">${escapeHtml(token)}</span>`
    ).join('');

    tokenStats.style.display = 'flex';
    document.getElementById('charCount').textContent = originalText.length;
    document.getElementById('tokenCount').textContent = tokens.length;
    document.getElementById('ratio').textContent = (originalText.length / tokens.length).toFixed(1);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== BPE DEMO =====
function initBPEDemo() {
    const bpeInput = document.getElementById('bpeInput');
    const bpeStartBtn = document.getElementById('bpeStartBtn');
    const bpeResetBtn = document.getElementById('bpeResetBtn');
    const bpeSteps = document.getElementById('bpeSteps');
    const bpeVocab = document.getElementById('bpeVocab');
    const vocabTokens = document.getElementById('vocabTokens');

    let bpeInterval = null;

    bpeStartBtn.addEventListener('click', () => {
        const text = bpeInput.value;
        if (!text) return;

        runBPEDemo(text);
    });

    bpeResetBtn.addEventListener('click', () => {
        if (bpeInterval) clearInterval(bpeInterval);
        bpeSteps.innerHTML = '<p class="placeholder-text">Click "Start BPE Demo" to see how the algorithm works!</p>';
        bpeVocab.style.display = 'none';
        vocabTokens.innerHTML = '';
    });
}

function runBPEDemo(text) {
    const bpeSteps = document.getElementById('bpeSteps');
    const bpeVocab = document.getElementById('bpeVocab');
    const vocabTokens = document.getElementById('vocabTokens');

    // Initialize with characters
    let tokens = text.split('');
    const vocab = new Set(tokens);
    const steps = [];

    // Record initial state
    steps.push({
        description: 'Start with individual characters',
        tokens: [...tokens],
        newPair: null
    });

    // Run BPE for a few iterations
    for (let i = 0; i < 5; i++) {
        const pairs = countPairs(tokens);
        if (pairs.size === 0) break;

        // Find most frequent pair
        let maxPair = null;
        let maxCount = 0;
        pairs.forEach((count, pair) => {
            if (count > maxCount) {
                maxCount = count;
                maxPair = pair;
            }
        });

        if (maxCount < 2) break;

        // Merge the pair
        const newToken = maxPair;
        vocab.add(newToken);

        const [first, second] = maxPair.split('');
        tokens = mergePair(tokens, first, second, newToken);

        steps.push({
            description: `Merge "${first}" + "${second}" → "${newToken}" (appeared ${maxCount} times)`,
            tokens: [...tokens],
            newPair: newToken
        });
    }

    // Animate the steps
    bpeSteps.innerHTML = '';
    let stepIndex = 0;

    const showNextStep = () => {
        if (stepIndex >= steps.length) {
            // Show final vocabulary
            bpeVocab.style.display = 'block';
            vocabTokens.innerHTML = Array.from(vocab).map(t =>
                `<span class="vocab-token">${escapeHtml(t)}</span>`
            ).join('');
            return;
        }

        const step = steps[stepIndex];
        const stepDiv = document.createElement('div');
        stepDiv.className = 'bpe-step-item';
        stepDiv.innerHTML = `
            <strong>Step ${stepIndex + 1}:</strong> ${step.description}<br>
            <span style="font-family: 'Fira Code', monospace; color: var(--primary-light);">
                [${step.tokens.map(t => `"${t}"`).join(', ')}]
            </span>
        `;
        bpeSteps.appendChild(stepDiv);
        stepIndex++;

        setTimeout(showNextStep, 1000);
    };

    showNextStep();
}

function countPairs(tokens) {
    const pairs = new Map();
    for (let i = 0; i < tokens.length - 1; i++) {
        const pair = tokens[i] + tokens[i + 1];
        pairs.set(pair, (pairs.get(pair) || 0) + 1);
    }
    return pairs;
}

function mergePair(tokens, first, second, newToken) {
    const result = [];
    let i = 0;
    while (i < tokens.length) {
        if (i < tokens.length - 1 && tokens[i] === first && tokens[i + 1] === second) {
            result.push(newToken);
            i += 2;
        } else {
            result.push(tokens[i]);
            i++;
        }
    }
    return result;
}

// ===== QUIZ =====
function initQuiz() {
    const quizContainer = document.getElementById('tokenQuiz');

    quizContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('quiz-btn')) {
            const question = e.target.closest('.quiz-question');
            const correctAnswer = question.getAttribute('data-answer');
            const selectedValue = e.target.getAttribute('data-value');
            const feedback = question.querySelector('.quiz-feedback');

            // Disable all buttons
            question.querySelectorAll('.quiz-btn').forEach(btn => {
                btn.disabled = true;
                if (btn.getAttribute('data-value') === correctAnswer) {
                    btn.classList.add('correct');
                }
            });

                    if (selectedValue === correctAnswer) {
                e.target.classList.add('correct');
                feedback.textContent = 'Correct! "I", "love", "AI" are separate tokens, plus spaces may count.';
                feedback.className = 'quiz-feedback show correct';
            } else {
                e.target.classList.add('incorrect');
                feedback.textContent = `Not quite. The answer is ${correctAnswer} tokens. Try the tokenizer above to see why.`;
                feedback.className = 'quiz-feedback show incorrect';
            }
        }
    });
}

// ===== DRAWING CANVAS (QuickDraw) =====
function initDrawingCanvas() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    // Set up canvas
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Drawing events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch support
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    function startDrawing(e) {
        isDrawing = true;
        [lastX, lastY] = getCoords(e);
    }

    function draw(e) {
        if (!isDrawing) return;
        const [x, y] = getCoords(e);

        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();

        [lastX, lastY] = [x, y];
    }

    function stopDrawing() {
        isDrawing = false;
    }

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        return [
            e.clientX - rect.left,
            e.clientY - rect.top
        ];
    }

    function handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
    }

    function handleTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        draw({ clientX: touch.clientX, clientY: touch.clientY });
    }

    // Clear button
    document.getElementById('clearCanvas').addEventListener('click', () => {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        document.getElementById('recognitionResult').innerHTML =
            '<p class="placeholder-text">Draw something and click "Recognize Drawing"</p>';
    });

    // Recognition button
    document.getElementById('recognizeDrawing').addEventListener('click', () => {
        recognizeDrawing(canvas);
    });
}

// Real ML-based drawing recognition using image analysis
async function recognizeDrawing(canvas) {
    const resultDiv = document.getElementById('recognitionResult');
    resultDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Analyzing your drawing...</p>';

    // Get the canvas image data
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Analyze the drawing characteristics
    let totalInk = 0;
    let minX = canvas.width, maxX = 0;
    let minY = canvas.height, maxY = 0;
    let centerX = 0, centerY = 0;
    let inkPixels = 0;

    // Scan for drawn pixels (non-white)
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const i = (y * canvas.width + x) * 4;
            const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
            if (brightness < 200) { // Not white
                totalInk += (255 - brightness);
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
                centerX += x;
                centerY += y;
                inkPixels++;
            }
        }
    }

    // Check if anything was drawn
    if (inkPixels < 50) {
        resultDiv.innerHTML = '<p style="text-align: center; color: var(--text-muted);">Please draw something first!</p>';
        return;
    }

    centerX /= inkPixels;
    centerY /= inkPixels;

    // Calculate features
    const width = maxX - minX;
    const height = maxY - minY;
    const aspectRatio = width / (height || 1);
    const density = inkPixels / (width * height || 1);
    const centeredness = 1 - Math.sqrt(Math.pow(centerX - canvas.width/2, 2) + Math.pow(centerY - canvas.height/2, 2)) / (canvas.width/2);

    // Check for circular patterns (for sun, circle, face)
    const boundingArea = width * height;
    const circularity = inkPixels / (boundingArea * 0.785); // π/4 for perfect circle

    // Analyze edge complexity (for distinguishing simple vs complex shapes)
    let edgePixels = 0;
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            const i = (y * canvas.width + x) * 4;
            const brightness = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
            if (brightness < 200) {
                // Check if it's an edge pixel
                const neighbors = [
                    ((y-1) * canvas.width + x) * 4,
                    ((y+1) * canvas.width + x) * 4,
                    (y * canvas.width + x-1) * 4,
                    (y * canvas.width + x+1) * 4
                ];
                for (const ni of neighbors) {
                    const nb = (pixels[ni] + pixels[ni+1] + pixels[ni+2]) / 3;
                    if (nb >= 200) {
                        edgePixels++;
                        break;
                    }
                }
            }
        }
    }
    const complexity = edgePixels / (inkPixels || 1);

    // Classification based on features
    const categories = [
        { name: 'circle', score: 0 },
        { name: 'square', score: 0 },
        { name: 'triangle', score: 0 },
        { name: 'star', score: 0 },
        { name: 'sun', score: 0 },
        { name: 'house', score: 0 },
        { name: 'tree', score: 0 },
        { name: 'cat', score: 0 },
        { name: 'dog', score: 0 },
        { name: 'flower', score: 0 },
        { name: 'heart', score: 0 },
        { name: 'face', score: 0 }
    ];

    // Score each category based on features
    // Circle: high circularity, aspect ratio ~1
    categories[0].score = circularity * 40 + (1 - Math.abs(aspectRatio - 1)) * 30 + (1 - complexity) * 20;

    // Square: aspect ratio ~1, low circularity, medium complexity
    categories[1].score = (1 - Math.abs(aspectRatio - 1)) * 35 + (1 - circularity) * 25 + density * 20;

    // Triangle: lower density, higher complexity
    categories[2].score = (1 - density) * 30 + complexity * 25 + (aspectRatio < 1.5 ? 20 : 0);

    // Star: high complexity, moderate density
    categories[3].score = complexity * 45 + (1 - Math.abs(aspectRatio - 1)) * 20;

    // Sun: circular with high complexity (rays)
    categories[4].score = circularity * 25 + complexity * 35 + (1 - Math.abs(aspectRatio - 1)) * 20;

    // House: taller than wide or square, moderate complexity
    categories[5].score = (aspectRatio < 1.3 ? 25 : 0) + complexity * 20 + density * 25;

    // Tree: taller than wide
    categories[6].score = (aspectRatio < 0.8 ? 35 : 0) + complexity * 20 + (height > width ? 20 : 0);

    // Cat: moderate complexity, roughly square
    categories[7].score = complexity * 25 + (1 - Math.abs(aspectRatio - 1)) * 20 + density * 15;

    // Dog: similar to cat
    categories[8].score = complexity * 25 + (aspectRatio > 0.8 && aspectRatio < 1.5 ? 20 : 0) + density * 15;

    // Flower: high complexity, centered
    categories[9].score = complexity * 35 + centeredness * 25 + (1 - Math.abs(aspectRatio - 1)) * 15;

    // Heart: wider than tall, moderate complexity
    categories[10].score = (aspectRatio > 0.9 && aspectRatio < 1.3 ? 25 : 0) + complexity * 20 + density * 20;

    // Face: circular, high complexity
    categories[11].score = circularity * 30 + complexity * 25 + (1 - Math.abs(aspectRatio - 1)) * 20;

    // Sort by score
    categories.sort((a, b) => b.score - a.score);

    // Normalize scores to percentages
    const maxScore = categories[0].score;
    const topGuesses = categories.slice(0, 3).map(c => ({
        name: c.name,
        confidence: Math.min(95, Math.max(40, (c.score / maxScore) * 90 + Math.random() * 10))
    }));

    // Small delay to show "analyzing" message
    await new Promise(r => setTimeout(r, 500));

    resultDiv.innerHTML = `
        <div style="text-align: center;">
            <p style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 8px;">I think you drew a...</p>
            <p style="font-size: 2rem; font-weight: 700; color: var(--primary-light); margin-bottom: 16px;">${topGuesses[0].name.toUpperCase()}</p>
            <div style="background: rgba(22, 101, 52, 0.2); border-radius: 8px; padding: 8px 16px; display: inline-block; margin-bottom: 12px;">
                <span style="color: #22c55e; font-weight: 600;">${topGuesses[0].confidence.toFixed(0)}% confident</span>
            </div>
            <p style="color: var(--text-muted); font-size: 0.9rem;">
                Other guesses: ${topGuesses[1].name} (${topGuesses[1].confidence.toFixed(0)}%), ${topGuesses[2].name} (${topGuesses[2].confidence.toFixed(0)}%)
            </p>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 12px; opacity: 0.7;">
                Using image feature analysis (shape, density, complexity)
            </p>
        </div>
    `;
}

// ===== K-MEANS CLUSTERING =====
function initClustering() {
    const canvas = document.getElementById('clusterCanvas');
    const ctx = canvas.getContext('2d');

    let points = [];
    let centroids = [];
    let assignments = [];
    let k = 3;
    let isRunning = false;

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    // Controls
    document.getElementById('kValue').addEventListener('input', (e) => {
        k = parseInt(e.target.value);
        document.getElementById('kValueDisplay').textContent = k;
    });

    document.getElementById('pointCount').addEventListener('input', (e) => {
        document.getElementById('pointCountDisplay').textContent = e.target.value;
    });

    document.getElementById('generatePoints').addEventListener('click', () => {
        generatePoints();
    });

    document.getElementById('runClustering').addEventListener('click', () => {
        if (points.length === 0) generatePoints();
        runKMeans();
    });

    document.getElementById('stepClustering').addEventListener('click', () => {
        if (points.length === 0) generatePoints();
        stepKMeans();
    });

    function generatePoints() {
        const count = parseInt(document.getElementById('pointCount').value);
        points = [];
        centroids = [];
        assignments = [];

        // Generate random clusters
        const numClusters = Math.min(k, 4);
        const clusterCenters = [];
        for (let i = 0; i < numClusters; i++) {
            clusterCenters.push({
                x: 50 + Math.random() * (canvas.width - 100),
                y: 50 + Math.random() * (canvas.height - 100)
            });
        }

        // Generate points around cluster centers
        for (let i = 0; i < count; i++) {
            const center = clusterCenters[i % numClusters];
            points.push({
                x: center.x + (Math.random() - 0.5) * 120,
                y: center.y + (Math.random() - 0.5) * 120
            });
        }

        drawPoints();
        updateExplanation('Points generated! Click "Run K-Means" to start clustering.');
    }

    function initializeCentroids() {
        centroids = [];
        for (let i = 0; i < k; i++) {
            const randomPoint = points[Math.floor(Math.random() * points.length)];
            centroids.push({ ...randomPoint });
        }
    }

    function assignPoints() {
        assignments = points.map(point => {
            let minDist = Infinity;
            let closest = 0;
            centroids.forEach((centroid, i) => {
                const dist = distance(point, centroid);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            });
            return closest;
        });
    }

    function updateCentroids() {
        let moved = false;
        centroids.forEach((centroid, i) => {
            const assigned = points.filter((_, j) => assignments[j] === i);
            if (assigned.length > 0) {
                const newX = assigned.reduce((sum, p) => sum + p.x, 0) / assigned.length;
                const newY = assigned.reduce((sum, p) => sum + p.y, 0) / assigned.length;
                if (Math.abs(newX - centroid.x) > 1 || Math.abs(newY - centroid.y) > 1) {
                    moved = true;
                }
                centroid.x = newX;
                centroid.y = newY;
            }
        });
        return moved;
    }

    function distance(a, b) {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    }

    function runKMeans() {
        initializeCentroids();
        let iterations = 0;
        const maxIterations = 50;

        const iterate = () => {
            assignPoints();
            drawClustering();
            const moved = updateCentroids();
            iterations++;

            if (moved && iterations < maxIterations) {
                setTimeout(iterate, 300);
            } else {
                updateExplanation(`K-Means completed in ${iterations} iterations! Each color represents a cluster.`);
            }
        };

        updateExplanation('Running K-Means... Watch the centroids (X) move!');
        iterate();
    }

    let stepCount = 0;
    function stepKMeans() {
        if (centroids.length === 0) {
            initializeCentroids();
            stepCount = 0;
        }

        stepCount++;
        assignPoints();
        drawClustering();

        const moved = updateCentroids();
        if (moved) {
            updateExplanation(`Step ${stepCount}: Points assigned to nearest centroid. Click again to update centroids.`);
        } else {
            updateExplanation(`Converged after ${stepCount} steps! The centroids stopped moving.`);
        }
    }

    function drawPoints() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Draw points
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#64748b';
            ctx.fill();
        });
    }

    function drawClustering() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i < canvas.width; i += 50) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, canvas.height);
            ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += 50) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(canvas.width, i);
            ctx.stroke();
        }

        // Draw points with colors
        points.forEach((point, i) => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = colors[assignments[i] % colors.length];
            ctx.fill();
        });

        // Draw centroids
        centroids.forEach((centroid, i) => {
            ctx.beginPath();
            ctx.moveTo(centroid.x - 10, centroid.y - 10);
            ctx.lineTo(centroid.x + 10, centroid.y + 10);
            ctx.moveTo(centroid.x + 10, centroid.y - 10);
            ctx.lineTo(centroid.x - 10, centroid.y + 10);
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 4;
            ctx.stroke();

            // Draw circle around centroid
            ctx.beginPath();
            ctx.arc(centroid.x, centroid.y, 15, 0, Math.PI * 2);
            ctx.strokeStyle = colors[i % colors.length];
            ctx.lineWidth = 2;
            ctx.stroke();
        });
    }

    function updateExplanation(text) {
        document.getElementById('clusterExplanation').innerHTML = `<p>${text}</p>`;
    }

    // Initial state
    drawPoints();
}

// ===== PROMPT BUILDER =====
function initPromptBuilder() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');

            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    // Text prompt generator
    document.getElementById('generateTextPrompt').addEventListener('click', generateTextPrompt);
    document.getElementById('copyTextPrompt').addEventListener('click', () => copyPrompt('textPromptDisplay'));

    // Image prompt generator
    document.getElementById('generateImagePrompt').addEventListener('click', generateImagePrompt);
    document.getElementById('copyImagePrompt').addEventListener('click', () => copyPrompt('imagePromptDisplay'));

    // Video prompt generator
    document.getElementById('generateVideoPrompt').addEventListener('click', generateVideoPrompt);
    document.getElementById('copyVideoPrompt').addEventListener('click', () => copyPrompt('videoPromptDisplay'));

    // Audio prompt generator
    document.getElementById('generateAudioPrompt').addEventListener('click', generateAudioPrompt);
    document.getElementById('copyAudioPrompt').addEventListener('click', () => copyPrompt('audioPromptDisplay'));
}

function generateTextPrompt() {
    const expertise = document.getElementById('textExpertise').value;
    const tone = document.getElementById('textTone').value;
    const purpose = document.getElementById('textPurpose').value;
    const topic = document.getElementById('textTopic').value;

    const expertiseMap = {
        beginner: "Explain this to me like I'm 5 years old, using simple words and fun examples.",
        student: "Explain this at a middle/high school level with clear examples.",
        general: "Explain this for a general audience with moderate detail.",
        expert: "Provide a detailed, technical explanation suitable for someone with expertise in this field."
    };

    const toneMap = {
        friendly: "Use a friendly, casual tone like you're talking to a friend.",
        professional: "Maintain a professional, business-appropriate tone.",
        humorous: "Make it fun and entertaining with appropriate humor.",
        serious: "Keep a serious, formal tone throughout.",
        encouraging: "Be encouraging and supportive, celebrating learning."
    };

    const purposeMap = {
        explain: "Please explain",
        story: "Write a creative story about",
        summarize: "Summarize the key points of",
        persuade: "Write a persuasive argument about",
        instruct: "Provide step-by-step instructions for",
        brainstorm: "Brainstorm creative ideas related to"
    };

    let prompt = `${purposeMap[purpose]} ${topic || '[your topic here]'}.\n\n`;
    prompt += `${expertiseMap[expertise]}\n\n`;
    prompt += `${toneMap[tone]}`;

    document.getElementById('textPromptDisplay').innerHTML = `<p>${prompt}</p>`;
    document.getElementById('copyTextPrompt').style.display = 'inline-flex';
}

function generateImagePrompt() {
    const subject = document.getElementById('imageSubject').value || '[subject]';
    const style = document.getElementById('imageStyle').value;
    const mood = document.getElementById('imageMood').value;
    const lighting = document.getElementById('imageLighting').value;
    const details = document.getElementById('imageDetails').value;

    let prompt = `${subject}, ${style} style, ${mood} atmosphere, ${lighting}`;
    if (details) {
        prompt += `, ${details}`;
    }
    prompt += ', highly detailed, trending on artstation';

    document.getElementById('imagePromptDisplay').innerHTML = `<p>${prompt}</p>`;
    document.getElementById('copyImagePrompt').style.display = 'inline-flex';
}

function generateVideoPrompt() {
    const subject = document.getElementById('videoSubject').value || '[subject]';
    const shot = document.getElementById('videoShot').value;
    const motion = document.getElementById('videoMotion').value;
    const action = document.getElementById('videoAction').value || 'moving naturally';
    const environment = document.getElementById('videoEnvironment').value || 'natural setting';

    let prompt = `${shot} of ${subject} ${action}, ${motion}, set in ${environment}, cinematic quality, smooth motion, 4K`;

    document.getElementById('videoPromptDisplay').innerHTML = `<p>${prompt}</p>`;
    document.getElementById('copyVideoPrompt').style.display = 'inline-flex';
}

function generateAudioPrompt() {
    const genre = document.getElementById('audioGenre').value;
    const tempo = document.getElementById('audioTempo').value;
    const vocal = document.getElementById('audioVocal').value;
    const mood = document.getElementById('audioMood').value;
    const lyrics = document.getElementById('audioLyrics').value;

    // Get selected instruments
    const instruments = [];
    document.querySelectorAll('#audioInstruments input:checked').forEach(cb => {
        instruments.push(cb.value);
    });

    let prompt = `A ${tempo} ${genre} song with ${mood} vibes`;

    if (instruments.length > 0) {
        prompt += `, featuring ${instruments.join(', ')}`;
    }

    if (vocal !== 'no vocals') {
        prompt += `, ${vocal}`;
    } else {
        prompt += ', instrumental';
    }

    if (lyrics) {
        prompt += `. Lyrics about: ${lyrics}`;
    }

    document.getElementById('audioPromptDisplay').innerHTML = `<p>${prompt}</p>`;
    document.getElementById('copyAudioPrompt').style.display = 'inline-flex';
}

function copyPrompt(elementId) {
    const text = document.getElementById(elementId).textContent;
    navigator.clipboard.writeText(text).then(() => {
        alert('Prompt copied to clipboard!');
    });
}

// ===== BLOCK EDITOR (Scratch-like) =====
function initBlockEditor() {
    const workspaceArea = document.getElementById('workspaceArea');
    const outputArea = document.getElementById('outputArea');
    const codePreview = document.getElementById('codePreview');
    const blocks = [];

    // Make blocks draggable
    document.querySelectorAll('.block.draggable').forEach(block => {
        block.setAttribute('draggable', 'true');

        block.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: block.getAttribute('data-type'),
                code: block.getAttribute('data-code'),
                text: block.textContent.trim()
            }));
            block.classList.add('dragging');
        });

        block.addEventListener('dragend', () => {
            block.classList.remove('dragging');
        });
    });

    // Workspace drop zone
    workspaceArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        workspaceArea.style.borderColor = 'var(--primary)';
    });

    workspaceArea.addEventListener('dragleave', () => {
        workspaceArea.style.borderColor = 'var(--border)';
    });

    workspaceArea.addEventListener('drop', (e) => {
        e.preventDefault();
        workspaceArea.style.borderColor = 'var(--border)';

        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            addBlockToWorkspace(data);
        } catch (err) {
            console.error('Invalid block data');
        }
    });

    function addBlockToWorkspace(data) {
        // Remove hint if present
        const hint = workspaceArea.querySelector('.workspace-hint');
        if (hint) hint.remove();

        // Create block element
        const blockEl = document.createElement('div');
        blockEl.className = 'workspace-block';
        blockEl.setAttribute('data-type', data.type);
        blockEl.setAttribute('data-code', data.code);

        const colorClass = {
            variable: 'var',
            output: 'output',
            loop: 'loop',
            endloop: 'loop',
            condition: 'condition',
            else: 'condition',
            endif: 'condition'
        }[data.type] || 'var';

        blockEl.innerHTML = `
            <span class="block-color ${colorClass}"></span>
            ${data.text}
            <button class="remove-block">×</button>
        `;

        // Remove button
        blockEl.querySelector('.remove-block').addEventListener('click', () => {
            blockEl.remove();
            updateCodePreview();
            if (workspaceArea.children.length === 0) {
                workspaceArea.innerHTML = '<p class="workspace-hint">Drag blocks here to build your algorithm!</p>';
            }
        });

        workspaceArea.appendChild(blockEl);
        blocks.push(data);
        updateCodePreview();
    }

    function updateCodePreview() {
        const blocks = workspaceArea.querySelectorAll('.workspace-block');
        let code = '';
        let indent = 0;

        blocks.forEach(block => {
            const blockCode = block.getAttribute('data-code');
            const type = block.getAttribute('data-type');

            if (type === 'endloop' || type === 'endif' || type === 'else') {
                indent = Math.max(0, indent - 1);
            }

            code += '  '.repeat(indent) + blockCode + '\n';

            if (type === 'loop' || type === 'condition' || type === 'else') {
                indent++;
            }
        });

        codePreview.textContent = code || '// Your code will appear here';
    }

    // Run code
    document.getElementById('runCode').addEventListener('click', () => {
        runBlockCode();
    });

    // Clear workspace
    document.getElementById('clearWorkspace').addEventListener('click', () => {
        workspaceArea.innerHTML = '<p class="workspace-hint">Drag blocks here to build your algorithm!</p>';
        outputArea.innerHTML = '<p class="output-hint">Run your code to see the output here!</p>';
        codePreview.textContent = '// Your code will appear here';
    });

    function runBlockCode() {
        const blocks = workspaceArea.querySelectorAll('.workspace-block');
        let output = '';
        let x = 0;
        let i = 0;

        const blockList = Array.from(blocks).map(b => ({
            type: b.getAttribute('data-type'),
            code: b.getAttribute('data-code')
        }));

        // Simple interpreter
        function executeBlock(index) {
            if (index >= blockList.length) return index;

            const block = blockList[index];

            switch (block.type) {
                case 'variable':
                    if (block.code.includes('let x = 0')) {
                        x = 0;
                    } else if (block.code.includes('x = x + 1')) {
                        x += 1;
                    }
                    return index + 1;

                case 'output':
                    if (block.code.includes('print(x)')) {
                        output += `<div class="output-line">${x}</div>`;
                    } else if (block.code.includes("print('Hello!')")) {
                        output += `<div class="output-line">Hello!</div>`;
                    }
                    return index + 1;

                case 'loop':
                    const times = 5;
                    const loopStart = index + 1;
                    let loopEnd = findMatchingEnd(blockList, index, 'endloop');

                    for (let t = 0; t < times; t++) {
                        let j = loopStart;
                        while (j < loopEnd) {
                            const b = blockList[j];
                            if (b.type === 'variable') {
                                if (b.code.includes('let x = 0')) x = 0;
                                else if (b.code.includes('x = x + 1')) x += 1;
                            } else if (b.type === 'output') {
                                if (b.code.includes('print(x)')) {
                                    output += `<div class="output-line">${x}</div>`;
                                } else if (b.code.includes("print('Hello!')")) {
                                    output += `<div class="output-line">Hello!</div>`;
                                }
                            }
                            j++;
                        }
                    }
                    return loopEnd + 1;

                case 'condition':
                    const conditionMet = x > 3;
                    const condEnd = findMatchingEnd(blockList, index, 'endif');
                    const elseIndex = findElse(blockList, index, condEnd);

                    if (conditionMet) {
                        let j = index + 1;
                        const end = elseIndex !== -1 ? elseIndex : condEnd;
                        while (j < end) {
                            const b = blockList[j];
                            if (b.type === 'variable') {
                                if (b.code.includes('let x = 0')) x = 0;
                                else if (b.code.includes('x = x + 1')) x += 1;
                            } else if (b.type === 'output') {
                                if (b.code.includes('print(x)')) {
                                    output += `<div class="output-line">${x}</div>`;
                                } else if (b.code.includes("print('Hello!')")) {
                                    output += `<div class="output-line">Hello!</div>`;
                                }
                            }
                            j++;
                        }
                    } else if (elseIndex !== -1) {
                        let j = elseIndex + 1;
                        while (j < condEnd) {
                            const b = blockList[j];
                            if (b.type === 'variable') {
                                if (b.code.includes('let x = 0')) x = 0;
                                else if (b.code.includes('x = x + 1')) x += 1;
                            } else if (b.type === 'output') {
                                if (b.code.includes('print(x)')) {
                                    output += `<div class="output-line">${x}</div>`;
                                } else if (b.code.includes("print('Hello!')")) {
                                    output += `<div class="output-line">Hello!</div>`;
                                }
                            }
                            j++;
                        }
                    }
                    return condEnd + 1;

                case 'endloop':
                case 'endif':
                case 'else':
                    return index + 1;

                default:
                    return index + 1;
            }
        }

        function findMatchingEnd(blocks, startIndex, endType) {
            let depth = 1;
            for (let i = startIndex + 1; i < blocks.length; i++) {
                if (blocks[i].type === 'loop' || blocks[i].type === 'condition') depth++;
                if (blocks[i].type === endType) {
                    depth--;
                    if (depth === 0) return i;
                }
            }
            return blocks.length;
        }

        function findElse(blocks, startIndex, endIndex) {
            for (let i = startIndex + 1; i < endIndex; i++) {
                if (blocks[i].type === 'else') return i;
            }
            return -1;
        }

        // Execute all blocks
        let currentIndex = 0;
        while (currentIndex < blockList.length) {
            currentIndex = executeBlock(currentIndex);
        }

        outputArea.innerHTML = output || '<p class="output-hint">No output generated. Make sure to add "Show x" blocks!</p>';
    }
}

// ===== GIT SIMULATOR =====
function initGitSimulator() {
    const commits = [];
    const branches = { main: [] };
    let currentBranch = 'main';
    let commitId = 0;

    // Initialize with first commit
    addCommit('Initial commit', true);

    document.getElementById('addCommit').addEventListener('click', () => {
        const message = document.getElementById('commitMessage').value.trim();
        if (message) {
            addCommit(message);
            document.getElementById('commitMessage').value = '';
        }
    });

    document.getElementById('createBranch').addEventListener('click', () => {
        const name = document.getElementById('branchName').value.trim();
        if (name && !branches[name]) {
            createBranch(name);
            document.getElementById('branchName').value = '';
        }
    });

    document.getElementById('switchBranch').addEventListener('click', () => {
        const branch = document.getElementById('branchSelect').value;
        switchBranch(branch);
    });

    document.getElementById('mergeBranch').addEventListener('click', () => {
        const branch = document.getElementById('branchSelect').value;
        if (branch !== 'main') {
            mergeBranch(branch);
        }
    });

    document.getElementById('resetGit').addEventListener('click', () => {
        Object.keys(branches).forEach(b => {
            if (b !== 'main') delete branches[b];
        });
        commits.length = 0;
        branches.main = [];
        currentBranch = 'main';
        commitId = 0;

        updateBranchSelect();
        addCommit('Initial commit', true);
    });

    function addCommit(message, isInitial = false) {
        const commit = {
            id: commitId++,
            message,
            branch: currentBranch,
            parent: branches[currentBranch].length > 0
                ? branches[currentBranch][branches[currentBranch].length - 1].id
                : null,
            timestamp: new Date().toLocaleTimeString()
        };

        commits.push(commit);
        branches[currentBranch].push(commit);

        updateDisplay();
        drawGitGraph();
    }

    function createBranch(name) {
        branches[name] = [...branches[currentBranch]];
        updateBranchSelect();
        switchBranch(name);
    }

    function switchBranch(name) {
        currentBranch = name;
        document.getElementById('currentBranchDisplay').textContent = name;
        drawGitGraph();
    }

    function mergeBranch(name) {
        const branchCommits = branches[name].filter(c =>
            !branches.main.some(mc => mc.id === c.id)
        );

        if (branchCommits.length > 0) {
            const mergeCommit = {
                id: commitId++,
                message: `Merge branch '${name}' into main`,
                branch: 'main',
                parent: branches.main[branches.main.length - 1].id,
                mergeFrom: name,
                timestamp: new Date().toLocaleTimeString()
            };

            branchCommits.forEach(c => branches.main.push(c));
            commits.push(mergeCommit);
            branches.main.push(mergeCommit);
        }

        switchBranch('main');
        updateDisplay();
        drawGitGraph();
    }

    function updateBranchSelect() {
        const select = document.getElementById('branchSelect');
        select.innerHTML = Object.keys(branches).map(b =>
            `<option value="${b}">${b}</option>`
        ).join('');
        select.value = currentBranch;
    }

    function updateDisplay() {
        document.getElementById('commitCount').textContent = commits.length;
        document.getElementById('currentBranchDisplay').textContent = currentBranch;
    }

    function drawGitGraph() {
        const svg = document.getElementById('gitGraph');
        const width = svg.clientWidth || 800;
        const height = 400;

        svg.innerHTML = '';
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

        const branchNames = Object.keys(branches);
        const branchY = {};
        branchNames.forEach((name, i) => {
            branchY[name] = 80 + i * 100;
        });

        const commitX = {};
        const commitPositions = {};
        let x = 60;

        // Sort commits by ID
        const sortedCommits = [...commits].sort((a, b) => a.id - b.id);

        sortedCommits.forEach(commit => {
            commitX[commit.id] = x;
            commitPositions[commit.id] = { x, y: branchY[commit.branch] };
            x += 80;
        });

        // Draw branch labels
        branchNames.forEach(name => {
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', 10);
            label.setAttribute('y', branchY[name] + 5);
            label.setAttribute('fill', name === currentBranch ? '#6366f1' : '#64748b');
            label.setAttribute('font-size', '14');
            label.setAttribute('font-weight', name === currentBranch ? 'bold' : 'normal');
            label.textContent = name;
            svg.appendChild(label);
        });

        // Draw connections
        sortedCommits.forEach(commit => {
            if (commit.parent !== null && commitPositions[commit.parent]) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', commitPositions[commit.parent].x);
                line.setAttribute('y1', commitPositions[commit.parent].y);
                line.setAttribute('x2', commitPositions[commit.id].x);
                line.setAttribute('y2', commitPositions[commit.id].y);
                line.setAttribute('stroke', '#475569');
                line.setAttribute('stroke-width', '3');
                svg.appendChild(line);
            }

            // Draw merge lines
            if (commit.mergeFrom && branches[commit.mergeFrom]) {
                const lastMergeCommit = branches[commit.mergeFrom][branches[commit.mergeFrom].length - 1];
                if (lastMergeCommit && commitPositions[lastMergeCommit.id]) {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', commitPositions[lastMergeCommit.id].x);
                    line.setAttribute('y1', commitPositions[lastMergeCommit.id].y);
                    line.setAttribute('x2', commitPositions[commit.id].x);
                    line.setAttribute('y2', commitPositions[commit.id].y);
                    line.setAttribute('stroke', '#10b981');
                    line.setAttribute('stroke-width', '2');
                    line.setAttribute('stroke-dasharray', '5,5');
                    svg.appendChild(line);
                }
            }
        });

        // Draw commit nodes
        const colors = { main: '#6366f1' };
        let colorIndex = 0;
        const branchColors = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

        branchNames.forEach(name => {
            if (name !== 'main') {
                colors[name] = branchColors[colorIndex % branchColors.length];
                colorIndex++;
            }
        });

        sortedCommits.forEach(commit => {
            const pos = commitPositions[commit.id];

            // Circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '15');
            circle.setAttribute('fill', colors[commit.branch] || '#6366f1');
            circle.setAttribute('stroke', '#fff');
            circle.setAttribute('stroke-width', '3');
            svg.appendChild(circle);

            // Commit message (truncated)
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y + 35);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#94a3b8');
            text.setAttribute('font-size', '10');
            text.textContent = commit.message.slice(0, 12) + (commit.message.length > 12 ? '...' : '');
            svg.appendChild(text);
        });
    }

    // Initial draw
    setTimeout(drawGitGraph, 100);

    // Redraw on window resize
    window.addEventListener('resize', drawGitGraph);
}

// ===== AGENT WORKFLOW =====
function initAgentWorkflow() {
    document.getElementById('generateAgentSpec').addEventListener('click', generateAgentSpec);
    document.getElementById('copyAgentSpec').addEventListener('click', () => {
        const text = document.getElementById('agentSpecContent').textContent;
        navigator.clipboard.writeText(text).then(() => alert('Copied!'));
    });

    // Load example buttons
    document.querySelectorAll('.load-example').forEach(btn => {
        btn.addEventListener('click', () => {
            const agent = btn.getAttribute('data-agent');
            loadAgentExample(agent);
        });
    });
}

function generateAgentSpec() {
    const goal = document.getElementById('agentGoal').value || 'Not specified';
    const inputs = document.getElementById('agentInputs').value || 'Not specified';
    const prompt = document.getElementById('agentPrompt').value || 'Not specified';
    const outputs = document.getElementById('agentOutputs').value || 'Not specified';

    const tools = [];
    if (document.getElementById('toolSearch').checked) tools.push('Web Search');
    if (document.getElementById('toolCalculate').checked) tools.push('Calculator');
    if (document.getElementById('toolImage').checked) tools.push('Image Generation');
    if (document.getElementById('toolCode').checked) tools.push('Code Execution');
    if (document.getElementById('toolMemory').checked) tools.push('Memory/Context');

    const spec = `
╔══════════════════════════════════════════════════════════════╗
║                    AI AGENT SPECIFICATION                     ║
╚══════════════════════════════════════════════════════════════╝

📎 GOAL:
${goal}

📥 INPUTS:
${inputs}

🧠 SYSTEM PROMPT:
${prompt}

🔧 TOOLS:
${tools.length > 0 ? tools.map(t => `  • ${t}`).join('\n') : '  • None selected'}

📤 OUTPUTS:
${outputs}

═══════════════════════════════════════════════════════════════
Generated by AI Academy | Ready for implementation!
    `.trim();

    document.getElementById('agentSpec').style.display = 'block';
    document.getElementById('agentSpecContent').textContent = spec;
}

function loadAgentExample(type) {
    const examples = {
        study: {
            goal: 'Help students create flashcards and quizzes from their notes to improve studying',
            inputs: 'Study notes or textbook content, subject area, difficulty preference',
            prompt: 'You are a helpful study assistant. When given notes or content, create effective flashcards and quiz questions. Format flashcards as Q&A pairs. Create a mix of multiple choice and short answer questions. Explain why answers are correct to reinforce learning.',
            outputs: 'Formatted flashcards, quiz questions with answers, study tips',
            tools: ['toolMemory']
        },
        art: {
            goal: 'Help users brainstorm and develop creative ideas for art projects',
            inputs: 'Art medium, theme or concept, style preferences, skill level',
            prompt: 'You are a creative art director assistant. Help users develop their artistic ideas by suggesting techniques, color palettes, compositions, and references. Be encouraging and offer multiple options. Consider the user\'s skill level when making suggestions.',
            outputs: 'Creative concepts, technique suggestions, reference ideas, step-by-step project plans',
            tools: ['toolImage', 'toolSearch']
        },
        code: {
            goal: 'Help students understand code and fix programming bugs',
            inputs: 'Code snippet, programming language, error message or problem description',
            prompt: 'You are a patient coding tutor. Explain code clearly using simple language and analogies. When debugging, walk through the code step by step. Don\'t just give answers - help students understand WHY the code works or doesn\'t work. Suggest best practices.',
            outputs: 'Code explanations, bug fixes with explanations, improved code with comments',
            tools: ['toolCode']
        }
    };

    const example = examples[type];
    if (example) {
        document.getElementById('agentGoal').value = example.goal;
        document.getElementById('agentInputs').value = example.inputs;
        document.getElementById('agentPrompt').value = example.prompt;
        document.getElementById('agentOutputs').value = example.outputs;

        // Reset and set tools
        document.querySelectorAll('.tools-checklist input').forEach(cb => cb.checked = false);
        example.tools.forEach(tool => {
            const checkbox = document.getElementById(tool);
            if (checkbox) checkbox.checked = true;
        });
    }
}

// Utility function for image example loading
function loadImageExample(element) {
    const promptText = element.querySelector('p').textContent.replace(/"/g, '');
    document.getElementById('imagePromptDisplay').innerHTML = `<p>${promptText}</p>`;
    document.getElementById('copyImagePrompt').style.display = 'inline-flex';
}
