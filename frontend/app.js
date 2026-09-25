// Change the very first line of frontend/app.js to this:
const API_URL = 'https://onrender.com';


// Redirect helper if not logged in
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token && window.location.pathname.endsWith('dashboard.html')) {
        window.location.href = 'index.html';
    }
}

// 1. Handle Login Form Submission
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');

        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Login failed');

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            window.location.href = 'dashboard.html';
        } catch (err) {
            errorDiv.innerText = err.message;
            errorDiv.classList.remove('hidden');
        }
    });
}

// 2. Fetch and Hydrate Dashboard Data
async function loadDashboard() {
    if (!window.location.pathname.endsWith('dashboard.html')) return;
    
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));
    
    if (!token || !user) return;
    document.getElementById('user-display').innerText = `${user.name} (${user.role.toUpperCase()})`;

    try {
        const res = await fetch(`${API_URL}/student/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        // Populate baseline layout data
        document.getElementById('fees-display').innerText = `UGX ${Number(data.student.fees_balance).toLocaleString()}`;
        
        const alertBox = document.getElementById('financial-alert');
        const alertTitle = document.getElementById('alert-title');
        const alertDesc = document.getElementById('alert-desc');

        alertBox.classList.remove('hidden');
        if (data.financial_gate_locked) {
            // Apply Red Lock State Configuration
            alertBox.className = "mb-6 p-4 rounded-lg flex items-center justify-between shadow-sm bg-red-100 text-red-800 border-l-4 border-red-500";
            alertTitle.innerText = "🛑 Financial Gate Restrict Active";
            alertDesc.innerText = "Your account statement has an outstanding ledger balance. Academic raw scores are restricted until full tuition clearance.";
            document.getElementById('gpa-display').innerText = "LOCKED";
            document.getElementById('gpa-display').className = "text-3xl font-black text-red-500";
        } else {
            // Apply Green Cleared Configuration
            alertBox.className = "mb-6 p-4 rounded-lg flex items-center justify-between shadow-sm bg-green-100 text-green-800 border-l-4 border-green-500";
            alertTitle.innerText = "✅ Financial Statement Cleared";
            alertDesc.innerText = "Your academic ledger accounts are fully active. Exam authorization permits are fully generated.";
            document.getElementById('gpa-display').innerText = data.student.gpa || "0.00";
            document.getElementById('gpa-display').className = "text-3xl font-black text-green-600";
        }

        // Render Table Records Row Sheets
        const tbody = document.getElementById('grades-table-rows');
        tbody.innerHTML = '';
        data.grades.forEach(item => {
            tbody.innerHTML += `
                <tr class="border-b border-gray-100 hover:bg-gray-50 transition">
                    <td class="p-3 font-semibold text-gray-700">${item.course_code}</td>
                    <td class="p-3 text-center ${data.financial_gate_locked ? 'blur-sm select-none font-bold text-red-400' : 'text-gray-800 font-medium'}">
                        ${item.marks}
                    </td>
                    <td class="p-3 text-center font-bold ${data.financial_gate_locked ? 'text-red-500' : 'text-indigo-600'}">
                        ${item.grade_letter}
                    </td>
                </tr>
            `;
        });

    } catch (err) {
        console.error(err);
    }
}

// 3. Handle Logout Trigger Operation
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
    });
}

// Execute initial checks on layout load
checkAuth();
loadDashboard();
