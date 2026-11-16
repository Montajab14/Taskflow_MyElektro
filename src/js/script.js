// ==========================================================================
// TaskFlow — Gestionnaire d'Authentification (Login & Register)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- Éléments du DOM ---
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const tabIndicator = document.querySelector('.tab-indicator');
    const formTitle = document.getElementById('form-title');
    const formSubtitle = document.getElementById('form-subtitle');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    const registerPasswordInput = document.getElementById('register-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    const toast = document.getElementById('toast');
    const toastText = document.getElementById('toast-text');

    // --- Gestion des Onglets (Login / Register) ---
    function switchTab(target) {
        if (target === 'register') {
            tabIndicator.style.transform = 'translateX(100%)';
            tabLogin.classList.remove('active');
            tabRegister.classList.add('active');

            tabLogin.setAttribute('aria-selected', 'false');
            tabRegister.setAttribute('aria-selected', 'true');

            loginForm.classList.remove('active');
            registerForm.classList.add('active');

            formTitle.textContent = 'Créer un compte';
            formSubtitle.textContent = 'Rejoignez TaskFlow et boostez votre productivité.';
        } else {
            tabIndicator.style.transform = 'translateX(0%)';
            tabRegister.classList.remove('active');
            tabLogin.classList.add('active');

            tabRegister.setAttribute('aria-selected', 'false');
            tabLogin.setAttribute('aria-selected', 'true');

            registerForm.classList.remove('active');
            loginForm.classList.add('active');

            formTitle.textContent = 'Bienvenue sur TaskFlow';
            formSubtitle.textContent = 'Gérez vos tâches et projets en toute simplicité.';
        }
        clearAllErrors();
    }

    tabLogin.addEventListener('click', () => switchTab('login'));
    tabRegister.addEventListener('click', () => switchTab('register'));

    // --- Bascule Afficher / Masquer Mot de passe ---
    const toggleButtons = document.querySelectorAll('.toggle-password');
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const inputField = btn.parentElement.querySelector('input');
            const eyeOpen = btn.querySelector('.eye-open');
            const eyeClosed = btn.querySelector('.eye-closed');

            if (inputField.type === 'password') {
                inputField.type = 'text';
                eyeOpen.classList.add('hidden');
                eyeClosed.classList.remove('hidden');
            } else {
                inputField.type = 'password';
                eyeOpen.classList.remove('hidden');
                eyeClosed.classList.add('hidden');
            }
        });
    });

    // --- Calcul de Force du Mot de passe ---
    function evaluatePasswordStrength(password) {
        let score = 0;
        if (!password) return { score: 0, text: 'Niveau de sécurité', color: 'transparent' };

        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        switch (score) {
            case 1:
                return { score: 25, text: 'Très faible', color: '#ef4444' };
            case 2:
                return { score: 50, text: 'Moyen', color: '#f59e0b' };
            case 3:
                return { score: 75, text: 'Bon', color: '#3b82f6' };
            case 4:
                return { score: 100, text: 'Très sécurisé', color: '#10b981' };
            default:
                return { score: 10, text: 'Trop court', color: '#ef4444' };
        }
    }

    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', (e) => {
            const val = e.target.value;
            const strength = evaluatePasswordStrength(val);

            strengthBar.style.width = `${strength.score}%`;
            strengthBar.style.backgroundColor = strength.color;
            strengthText.textContent = strength.text;
            strengthText.style.color = strength.color === 'transparent' ? 'var(--text-muted)' : strength.color;
        });
    }

    // --- Utilitaires de Validation ---
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    function setError(inputId, message) {
        const input = document.getElementById(inputId);
        const container = input ? input.closest('.input-field') : null;
        const errorEl = document.getElementById(`${inputId}-error`);

        if (container) container.classList.add('error');
        if (errorEl) errorEl.textContent = message;
    }

    function clearError(inputId) {
        const input = document.getElementById(inputId);
        const container = input ? input.closest('.input-field') : null;
        const errorEl = document.getElementById(`${inputId}-error`);

        if (container) container.classList.remove('error');
        if (errorEl) errorEl.textContent = '';
    }

    function clearAllErrors() {
        document.querySelectorAll('.input-field').forEach(f => f.classList.remove('error'));
        document.querySelectorAll('.error-msg').forEach(e => e.textContent = '');
    }

    // Nettoyer les erreurs à la frappe
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearError(input.id);
        });
    });

    // --- Système de Toast / Notifications ---
    let toastTimeout;
    function showToast(message, type = 'info') {
        clearTimeout(toastTimeout);
        toastText.textContent = message;
        toast.className = `toast show toast-${type}`;

        toastTimeout = setTimeout(() => {
            toast.className = 'toast';
        }, 4000);
    }

    // --- Gestion du Stockage Utilisateurs (Simulé en localStorage) ---
    function getUsers() {
        return JSON.parse(localStorage.getItem('taskflow_users') || '[]');
    }

    function saveUser(user) {
        const users = getUsers();
        users.push(user);
        localStorage.setItem('taskflow_users', JSON.stringify(users));
    }

    // --- Soumission du Formulaire de Connexion ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        let hasError = false;

        if (!email) {
            setError('login-email', 'Veuillez saisir votre adresse email');
            hasError = true;
        } else if (!isValidEmail(email)) {
            setError('login-email', 'Format email invalide');
            hasError = true;
        }

        if (!password) {
            setError('login-password', 'Veuillez saisir votre mot de passe');
            hasError = true;
        }

        if (hasError) return;

        // Vérification des identifiants (comparaison avec localStorage ou utilisateur démo)
        const users = getUsers();
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        // Compte démo par défaut si aucun compte n'a encore été créé
        const isDemo = (email === 'demo@taskflow.io' && password === 'TaskFlow2026!');

        if (isDemo || (user && user.password === password)) {
            const userName = user ? user.name : 'Utilisateur Démo';
            showToast(`Connexion réussie ! Bienvenue ${userName}.`, 'success');
            
            if (rememberMe) {
                localStorage.setItem('taskflow_remember', email);
            }
            
            // Simulation de redirection
            setTimeout(() => {
                showToast('Redirection vers votre tableau de bord TaskFlow...', 'info');
            }, 1200);
        } else {
            setError('login-password', 'Identifiants incorrects.');
            showToast('Adresse email ou mot de passe incorrect.', 'error');
        }
    });

    // --- Soumission du Formulaire d'Inscription ---
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        clearAllErrors();

        const name = document.getElementById('register-name').value.trim();
        const email = document.getElementById('register-email').value.trim();
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const terms = document.getElementById('terms').checked;

        let hasError = false;

        if (!name || name.length < 2) {
            setError('register-name', 'Veuillez entrer votre nom (au moins 2 caractères)');
            hasError = true;
        }

        if (!email) {
            setError('register-email', 'Veuillez saisir votre adresse email');
            hasError = true;
        } else if (!isValidEmail(email)) {
            setError('register-email', 'Adresse email non valide');
            hasError = true;
        }

        if (!password) {
            setError('register-password', 'Le mot de passe est obligatoire');
            hasError = true;
        } else if (password.length < 8) {
            setError('register-password', 'Le mot de passe doit comporter au moins 8 caractères');
            hasError = true;
        }

        if (!confirmPassword) {
            setError('register-confirm', 'Veuillez confirmer votre mot de passe');
            hasError = true;
        } else if (password !== confirmPassword) {
            setError('register-confirm', 'Les mots de passe ne correspondent pas');
            hasError = true;
        }

        if (!terms) {
            document.getElementById('terms-error').textContent = 'Vous devez accepter les conditions';
            hasError = true;
        }

        if (hasError) return;

        // Vérifier si l'utilisateur existe déjà
        const users = getUsers();
        const userExists = users.some(u => u.email.toLowerCase() === email.toLowerCase());

        if (userExists || email.toLowerCase() === 'demo@taskflow.io') {
            setError('register-email', 'Un compte existe déjà avec cette adresse email');
            showToast('Cet email est déjà enregistré.', 'error');
            return;
        }

        // Enregistrement
        saveUser({ name, email, password, createdAt: new Date().toISOString() });
        showToast('Compte créé avec succès ! Connectez-vous dès maintenant.', 'success');

        // Bascule automatique vers l'onglet login avec pré-remplissage
        setTimeout(() => {
            switchTab('login');
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').focus();
        }, 1200);
    });

    // --- Action Mot de passe oublié & Réseaux sociaux ---
    document.getElementById('forgot-password').addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Lien de réinitialisation envoyé à votre adresse email.', 'info');
    });

    document.getElementById('social-google').addEventListener('click', () => {
        showToast('Authentification Google initiée (simulation)', 'info');
    });

    document.getElementById('social-github').addEventListener('click', () => {
        showToast('Authentification GitHub initiée (simulation)', 'info');
    });

    // Pré-remplissage si "remember-me" était actif
    const rememberedEmail = localStorage.getItem('taskflow_remember');
    if (rememberedEmail) {
        document.getElementById('login-email').value = rememberedEmail;
        document.getElementById('remember-me').checked = true;
    }
});

