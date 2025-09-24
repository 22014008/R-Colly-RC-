// Authentication functionality
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('login.html')) {
        initializeAuthPage();
    }
});

function initializeAuthPage() {
    // Initialize tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const authForms = document.querySelectorAll('.auth-form');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show corresponding form
            authForms.forEach(form => {
                form.classList.remove('active');
                if (form.id === targetTab) {
                    form.classList.add('active');
                }
            });
        });
    });
    
    // Initialize forms
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Redirect to homepage or admin panel
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        if (user && user.is_admin) {
            window.location.href = 'admin/index.html';
        } else {
            window.location.href = 'index.html';
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    if (!username || !password) {
        alert('Please fill in all fields.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';
    
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }
        
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Show success message
        alert('Login successful!');
        
        // Redirect based on user role
        if (data.user.is_admin) {
            window.location.href = 'admin/index.html';
        } else {
            window.location.href = 'index.html';
        }
        
    } catch (error) {
        console.error('Login failed:', error);
        alert(error.message || 'Login failed. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const username = formData.get('username');
    const email = formData.get('email');
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validate form
    if (!username || !email || !password || !confirmPassword) {
        alert('Please fill in all fields.');
        return;
    }
    
    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address.');
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
    
    try {
        const response = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }
        
        // Show success message
        alert('Account created successfully! Please login.');
        
        // Switch to login tab
        document.querySelector('[data-tab="login"]').click();
        
        // Pre-fill username in login form
        document.getElementById('login-username').value = username;
        
        // Reset registration form
        e.target.reset();
        
    } catch (error) {
        console.error('Registration failed:', error);
        alert(error.message || 'Registration failed. Please try again.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Register';
    }
}

// Password strength indicator (can be added)
function checkPasswordStrength(password) {
    let strength = 0;
    const indicators = [];
    
    if (password.length >= 8) {
        strength++;
        indicators.push('✓ 8+ characters');
    } else {
        indicators.push('✗ At least 8 characters');
    }
    
    if (/[a-z]/.test(password)) {
        strength++;
        indicators.push('✓ Lowercase letter');
    } else {
        indicators.push('✗ Lowercase letter');
    }
    
    if (/[A-Z]/.test(password)) {
        strength++;
        indicators.push('✓ Uppercase letter');
    } else {
        indicators.push('✗ Uppercase letter');
    }
    
    if (/[0-9]/.test(password)) {
        strength++;
        indicators.push('✓ Number');
    } else {
        indicators.push('✗ Number');
    }
    
    return { strength, indicators };
}