\/* ===========================
   GLOBAL VARIABLES
=========================== */
let currentStep = 1;
const totalSteps = 6;
const userSelections = { goal:"", experience:"", style:"", days:"" };
let plan = null;

/* ===========================
   ONBOARDING LOGIC
=========================== */
function updateProgress(){document.querySelector('.progress').style.width=((currentStep-1)/(totalSteps-1))*100+"%";}
function nextStep(){document.getElementById('step'+currentStep).classList.remove('active');setTimeout(()=>{currentStep++;if(document.getElementById('step'+currentStep)){document.getElementById('step'+currentStep).classList.add('active');updateProgress();}},200);}
function validateStep(field){if(!userSelections[field]){alert("Please select an option");return false;}return true;}
function selectCard(el,field,val){userSelections[field]=val;el.parentElement.querySelectorAll('.goal-card').forEach(c=>c.classList.remove('active'));el.classList.add('active');}
function finishOnboarding(){localStorage.setItem("onboardingCompleted","true");localStorage.setItem("userSelections",JSON.stringify(userSelections));plan=generatePlan(userSelections);renderDashboard(plan);}

/* ===========================
   DASHBOARD
=========================== */
function renderDashboard(plan){
document.querySelector('.container').style.display="none";document.getElementById('dashboard').style.display="block";document.querySelector('.bottom-nav').style.display="flex";
document.getElementById('userSummary').innerText=`Goal: ${capitalize(plan.goal)} | Level: ${capitalize(plan.experience)} | Days: ${plan.days}`;
document.getElementById('volumeSummary').innerText=`${plan.currentVolume} sets / ${plan.maxVolume} max`;
document.getElementById('volumeProgress').style.width=`${(plan.currentVolume/plan.maxVolume)*100}%`;
renderCharts(plan);
}

/* ===========================
   CHARTS
=========================== */
function renderCharts(plan){
new Chart(document.getElementById('volumeChart').getContext('2d'),{type:'line',data:{labels:['W1','W2','W3','W4'],datasets:[{data:[plan.currentVolume,plan.currentVolume+5,plan.currentVolume+10,plan.maxVolume],borderColor:'#ff6b35'}]},options:{plugins:{legend:{display:false}}}});
new Chart(document.getElementById('loadChart').getContext('2d'),{type:'bar',data:{labels:['W1','W2','W3','W4'],datasets:[{data:[100,110,120,130],backgroundColor:'#ff914d'}]},options:{plugins:{legend:{display:false}}}});
}

/* ===========================
   MODAL
=========================== */
function openModal(type){
document.getElementById('modal').classList.add('show');const body=document.getElementById('modal-body');
if(type==='logWorkout'){body.innerHTML=`<h2>Log Workout</h2><textarea id="workoutNotes" placeholder="Details..."></textarea><input type="number" id="fatigueScore" min="1" max="10"><button onclick="submitWorkout()">Submit</button>`;}
else if(type==='planner'){body.innerHTML=`<h2>Planner</h2><p>Edit sets/reps coming soon...</p>`;}
else{body.innerHTML=`<h2>Settings</h2>`;}
}
function closeModal(){document.getElementById('modal').classList.remove('show');}

/* ===========================
   TRAINER-BASED PLAN
=========================== */
function generatePlan({goal,experience,style,days}){
const baseVolume=experience==='beginner'?8:experience==='experienced'?12:16;
return{goal,experience,style,days,week:1,rirTarget:3,currentVolume:baseVolume,maxVolume:baseVolume*2,
sessions:[{name:"Day 1 - Upper",exercises:[{name:"Bench Press",sets:3,reps:10},{name:"Row",sets:3,reps:12}]},{name:"Day 2 - Lower",exercises:[{name:"Squat",sets:3,reps:10},{name:"Leg Curl",sets:3,reps:12}]}]};
}

/* ===========================
   UTILITY
=========================== */
function capitalize(str){return str.charAt(0).toUpperCase()+str.slice(1);}
window.onload=()=>{if(localStorage.getItem("onboardingCompleted")==="true"){Object.assign(userSelections,JSON.parse(localStorage.getItem("userSelections")));plan=generatePlan(userSelections);renderDashboard(plan);}else{document.querySelector('#step1').classList.add('active');updateProgress();}}
