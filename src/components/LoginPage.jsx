import React, { useState, useMemo } from 'react';
import { 
    GoogleAuthProvider, 
    signInWithPopup,
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    sendEmailVerification,
    signOut
} from "firebase/auth";
import { auth } from '../firebase/config';
import { Sun, Moon, LoaderCircle, CheckCircle, AlertCircle, Eye, EyeOff, XCircle } from 'lucide-react';

// Componente do Modal
const Modal = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full max-w-md m-4 transform animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#2E2E2E]">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-[#E0E0E0]">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white transition-colors p-2 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

// Componente para o ícone do Google
const GoogleIcon = (props) => (
    <svg viewBox="0 0 48 48" {...props}><path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path><path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path><path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path><path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.42,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path></svg>
);

// Componente reutilizável para input de senha com toggle de visibilidade
const PasswordInput = ({ value, onChange, placeholder, id }) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputClasses = "w-full bg-gray-100 dark:bg-[#2E2E2E] text-gray-800 dark:text-[#E0E0E0] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-3 pr-10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all";

    return (
        <div className="relative w-full">
            <input
                id={id}
                type={showPassword ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={inputClasses}
                required
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
        </div>
    );
};

// Componente para a barra e requisitos da senha
const PasswordStrengthIndicator = ({ password, criteria, setCriteria }) => {
    const { score, colors } = useMemo(() => {
        const checks = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[@$!%*?&#-.]/.test(password),
        };
        setCriteria(checks);
        
        const score = Object.values(checks).filter(Boolean).length;
        
        const colorSchemes = {
            bar: ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'],
            text: ['text-red-500', 'text-orange-500', 'text-yellow-500', 'text-green-500']
        };

        return {
            score,
            colors: {
                bar: score > 0 ? colorSchemes.bar[score - 1] : '',
                text: score > 0 ? colorSchemes.text[score - 1] : 'text-gray-500'
            }
        };
    }, [password, setCriteria]);

    const strengthLabels = ['Muito Fraca', 'Fraca', 'Média', 'Forte'];
    
    const requirementList = [
        { key: 'length', text: 'Pelo menos 8 caracteres' },
        { key: 'uppercase', text: 'Uma letra maiúscula' },
        { key: 'number', text: 'Um número' },
        { key: 'special', text: 'Um símbolo especial (@$!%*?&)' }
    ];

    return (
        <div className="w-full space-y-2">
             <div className="w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${colors.bar}`}
                    style={{ width: `${(score / 4) * 100}%` }}
                ></div>
            </div>
            {password && <p className={`text-xs text-right font-medium ${colors.text}`}>{strengthLabels[score - 1]}</p>}
            
            <ul className="text-xs space-y-1 pt-1">
                {requirementList.map(req => (
                    <li key={req.key} className={`flex items-center transition-colors ${criteria[req.key] ? 'text-green-500' : 'text-gray-500 dark:text-gray-400'}`}>
                        {criteria[req.key] ? <CheckCircle size={14} className="mr-2 flex-shrink-0" /> : <XCircle size={14} className="mr-2 flex-shrink-0" />}
                        <span>{req.text}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const PasswordResetModal = ({ isOpen, onClose }) => {
    const [resetEmail, setResetEmail] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [resetError, setResetError] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setResetError('');
        setResetMessage('');
        setIsSending(true);
        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetMessage('Se este e-mail estiver registado, receberá um link para redefinir a sua senha.');
        } catch (error) {
            setResetError('Falha ao enviar o e-mail. Verifique o endereço e tente novamente.');
        } finally {
            setIsSending(false);
        }
    };
    
    const inputClasses = "w-full bg-gray-100 dark:bg-[#3A3A3A] text-gray-800 dark:text-[#E0E0E0] border border-gray-300 dark:border-[#555] rounded-lg p-3";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Recuperar Senha">
            <form onSubmit={handlePasswordReset} className="space-y-4">
                <p className="text-sm text-gray-500">Insira o seu e-mail para receber um link de redefinição de senha.</p>
                {resetMessage && <div className="p-3 text-sm rounded-lg bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300">{resetMessage}</div>}
                {resetError && <div className="p-3 text-sm rounded-lg bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">{resetError}</div>}
                <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu@email.com" className={inputClasses} required />
                <button type="submit" disabled={isSending} className="w-full px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 shadow-lg disabled:bg-gray-400 flex items-center justify-center">
                    {isSending && <LoaderCircle className="animate-spin mr-2" size={20} />} Enviar Link
                </button>
            </form>
        </Modal>
    );
};

export default function LoginPage({ theme, toggleTheme }) {
    const [isLoginView, setIsLoginView] = useState(true);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordCriteria, setPasswordCriteria] = useState({ length: false, uppercase: false, number: false, special: false });
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [authAction, setAuthAction] = useState(null);

    const resetForm = () => { setEmail(''); setPassword(''); setConfirmPassword(''); setError(''); setMessage(''); };

    const validatePassword = () => {
        const allMet = Object.values(passwordCriteria).every(Boolean);
        if (!allMet) {
            setError('A senha deve cumprir todos os requisitos.');
            return false;
        }
        if (!isLoginView && password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return false;
        }
        return true;
    };

    const handleAuthAction = async (action, authFunction) => {
        if (action === 'signup' && !validatePassword()) return;

        setError('');
        setMessage('');
        setIsLoading(true);
        setAuthAction(action);
        
        try {
            const userCredential = await authFunction();

            if (action === 'login') {
                if (!userCredential.user.emailVerified) {
                    await signOut(auth);
                    setError('Por favor, verifique o seu e-mail antes de fazer o login. Se não o encontrar, verifique a sua caixa de spam.');
                }
                // Se verificado, onAuthStateChanged em App.jsx tratará do resto.
            } 
            else if (action === 'signup') {
                await sendEmailVerification(userCredential.user);
                await signOut(auth); // Desconecta o utilizador após o registo
                setMessage('Conta criada! Um e-mail de verificação foi enviado. Por favor, confirme-o para poder fazer o login.');
                setIsLoginView(true); // Muda para a vista de login
                resetForm();
            }
        } catch (error) {
            setError(mapFirebaseError(error.code));
        } finally {
            setIsLoading(false);
            setAuthAction(null);
        }
    };
    
    const mapFirebaseError = (errorCode) => {
        switch (errorCode) {
            case 'auth/invalid-email': return 'Formato de e-mail inválido.';
            case 'auth/user-not-found': return 'Nenhum utilizador encontrado com este e-mail.';
            case 'auth/wrong-password': return 'E-mail ou senha incorretos.';
            case 'auth/email-already-in-use': return 'Este e-mail já está registado.';
            case 'auth/weak-password': return 'A senha deve ter no mínimo 6 caracteres.';
            case 'auth/popup-closed-by-user': return 'A janela de login com Google foi fechada.';
            default: return 'Ocorreu um erro. Por favor, tente novamente.';
        }
    };

    const inputClasses = "w-full bg-gray-100 dark:bg-[#2E2E2E] text-gray-800 dark:text-[#E0E0E0] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all";

    return (
        <>
            <PasswordResetModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
            <div className="bg-gray-50 dark:bg-[#181818] min-h-screen flex flex-col justify-center items-center p-4 font-sans">
                <div className="absolute top-4 right-4">
                    <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-full transition-colors">
                        {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
                    </button>
                </div>
                <div className="w-full max-w-md">
                    <div className="text-center mb-6">
                         <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-[#E0E0E0]">Controle <span className="text-teal-500">Financeiro</span></h1>
                         <p className="text-gray-500 mt-2">{isLoginView ? "Acesse a sua conta para continuar" : "Crie uma nova conta"}</p>
                    </div>

                    <div className="bg-white dark:bg-[#121212] p-8 rounded-2xl shadow-2xl w-full animate-fade-in">
                        
                        {message && <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 flex items-center gap-2"><CheckCircle size={20}/>{message}</div>}
                        {error && <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 flex items-center gap-2"><AlertCircle size={20}/>{error}</div>}

                        {isLoginView ? (
                            <form onSubmit={(e) => {e.preventDefault(); handleAuthAction('login', () => signInWithEmailAndPassword(auth, email, password))}} className="space-y-4">
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClasses} required />
                                <PasswordInput id="login-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
                                <button onClick={() => setIsResetModalOpen(true)} type="button" className="text-sm text-teal-500 hover:underline text-left w-full">Esqueceu sua senha?</button>
                                <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 shadow-lg disabled:bg-gray-400 flex items-center justify-center">
                                    {authAction === 'login' && <LoaderCircle className="animate-spin mr-2" size={20} />} Entrar
                                </button>
                                <button type="button" onClick={() => {setIsLoginView(false); resetForm();}} className="w-full px-6 py-3 rounded-lg bg-gray-200 dark:bg-[#3A3A3A] text-gray-800 dark:text-[#E0E0E0] font-semibold hover:bg-gray-300 dark:hover:bg-gray-500">
                                    Não tem uma conta? Cadastre-se
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={(e) => {e.preventDefault(); handleAuthAction('signup', () => createUserWithEmailAndPassword(auth, email, password))}} className="space-y-4">
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClasses} required />
                                <PasswordInput id="signup-password" value={password} onChange={(e) => {setPassword(e.target.value); setError('')}} placeholder="Senha" />
                                <PasswordInput id="confirm-password" value={confirmPassword} onChange={(e) => {setConfirmPassword(e.target.value); setError('')}} placeholder="Confirmar Senha" />
                                <PasswordStrengthIndicator password={password} criteria={passwordCriteria} setCriteria={setPasswordCriteria} />
                                <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 shadow-lg disabled:bg-gray-400 flex items-center justify-center">
                                    {authAction === 'signup' && <LoaderCircle className="animate-spin mr-2" size={20} />} Criar Conta
                                </button>
                                <button type="button" onClick={() => {setIsLoginView(true); resetForm();}} className="w-full px-6 py-3 rounded-lg bg-gray-200 dark:bg-[#3A3A3A] text-gray-800 dark:text-[#E0E0E0] font-semibold hover:bg-gray-300 dark:hover:bg-gray-500">
                                    Já tem uma conta? Faça login
                                </button>
                            </form>
                        )}
                        
                        <div className="flex items-center my-4"><hr className="flex-grow border-gray-300 dark:border-gray-600" /><span className="mx-4 text-gray-500 text-sm">OU</span><hr className="flex-grow border-gray-300 dark:border-gray-600" /></div>

                        <button onClick={() => handleAuthAction('google', () => signInWithPopup(auth, new GoogleAuthProvider()))} disabled={isLoading} className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] transition-colors disabled:opacity-50">
                            {authAction === 'google' ? <LoaderCircle className="animate-spin" size={24} /> : <>
                                <GoogleIcon className="w-6 h-6" />
                                <span className="font-semibold text-gray-700 dark:text-gray-200">Entrar com Google</span>
                            </>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
