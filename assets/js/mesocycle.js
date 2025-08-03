let exercises = [];
let currentPlan = null;

// Add exercise input row
function addExercise() {
    const container = document.getElementById('exerciseList');
    const index = exercises.length;
    const div = document.createElement('div');
    div.classList.add('exercise-row');
    div.innerHTML = `
        <input type="text" placeholder="Exercise Name" id="exName-${index}">
        <input type="number" placeholder="Sets" id="exSets-${index}" value="3" min="1">
        <button onclick="removeExercise(${index})">❌</button>
    `;
    container.appendChild(div);
    exercises.push({ name: "", sets: 3 });
}

function removeExercise(index) {
    exercises.splice(index, 1);
    document.getElementById('exerciseList').children[index].remove();
}

// Generate advanced plan
function generateAdvancedPlan() {
    const weeks = parseInt(document.getElementById('weeks').value);
    const baseSets = parseInt(document.getElementById('baseSets').value);
    const progressionRate = parseInt(document.getElementById('progressionRate').value);
    const startRIR = parseInt(document.getElementById('startRIR').value);
    const endRIR = parseInt(document.getElementById('endRIR').value);

    // Update exercise names and sets
    exercises = exercises.map((ex, i) => ({
        name: document.getElementById(`exName-${i}`).value || `Exercise ${i+1}`,
        sets: parseInt(document.getElementById(`exSets-${i}`).value)
    }));

    const weeksArray = [];
    for (let i = 0; i < weeks; i++) {
        const weekSets = baseSets + i * progressionRate;
        const rir = Math.max(startRIR - Math.floor((i / weeks) * (startRIR - endRIR)), endRIR);
        weeksArray.push({ week: i + 1, sets: weekSets, rir });
    }

    currentPlan = {
        weeks,
        baseSets,
        progressionRate,
        startRIR,
        endRIR,
        exercises,
        weeksArray
    };

    renderChart(weeksArray);
}

// Render progression chart
function renderChart(weeksArray) {
    const ctx = document.getElementById('progressionChart').getContext('2d');
    if (window.progressionChart) window.progressionChart.destroy();
    window.progressionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeksArray.map(w => `Week ${w.week}`),
            datasets: [
                {
                    label: 'Sets',
                    data: weeksArray.map(w => w.sets),
                    borderColor: '#ff6b35',
                    fill: false,
                    tension: 0.3
                },
                {
                    label: 'RIR',
                    data: weeksArray.map(w => w.rir),
                    borderColor: '#ff914d',
                    fill: false,
                    tension: 0.3
                }
            ]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: '#fff' } } }, scales: { x: { ticks: { color: '#fff' } }, y: { ticks: { color: '#fff' } } } }
    });
}

// Save advanced plan to IndexedDB and return
async function saveAdvancedPlan() {
    if (!currentPlan) {
        alert("Please generate a plan first.");
        return;
    }
    await savePlanToDB(currentPlan);
    window.location.href = "index.html";
}

// IndexedDB helpers
async function savePlanToDB(plan) {
    await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction("preferences", "readwrite");
        tx.objectStore("preferences").put({ id: 2, plan });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject("Failed to save plan");
    });
}
