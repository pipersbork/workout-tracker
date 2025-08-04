/* ===========================
   RESET & BASE
=========================== */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Arial', sans-serif;
    background: linear-gradient(-45deg, #111, #1a1a1a, #222, #111);
    background-size: 400% 400%;
    animation: gradientBG 8s ease infinite;
    color: #fff;
    height: 100vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
}

@keyframes gradientBG {
    0% {background-position: 0% 50%;}
    50% {background-position: 100% 50%;}
    100% {background-position: 0% 50%;}
}

.hidden {
    display: none !important;
}

/* ===========================
   CONTAINER
=========================== */
.container {
    width: 100%;
    height: 100%;
    text-align: center;
    position: relative;
    overflow-y: auto;
    padding-bottom: 30px;
}

/* ===========================
   PROGRESS BAR
=========================== */
.progress-bar {
    width: 80%;
    background: #333;
    height: 8px;
    border-radius: 5px;
    overflow: hidden;
    margin: 20px auto;
}
.progress {
    width: 0%;
    height: 100%;
    background: linear-gradient(90deg, #ff6b35, #ff914d);
    transition: width 0.4s ease;
}

/* ===========================
   ONBOARDING STEPS
=========================== */
.step {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) scale(0.95);
    width: 90%;
    max-width: 400px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.6s ease, transform 0.6s ease;
}
.step.active {
    opacity: 1;
    pointer-events: auto;
    transform: translate(-50%, -50%) scale(1);
}

.main-title {
    font-size: 2.8rem;
    font-weight: bold;
    letter-spacing: 6px;
    margin-bottom: 10px;
    color: #ff6b35;
}
.divider {
    width: 80px;
    height: 3px;
    background-color: #ff6b35;
    margin: 10px auto 20px auto;
}
.tagline {
    font-size: 1rem;
    margin-bottom: 30px;
}

/* ===========================
   BUTTONS
=========================== */
.cta-button {
    display: inline-block;
    width: 100%;
    padding: 14px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #fff;
    background: linear-gradient(45deg, #ff6b35, #ff914d);
    border: none;
    border-radius: 8px;
    margin-top: 15px;
    transition: transform 0.2s ease, background 0.3s ease;
    cursor: pointer;
}
.cta-button:hover {
    transform: scale(1.05);
    background: linear-gradient(45deg, #ff914d, #ff6b35);
}

/* ===========================
   CARD GROUP (Horizontal Scroll Removed)
=========================== */
.card-group {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
    margin: 20px 0;
}
.goal-card {
    background: #1c1c1e;
    border: 2px solid #333;
    border-radius: 10px;
    padding: 20px 10px;
    text-align: center;
    color: #fff;
    transition: transform 0.3s, border-color 0.3s;
    cursor: pointer;
}
.goal-card:hover {
    transform: scale(1.05);
    border-color: #ff6b35;
}
.goal-card.active {
    border-color: #ff6b35;
    background: #292929;
}
.goal-card .icon {
    font-size: 1.8rem;
    margin-bottom: 8px;
}

/* ===========================
   DASHBOARD
=========================== */
#dashboard {
    width: 100%;
    max-width: 900px;
    margin: auto;
    padding: 20px;
    text-align: center;
}

/* Summary Grid */
.summary-grid {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 20px;
}
.summary-card {
    flex: 1;
    background: #1e1e1e;
    padding: 15px;
    border-radius: 8px;
    border: 1px solid #333;
    text-align: center;
}
.summary-card h3 {
    color: #ff6b35;
    font-size: 1rem;
    margin-bottom: 5px;
}

/* Plan Selector */
.plan-selector-wrapper {
    text-align: left;
    margin-bottom: 20px;
}
.plan-selector {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.plan-card {
    background: #1c1c1e;
    padding: 10px 15px;
    border-radius: 6px;
    border: 1px solid #333;
    color: #fff;
    font-size: 0.9rem;
    cursor: pointer;
}
.plan-card.active {
    border-color: #ff6b35;
    background: #292929;
}

/* Charts */
.charts-section h3 {
    text-align: left;
    margin: 15px 0 8px;
}
.chart-container {
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    border-radius: 10px;
    margin-bottom: 15px;
}

/* Workout History */
.workout-history {
    text-align: left;
    margin-top: 15px;
}
.workout-history ul {
    list-style: none;
    padding: 0;
}
.workout-history li {
    background: #222;
    margin-bottom: 6px;
    padding: 10px;
    border-radius: 6px;
    font-size: 0.9rem;
}

/* ===========================
   BOTTOM NAV
=========================== */
.bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: space-around;
    background: #111;
    padding: 10px 0;
    border-top: 1px solid #333;
}
.bottom-nav button {
    flex: 1;
    margin: 0 5px;
    padding: 12px;
    font-size: 1rem;
    font-weight: bold;
    color: #fff;
    background: #ff6b35;
    border: none;
    border-radius: 6px;
    cursor: pointer;
}
.bottom-nav button:hover {
    background: #ff914d;
}

/* ===========================
   MODAL
=========================== */
.modal {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.modal.hidden {
    display: none;
}
.modal-content {
    background: #1c1c1e;
    padding: 20px;
    border-radius: 10px;
    width: 90%;
    max-width: 450px;
    color: #fff;
    max-height: 80vh;
    overflow-y: auto;
}
.close-btn {
    float: right;
    font-size: 1.5rem;
    cursor: pointer;
}

/* ===========================
   RESPONSIVE DESIGN
=========================== */
@media screen and (max-width: 768px) {
    .card-group {
        grid-template-columns: 1fr 1fr;
    }
    .summary-grid {
        flex-direction: column;
    }
    .bottom-nav button {
        font-size: 0.9rem;
        padding: 10px;
    }
}

@media screen and (max-width: 480px) {
    .card-group {
        grid-template-columns: 1fr;
    }
    .main-title {
        font-size: 2rem;
    }
}