import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { auth, db } from './firebase/config'; // <-- CORRIGIDO: Importando do seu config.js
import LoginPage from './components/LoginPage';

import { 
    Plus, Edit, Trash2, X, CopyPlus, LoaderCircle, FileText, Settings, Check, Tag, 
    TrendingUp, TrendingDown, Search, ChevronDown, ChevronRight, ChevronLeft, Receipt, 
    Repeat, Calendar, CalendarClock, Bell, CircleDollarSign, Sun, Moon, Laptop, Gift, 
    Home, Utensils, Car, Gamepad2, HeartPulse, GraduationCap, ShoppingBag, 
    ClipboardPaste, CheckSquare, Square, ArrowRightLeft, Wallet, Landmark, LogOut
} from 'lucide-react';

const appId = import.meta.env.VITE_FIREBASE_APP_ID; // Se você usa Vite e definiu no .env

// --- DADOS INICIAIS E CONSTANTES ---
const ICONS = { Home, Utensils, Car, Gamepad2, HeartPulse, GraduationCap, ShoppingBag, Tag, CircleDollarSign, TrendingUp, Laptop, Gift, Receipt, Repeat, Bell, Settings, Plus, Edit, Trash2, X, CopyPlus, LoaderCircle, FileText, Check, Search, ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarClock, Sun, Moon, ClipboardPaste, CheckSquare, Square, ArrowRightLeft, Wallet, Landmark };
const initialCategories = [{name: "Contas de Casa", icon: "Home"}, {name: "Alimentação", icon: "Utensils"}, {name: "Transporte", icon: "Car"}, {name: "Lazer", icon: "Gamepad2"}, {name: "Saúde", icon: "HeartPulse"}, {name: "Educação", icon: "GraduationCap"}, {name: "Compras", icon: "ShoppingBag"}, {name: "Outros", icon: "Tag"}];
const initialAccounts = [{name: "Carteira", balance: 0}, {name: "Conta Corrente", balance: 0}];
const initialIncomeCategories = [{name: "Salário", icon: "CircleDollarSign"}, {name: "Vendas", icon: "Tag"}, {name: "Freelance", icon: "Laptop"}, {name: "Investimentos", icon: "TrendingUp"}, {name: "Outros", icon: "Gift"}];
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const ICON_NAMES = ["Home", "Utensils", "Car", "Gamepad2", "HeartPulse", "GraduationCap", "ShoppingBag", "Tag", "CircleDollarSign", "TrendingUp", "Laptop", "Gift", "Wallet", "Landmark"];

// --- COMPONENTES AUXILIARES E DA UI ---
const DynamicIcon = ({ name, ...props }) => {
    const IconComponent = ICONS[name] || Tag;
    return <IconComponent {...props} />;
};

const Modal = ({ isOpen, onClose, children, title, size = 'md' }) => {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
            <div className={`bg-white dark:bg-[#121212] rounded-2xl shadow-2xl w-full m-4 transform animate-scale-in ${sizeClasses[size]}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-[#2E2E2E]"><h3 className="text-xl font-bold text-gray-800 dark:text-[#E0E0E0]">{title}</h3><button onClick={onClose} className="text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white transition-colors p-2 rounded-full"><X size={24} /></button></div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const TransactionForm = ({ onSave, onClose, itemToEdit, categories, accounts, type, template }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [category, setCategory] = useState('');
    const [accountId, setAccountId] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    
    useEffect(() => {
        const initialCategory = categories[0]?.name || '';
        const initialAccountId = accounts[0]?.id || '';

        if (template) {
            setDescription(template.description || '');
            setAmount(template.amount?.toString() || '');
            setCategory(template.category || initialCategory);
            setAccountId(template.accountId || initialAccountId);
        }
        
        if (itemToEdit) {
            setDescription(itemToEdit.originalDescription || itemToEdit.description);
            setAmount(itemToEdit.amount.toString());
            const itemDate = itemToEdit.date.toDate ? itemToEdit.date.toDate() : new Date(itemToEdit.date);
            setDate(itemDate.toISOString().split('T')[0]);
            setCategory(itemToEdit.category);
            setAccountId(itemToEdit.accountId);
        } else if (!template) {
            setDescription('');
            setAmount('');
            setCategory(initialCategory);
            setAccountId(initialAccountId);
        }
        
        if (!itemToEdit) {
            setDate(new Date().toISOString().split('T')[0]);
            setIsRecurring(false);
        }
    }, [itemToEdit, categories, accounts, template]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!accountId) {
            console.error("Por favor, selecione uma conta.");
            return;
        }

        const transactionData = { description, amount: parseFloat(amount) || 0, date: new Date(date), category, accountId, isPaid: type === 'income' ? true : (itemToEdit?.isPaid || false) };
        await onSave(transactionData, isRecurring, itemToEdit?.amount);
        onClose();
    };
    
    const inputClasses = "w-full bg-gray-100 dark:bg-[#2E2E2E] text-gray-800 dark:text-[#E0E0E0] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all";
    const labelClasses = "block text-sm font-semibold text-gray-600 dark:text-[#A0A0A0] mb-2";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div><label htmlFor="description" className={labelClasses}>Descrição</label><input id="description" type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inputClasses} placeholder="Ex: Conta de Luz" required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="amount" className={labelClasses}>Valor (R$)</label><input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClasses} placeholder="150.75" required /></div>
                <div><label htmlFor="date" className={labelClasses}>Data</label><input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} required /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="category" className={labelClasses}>Categoria</label><select id="category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClasses}>{categories.map(cat => <option key={cat.id || cat.name} value={cat.name}>{cat.name}</option>)}</select></div>
                <div><label htmlFor="account" className={labelClasses}>Conta</label><select id="account" value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClasses} required>{!accountId && <option value="" disabled>Selecione...</option>}{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            </div>
            
            {!itemToEdit && type === 'expense' && (
                <div className="flex items-center pt-2">
                    <input type="checkbox" id="recurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"/>
                    <label htmlFor="recurring" className="ml-2 block text-sm text-gray-600 dark:text-[#A0A0A0]">Tornar esta despesa recorrente</label>
                </div>
            )}

            <div className="flex justify-end pt-4 space-x-3"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-[#3A3A3A] text-gray-800 dark:text-[#E0E0E0] font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Cancelar</button><button type="submit" className="px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 transition-colors shadow-lg shadow-teal-900/40 flex items-center gap-2">{itemToEdit ? 'Salvar' : 'Adicionar'}</button></div>
        </form>
    );
};

const TransferForm = ({ onSave, onClose, accounts }) => {
    const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '');
    const [toAccountId, setToAccountId] = useState(accounts[1]?.id || '');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!fromAccountId || !toAccountId) {
            setError('Selecione as contas de origem e destino.');
            return;
        }
        if(fromAccountId === toAccountId) {
            setError('A conta de origem e destino não podem ser a mesma.');
            return;
        }
        setError('');
        onSave({ fromAccountId, toAccountId, amount: parseFloat(amount), date: new Date(date) });
        onClose();
    };

    const inputClasses = "w-full bg-gray-100 dark:bg-[#2E2E2E] text-gray-800 dark:text-[#E0E0E0] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-3";
    const labelClasses = "block text-sm font-semibold text-gray-600 dark:text-[#A0A0A0] mb-2";

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-lg">{error}</p>}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label htmlFor="fromAccount" className={labelClasses}>De</label><select id="fromAccount" value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} className={inputClasses}>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
                <div><label htmlFor="toAccount" className={labelClasses}>Para</label><select id="toAccount" value={toAccountId} onChange={e => setToAccountId(e.target.value)} className={inputClasses}>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div><label htmlFor="amount" className={labelClasses}>Valor (R$)</label><input id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={inputClasses} required /></div>
                 <div><label htmlFor="date" className={labelClasses}>Data</label><input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} required /></div>
            </div>
            <div className="flex justify-end pt-4 space-x-3"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-[#3A3A3A]">Cancelar</button><button type="submit" className="px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold">Transferir</button></div>
        </form>
    );
};

const InstallmentModal = ({ isOpen, onClose, onConfirm }) => {
    const [installments, setInstallments] = useState(2);
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Criar Parcelamento">
            <div className="space-y-4">
                <label htmlFor="installments" className="block text-sm font-semibold text-gray-600 dark:text-[#A0A0A0] mb-2">Número total de parcelas:</label>
                <input id="installments" type="number" min="2" max="48" value={installments} onChange={(e) => { const value = e.target.value; if (value === "") setInstallments(""); else if (!isNaN(parseInt(value, 10))) setInstallments(parseInt(value, 10)); }} className="w-full bg-gray-100 dark:bg-[#2E2E2E] text-gray-800 dark:text-white border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-3"/>
                <div className="flex justify-end pt-4 space-x-3"><button type="button" onClick={onClose} className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-[#3A3A3A] text-gray-800 dark:text-[#E0E0E0] font-semibold hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button><button onClick={async () => { const num = Number(installments); if (num && num >= 2) { await onConfirm(num); onClose(); } }} className="px-6 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-500 disabled:bg-gray-500" disabled={!installments || Number(installments) < 2}>Confirmar</button></div>
            </div>
        </Modal>
    );
};

const CategoryManagementList = ({ title, items, onAdd, onUpdate, onDelete, isItemInUse, icon, availableIcons }) => {
    const [newItemName, setNewItemName] = useState('');
    const [newItemIcon, setNewItemIcon] = useState(availableIcons[0]);
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingIcon, setEditingIcon] = useState('');

    const handleAdd = () => { if (newItemName.trim()) { onAdd({ name: newItemName.trim(), icon: newItemIcon }); setNewItemName(''); setNewItemIcon(availableIcons[0]); } };
    const handleUpdate = (item) => { if (editingName.trim() && (editingName.trim() !== item.name || editingIcon !== item.icon)) { onUpdate(item.id, { name: editingName.trim(), icon: editingIcon }, item.name); } setEditingId(null); };

    return (
        <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-[#E0E0E0] mb-3 flex items-center gap-2">{icon}{title}</h4>
            <div className="flex gap-2 mb-4 items-center">
                <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder={`Nova Categoria`} className="flex-grow bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"/>
                <select value={newItemIcon} onChange={e => setNewItemIcon(e.target.value)} className="bg-gray-200 dark:bg-[#3A3A3A] border border-gray-300 dark:border-gray-500 rounded-lg p-2"><option value="">Ícone</option>{availableIcons.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}</select>
                <button onClick={handleAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-500"><Plus size={20} /></button>
            </div>
            <ul className="space-y-2">
                {items.map(item => (<li key={item.id} className="flex items-center justify-between bg-gray-100 dark:bg-[#2E2E2E] p-2 rounded-lg">
                    {editingId === item.id ? (<><DynamicIcon name={editingIcon} className="mr-2"/><input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} autoFocus className="flex-grow bg-gray-200 dark:bg-[#3A3A3A] border-b border-teal-500"/><select value={editingIcon} onChange={e => setEditingIcon(e.target.value)} className="bg-gray-200 dark:bg-[#3A3A3A] text-sm p-1 rounded"><option value="">Ícone</option>{availableIcons.map(iconName => <option key={iconName} value={iconName}>{iconName}</option>)}</select></>) : (<div className="flex items-center"><DynamicIcon name={item.icon} className="mr-2 text-gray-600 dark:text-[#A0A0A0]"/><span className="text-gray-700 dark:text-[#E0E0E0]">{item.name}</span></div>)}
                    <div className="flex items-center gap-2">
                        {editingId === item.id ? (<button onClick={() => handleUpdate(item)} className="p-1 text-green-500"><Check size={20} /></button>) : (<button onClick={() => { setEditingId(item.id); setEditingName(item.name); setEditingIcon(item.icon || '')}} className="p-1 text-gray-500 hover:text-yellow-500"><Edit size={18} /></button>)}
                        <button onClick={() => onDelete(item.id)} disabled={isItemInUse(item.name)} title={isItemInUse(item.name) ? "Esta categoria está em uso." : "Excluir"} className="p-1 text-gray-500 hover:text-red-500 disabled:text-gray-400/50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
                    </div></li>))}
            </ul>
        </div>
    );
};

const ManagementList = ({ title, items, onAdd, onUpdate, onDelete, isItemInUse, icon }) => {
    const [newItemName, setNewItemName] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const handleAdd = () => { if (newItemName.trim()) { onAdd(newItemName.trim()); setNewItemName(''); } };
    const handleUpdate = (item) => { if(editingName.trim() && editingName.trim() !== item.name) { onUpdate(item.id, editingName.trim(), item.name); } setEditingId(null); };

    return (
        <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-[#E0E0E0] mb-3 flex items-center gap-2">{icon}{title}</h4>
            <div className="flex gap-2 mb-4"><input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder={`Nome da conta`} className="flex-grow bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"/><button onClick={handleAdd} className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-500"><Plus size={20} /></button></div>
            <ul className="space-y-2">
                {items.map(item => (<li key={item.id} className="flex items-center justify-between bg-gray-100 dark:bg-[#2E2E2E] p-2 rounded-lg">
                    {editingId === item.id ? (<input type="text" value={editingName} onChange={e => setEditingName(e.target.value)} autoFocus className="flex-grow bg-gray-200 dark:bg-[#3A3A3A] border-b border-teal-500"/>) : (<span>{item.name} - <span className="text-sm text-gray-500">{item.balance?.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span></span>)}
                    <div className="flex items-center gap-2">
                        {editingId === item.id ? (<button onClick={() => handleUpdate(item)} className="p-1 text-green-500"><Check size={20} /></button>) : (<button onClick={() => { setEditingId(item.id); setEditingName(item.name);}} className="p-1 text-gray-500 hover:text-yellow-500"><Edit size={18} /></button>)}
                        <button onClick={() => onDelete(item.id)} disabled={isItemInUse(item.id)} title={isItemInUse(item.id) ? "Esta conta está em uso." : "Excluir"} className="p-1 text-gray-500 hover:text-red-500 disabled:text-gray-400/50 disabled:cursor-not-allowed"><Trash2 size={18} /></button>
                    </div></li>))}
            </ul>
        </div>
    );
};

const TemplateManagement = ({ expenseTemplates, incomeTemplates, onAdd, onDelete, expenseCategories, incomeCategories, accounts }) => {
    const [activeTab, setActiveTab] = useState('expense');

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(expenseCategories[0]?.name || '');
    const [accountId, setAccountId] = useState(accounts[0]?.id || '');

    useEffect(() => {
        if(activeTab === 'expense') {
            setCategory(expenseCategories[0]?.name || '');
        } else {
            setCategory(incomeCategories[0]?.name || '');
        }
        setAccountId(accounts[0]?.id || '');
    }, [activeTab, expenseCategories, incomeCategories, accounts]);


    const handleAdd = () => {
        if(description.trim() && amount.trim() && category && accountId) {
            onAdd(activeTab, { description, amount: parseFloat(amount), category, accountId });
            setDescription('');
            setAmount('');
        }
    };
    
    const currentCategories = activeTab === 'expense' ? expenseCategories : incomeCategories;
    const currentTemplates = activeTab === 'expense' ? expenseTemplates : incomeTemplates;

    return (
        <div>
            <h4 className="text-lg font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2"><ClipboardPaste size={20}/>Templates de Transação</h4>
            
            <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
                <button onClick={() => setActiveTab('expense')} className={`px-4 py-2 font-semibold ${activeTab === 'expense' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>Despesas</button>
                <button onClick={() => setActiveTab('income')} className={`px-4 py-2 font-semibold ${activeTab === 'income' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>Receitas</button>
            </div>

            <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição (Ex: Almoço)" className="flex-grow bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"/>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Valor" className="w-full bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"><option disabled value="">Categoria</option>{currentCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select>
                    <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-gray-200 dark:bg-[#3A3A3A] p-2 rounded-lg"><option disabled value="">Conta</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
                </div>
                <button onClick={handleAdd} className="w-full bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-500 flex items-center justify-center gap-2"><Plus size={20} /> Adicionar Template</button>
            </div>
             <ul className="space-y-2 mt-4">
                {currentTemplates.map(template => (
                    <li key={template.id} className="flex items-center justify-between bg-gray-100 dark:bg-[#2E2E2E] p-2 rounded-lg">
                        <div>
                            <p>{template.description} - {template.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            <p className="text-xs text-gray-500">{template.category} • {accounts.find(a=>a.id === template.accountId)?.name}</p>
                        </div>
                        <button onClick={() => onDelete(activeTab, template.id)} className="p-1 text-gray-500 dark:text-[#A0A0A0] hover:text-red-500"><Trash2 size={18} /></button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

const SettingsModal = (props) => (
    <Modal isOpen={props.isOpen} onClose={props.onClose} title="Configurações" size="lg">
        <div className="space-y-8">
             <ManagementList title="Contas" items={props.accounts} onAdd={props.onAddAccount} onUpdate={props.onUpdateAccount} onDelete={props.onDeleteAccount} isItemInUse={props.isAccountInUse} icon={<Wallet size={20}/>} />
            <hr className="border-gray-300 dark:border-[#2E2E2E]"/>
            <TemplateManagement 
                expenseTemplates={props.expenseTemplates} 
                incomeTemplates={props.incomeTemplates}
                onAdd={props.onAddTemplate} 
                onDelete={props.onDeleteTemplate} 
                expenseCategories={props.expenseCategories} 
                incomeCategories={props.incomeCategories}
                accounts={props.accounts} 
            />
            <hr className="border-gray-300 dark:border-[#2E2E2E]"/>
            <CategoryManagementList title="Categorias de Despesa" items={props.expenseCategories} onAdd={props.onAddExpenseCategory} onUpdate={props.onUpdateExpenseCategory} onDelete={props.onDeleteExpenseCategory} isItemInUse={props.isExpenseCategoryInUse} icon={<Tag size={20}/>} availableIcons={ICON_NAMES}/>
            <CategoryManagementList title="Categorias de Receita" items={props.incomeCategories} onAdd={props.onAddIncomeCategory} onUpdate={props.onUpdateIncomeCategory} onDelete={props.onDeleteIncomeCategory} isItemInUse={props.isIncomeCategoryInUse} icon={<TrendingUp size={20}/>} availableIcons={ICON_NAMES}/>
        </div>
    </Modal>
);

const TransactionItem = ({ item, onEdit, onDelete, onInstallment, onTogglePaid, type, isSelected, onSelect, accountName }) => {
    const isExpense = type === 'expense';
    const isTransfer = type === 'transfer';
    const formattedDate = new Date(item.date.toDate()).toLocaleDateString('pt-BR', {timeZone: 'UTC'});
    const formattedAmount = item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    const selectedClass = isSelected ? 'bg-teal-100 dark:bg-teal-900/50' : 'bg-white dark:bg-[#121212]';
    const paidButtonClass = item.isPaid ? "bg-green-100 text-green-700 dark:bg-green-800/50 dark:text-green-300" : "bg-gray-200 text-gray-700 dark:bg-[#2E2E2E] dark:text-[#A0A0A0]";

    const opacityClass = (type === 'expense' && item.isPaid) ? 'opacity-50' : '';

    if (isTransfer) {
        return (
             <li className={`rounded-xl shadow-md transition-all duration-300 ${selectedClass} animate-fade-in`}>
                <div className="p-4 flex items-center">
                     <input type="checkbox" checked={isSelected} onChange={() => onSelect(item.id)} className="mr-4 w-5 h-5 rounded text-teal-600 focus:ring-teal-500" />
                     <ArrowRightLeft className="mr-4 text-purple-500" size={20}/>
                     <div className="flex-grow">
                        <p className="font-bold text-lg text-gray-800 dark:text-[#E0E0E0]">{item.description}</p>
                        <p className="text-sm text-gray-600 dark:text-[#A0A0A0] pt-1">{formattedDate}</p>
                     </div>
                     <p className="text-xl font-semibold mr-4 text-gray-700 dark:text-gray-200">{formattedAmount}</p>
                     <button onClick={() => onDelete(item)} title="Remover Transferência" className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={20} /></button>
                </div>
            </li>
        )
    }

    return (
        <li className={`rounded-xl shadow-md transition-all duration-300 group ${selectedClass} animate-fade-in`}>
             <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0 border-l-4 ${opacityClass} border-transparent`}>
                <div className="flex items-center flex-1">
                    <input type="checkbox" checked={isSelected} onChange={() => onSelect(item.id)} className="mr-4 w-5 h-5 rounded text-teal-600 focus:ring-teal-500" />
                    {type === 'expense' && <button onClick={() => onTogglePaid(item)} className={`text-xs font-bold py-1 px-3 rounded-full mr-3 ${paidButtonClass}`}>{item.isPaid ? 'Pago' : 'Pagar'}</button>}
                    <div>
                        <p className="font-bold text-lg text-gray-800 dark:text-[#E0E0E0]">{item.description}</p>
                        <p className="text-sm text-gray-500 dark:text-[#A0A0A0]">{item.category} • <span className="font-semibold">{accountName}</span></p>
                        <p className="text-sm text-gray-600 dark:text-[#A0A0A0] pt-1">{formattedDate}</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-between">
                    <p className={`text-xl font-semibold mr-4 ${isExpense ? 'text-red-500' : 'text-green-500'}`}>{formattedAmount}</p>
                    <div className="flex items-center space-x-1">
                        {isExpense && <button onClick={() => onInstallment(item)} title="Criar Parcelas" className="p-2 text-gray-500 hover:text-blue-500"><CopyPlus size={20} /></button>}
                        <button onClick={() => onEdit(item)} title="Editar" className="p-2 text-gray-500 hover:text-yellow-500"><Edit size={20} /></button>
                        <button onClick={() => onDelete(item)} title="Remover" className="p-2 text-gray-500 hover:text-red-500"><Trash2 size={20} /></button>
                    </div>
                </div>
            </div>
        </li>
    );
};

const FabButton = ({ onAddExpense, onAddIncome, onAddFromTemplate, onAddTransfer }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="fixed bottom-8 right-8 z-40 flex flex-col items-center">
            {isOpen && (
                <div className="flex flex-col items-center space-y-3 mb-4">
                    <button onClick={onAddTransfer} className="bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-full p-3 shadow-lg" title="Nova Transferência"><ArrowRightLeft size={20}/></button>
                    <button onClick={onAddFromTemplate} className="bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-full p-3 shadow-lg" title="Adicionar de Template"><ClipboardPaste size={20}/></button>
                    <button onClick={onAddIncome} className="bg-green-500 hover:bg-green-600 text-white font-bold rounded-full p-3 shadow-lg" title="Adicionar Receita"><TrendingUp size={20}/></button>
                    <button onClick={onAddExpense} className="bg-red-500 hover:bg-red-600 text-white font-bold rounded-full p-3 shadow-lg" title="Adicionar Despesa"><TrendingDown size={20}/></button>
                </div>
            )}
             <button onClick={() => setIsOpen(!isOpen)} className={`bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-full p-4 shadow-lg hover:scale-110 transition-all duration-300 z-50 transform ${isOpen ? 'rotate-45' : 'rotate-0'}`}><Plus size={28} /></button>
        </div>
    );
};

const DatePicker = ({ selectedDate, setSelectedDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [displayYear, setDisplayYear] = useState(selectedDate.getFullYear());
    const buttonRef = useRef(null);
    const pickerRef = useRef(null);
    useEffect(() => {
        const handleClickOutside = (event) => { if (pickerRef.current && !pickerRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) { setIsOpen(false); } };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
    const selectMonth = (monthIndex) => { setSelectedDate(new Date(displayYear, monthIndex, 1)); setIsOpen(false); };
    return (
        <div className="relative">
            <button ref={buttonRef} onClick={() => setIsOpen(!isOpen)} className="bg-gray-200 dark:bg-[#2E2E2E] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-2 text-sm w-full flex items-center justify-center gap-2">
                <Calendar size={16} /><span>{`${monthNames[selectedDate.getMonth()]} de ${selectedDate.getFullYear()}`}</span><ChevronDown size={16} />
            </button>
            {isOpen && (
                <div ref={pickerRef} className="absolute top-full mt-2 w-72 bg-white dark:bg-[#1E1E1E] border border-gray-300 dark:border-[#3A3A3A] rounded-lg shadow-xl z-10 p-4">
                    <div className="flex justify-between items-center mb-4">
                        <button onClick={() => setDisplayYear(y => y - 1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ChevronLeft size={20} /></button>
                        <span className="font-bold text-lg">{displayYear}</span>
                        <button onClick={() => setDisplayYear(y => y + 1)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><ChevronRight size={20} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">{monthNames.map((month, index) => (<button key={month} onClick={() => selectMonth(index)} className={`p-2 text-sm rounded-lg hover:bg-teal-600 hover:text-white ${displayYear === selectedDate.getFullYear() && index === selectedDate.getMonth() ? 'bg-teal-600 text-white' : 'bg-gray-100 dark:bg-[#2E2E2E]'}`}>{month.substring(0,3)}</button>))}</div>
                </div>
            )}
        </div>
    );
};

const Toast = ({ message, type, onDismiss }) => {
    useEffect(() => { const timer = setTimeout(onDismiss, 3000); return () => clearTimeout(timer); }, [onDismiss]);
    const baseClasses = "fixed bottom-8 left-1/2 -translate-x-1/2 p-4 rounded-lg shadow-lg text-white animate-fade-in z-50";
    const typeClasses = { success: "bg-green-500", error: "bg-red-500" };
    return (<div className={`${baseClasses} ${typeClasses[type]}`}>{message}</div>);
};

const BulkActionsToolbar = ({ count, onClear, onMarkPaid, onDelete }) => {
    if (count === 0) return null;
    return (
        <div className="sticky top-2 z-30 bg-teal-500/90 dark:bg-teal-800/90 backdrop-blur-sm text-white p-3 rounded-xl shadow-lg flex justify-between items-center mb-4 animate-fade-in">
            <span className="font-bold">{count} {count > 1 ? 'itens selecionados' : 'item selecionado'}</span>
            <div className="flex items-center gap-3">
                <button onClick={() => onMarkPaid(true)} title="Marcar como Pago" className="p-2 hover:bg-white/20 rounded-full"><CheckSquare size={20}/></button>
                <button onClick={() => onMarkPaid(false)} title="Marcar como Não Pago" className="p-2 hover:bg-white/20 rounded-full"><Square size={20}/></button>
                <button onClick={onDelete} title="Apagar Selecionados" className="p-2 hover:bg-white/20 rounded-full"><Trash2 size={20}/></button>
                <button onClick={onClear} title="Limpar Seleção" className="p-2 hover:bg-white/20 rounded-full"><X size={20}/></button>
            </div>
        </div>
    )
}

const Reminders = ({ onTogglePaid, expenses }) => {
    const [isOpen, setIsOpen] = useState(false);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);

    const reminders = useMemo(() => {
        const today = new Date(); today.setHours(0,0,0,0);
        const limit = new Date(); limit.setDate(today.getDate() + 7);
        return expenses.filter(e => e.date?.toDate && !e.isPaid && e.date.toDate() <= limit)
                       .sort((a,b) => a.date.toDate() - b.date.toDate());
    }, [expenses]);
    
     useEffect(() => {
        const handleClickOutside = (event) => { if (panelRef.current && !panelRef.current.contains(event.target) && !buttonRef.current.contains(event.target)) { setIsOpen(false); }};
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative">
            <button ref={buttonRef} onClick={() => setIsOpen(o => !o)} className="relative p-2 text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-full transition-colors" title="Lembretes">
                <Bell size={24}/>
                {reminders.length > 0 && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-black"/>}
            </button>
            {isOpen && (<div ref={panelRef} className="absolute top-full right-0 mt-2 w-80 bg-white dark:bg-[#1E1E1E] border border-gray-200 dark:border-[#3A3A3A] rounded-lg shadow-xl z-20"><div className="p-3 border-b border-gray-200 dark:border-[#3A3A3A]"><h4 className="font-bold text-gray-800 dark:text-white">Lembretes de Pagamento</h4></div>
                    {reminders.length === 0 ? <p className="p-4 text-sm text-gray-500 dark:text-[#A0A0A0]">Nenhuma conta vencida ou próxima do vencimento.</p> : <ul className="max-h-80 overflow-y-auto">{reminders.map(item => { const dueDate = item.date.toDate(); const today = new Date(); today.setHours(0,0,0,0); const isOverdue = dueDate < today; return (<li key={item.id} className="p-3 border-b border-gray-200 dark:border-[#3A3A3A]/50 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] flex items-center justify-between gap-2"><div><p className="text-sm font-semibold text-gray-800 dark:text-[#E0E0E0]">{item.description}</p><p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-yellow-500'}`}>Vence em: {dueDate.toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p></div><button onClick={() => onTogglePaid(item)} className="text-xs bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded">Pagar</button></li>)})}</ul>}</div>
            )}
        </div>
    )
}

const AnnualSummary = ({ expenses, incomes, year }) => {
    const summary = useMemo(() => {
        const data = monthNames.map((name, index) => ({ month: name, income: 0, expense: 0, balance: 0 }));
        incomes.forEach(inc => { if(new Date(inc.date.toDate()).getFullYear() === year) data[new Date(inc.date.toDate()).getMonth()].income += inc.amount; });
        expenses.forEach(exp => { if(new Date(exp.date.toDate()).getFullYear() === year) data[new Date(exp.date.toDate()).getMonth()].expense += exp.amount; });
        data.forEach(monthData => monthData.balance = monthData.income - monthData.expense);
        return data;
    }, [expenses, incomes, year]);

    return (
        <div className="bg-white dark:bg-[#121212] p-4 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4 text-gray-800 dark:text-[#E0E0E0]">Resumo Anual de {year}</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="border-b dark:border-gray-700"><th className="p-3">Mês</th><th className="p-3 text-right text-green-500">Receitas</th><th className="p-3 text-right text-red-500">Despesas</th><th className="p-3 text-right">Balanço</th></tr></thead>
                    <tbody>{summary.map(data => (<tr key={data.month} className="border-b dark:border-gray-800"><td className="p-3 font-semibold">{data.month}</td><td className="p-3 text-right">{data.income.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td><td className="p-3 text-right">{data.expense.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td><td className={`p-3 text-right font-bold ${data.balance >= 0 ? 'text-teal-500' : 'text-orange-500'}`}>{data.balance.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td></tr>))}</tbody>
                </table>
            </div>
        </div>
    );
};

const TemplateSelectionModal = ({ isOpen, onClose, onSelect, expenseTemplates, incomeTemplates, accountsById }) => {
    const [activeTab, setActiveTab] = useState('expense');
    
    const templates = activeTab === 'expense' ? expenseTemplates : incomeTemplates;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Usar um Template">
            <div className="flex border-b border-gray-200 dark:border-gray-600 mb-4">
                <button onClick={() => setActiveTab('expense')} className={`px-4 py-2 font-semibold ${activeTab === 'expense' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>Despesa</button>
                <button onClick={() => setActiveTab('income')} className={`px-4 py-2 font-semibold ${activeTab === 'income' ? 'border-b-2 border-teal-500 text-teal-500' : 'text-gray-500'}`}>Receita</button>
            </div>
            {templates.length > 0 ? (
                <div className="space-y-2">
                    {templates.map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => onSelect(t, activeTab)} 
                            className="w-full text-left p-3 bg-gray-100 dark:bg-[#1E1E1E] hover:bg-teal-100 dark:hover:bg-teal-900 rounded-lg"
                        >
                            <p>{t.description} - {t.amount.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</p>
                            <p className="text-xs text-gray-500">{t.category} • {accountsById[t.accountId]?.name}</p>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-500 dark:text-[#A0A0A0]">
                    <p className="mb-4">Nenhum template de {activeTab === 'expense' ? 'despesa' : 'receita'} encontrado.</p>
                    <p>Para criar um, vá para <span className="font-bold text-teal-500">Configurações &gt; Templates</span>.</p>
                </div>
            )}
        </Modal>
    );
};


// --- COMPONENTE PRINCIPAL APP ---
export default function App() {
    const [userId, setUserId] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [incomes, setIncomes] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [incomeCategories, setIncomeCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [expenseTemplates, setExpenseTemplates] = useState([]);
    const [incomeTemplates, setIncomeTemplates] = useState([]);
    const [authLoading, setAuthLoading] = useState(true);
    const [dataLoading, setDataLoading] = useState(true);
    const [toast, setToast] = useState(null);
    const [theme, setTheme] = useState('dark');
    const [isFormModalOpen, setFormModalOpen] = useState(false);
    const [formType, setFormType] = useState('expense');
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [isInstallmentModalOpen, setInstallmentModalOpen] = useState(false);
    const [expenseForInstallment, setExpenseForInstallment] = useState(null);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [formTemplate, setFormTemplate] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filterAccount, setFilterAccount] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [viewMode, setViewMode] = useState('monthly');

    const toggleTheme = () => { setTheme(prevTheme => { const newTheme = prevTheme === 'light' ? 'dark' : 'light'; localStorage.setItem('theme', newTheme); document.documentElement.className = newTheme; return newTheme; }); };
    useEffect(() => { const savedTheme = localStorage.getItem('theme') || 'dark'; setTheme(savedTheme); document.documentElement.className = savedTheme; }, []);
    
    // Efeito para observar o estado de autenticação
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserId(user ? user.uid : null);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getCollectionRef = useCallback((collectionName) => {
        if (!userId) return null;
        const effectiveAppId = appId || 'default-app-id';
        return collection(db, `artifacts/${effectiveAppId}/users/${userId}/${collectionName}`);
    }, [userId]);
    
    // Efeito para carregar os dados do usuário logado
    useEffect(() => {
        if (!userId) { 
            setExpenses([]); setIncomes([]); setTransfers([]); setAccounts([]);
            setExpenseCategories([]); setIncomeCategories([]);
            setExpenseTemplates([]); setIncomeTemplates([]);
            setDataLoading(false);
            return;
        }

        setDataLoading(true);
        const setupCollection = (collectionName, setData, initialData) => {
            const collRef = getCollectionRef(collectionName);
            if (!collRef) return () => {};
            return onSnapshot(collRef, async (snapshot) => {
                if (snapshot.empty && initialData && initialData.length > 0) { 
                    const batch = writeBatch(db); 
                    initialData.forEach(item => { batch.set(doc(collRef), { ...item, createdAt: serverTimestamp() }); }); 
                    try {
                      await batch.commit();
                    } catch (error) {
                      console.error("Erro ao popular dados iniciais:", error)
                    }
                } else {
                     const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                     setData(data);
                }
            }, (error) => console.error(`Erro na coleção ${collectionName}:`, error));
        };
        
        const unsubs = [
            setupCollection('expenses', setExpenses, []),
            setupCollection('incomes', setIncomes, []),
            setupCollection('transfers', setTransfers, []),
            setupCollection('accounts', setAccounts, initialAccounts),
            setupCollection('expenseCategories', setExpenseCategories, initialCategories),
            setupCollection('incomeCategories', setIncomeCategories, initialIncomeCategories),
            setupCollection('expenseTemplates', setExpenseTemplates, []),
            setupCollection('incomeTemplates', setIncomeTemplates, [])
        ];
        
        const timer = setTimeout(() => setDataLoading(false), 500);
        return () => { unsubs.forEach(unsub => unsub && unsub()); clearTimeout(timer); };
    }, [userId, getCollectionRef]);
    
    const handleSignOut = async () => {
        try {
            await signOut(auth);
            showToast("Você saiu com sucesso.", "success");
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            showToast("Erro ao tentar sair.", "error");
        }
    };

    const accountsById = useMemo(() => accounts.reduce((acc, curr) => { acc[curr.id] = curr; return acc; }, {}), [accounts]);
    const filteredMonthlyIncomes = useMemo(() => { return incomes.filter(inc => { const itemDate = inc.date?.toDate(); if(!itemDate) return false; const matchDate = itemDate.getMonth() === selectedDate.getMonth() && itemDate.getFullYear() === selectedDate.getFullYear(); const matchAccount = filterAccount === 'all' || inc.accountId === filterAccount; return matchDate && matchAccount; }); }, [incomes, selectedDate, filterAccount]);
    const filteredMonthlyExpenses = useMemo(() => { return expenses.filter(exp => { const itemDate = exp.date?.toDate(); if(!itemDate) return false; const matchDate = itemDate.getMonth() === selectedDate.getMonth() && itemDate.getFullYear() === selectedDate.getFullYear(); const matchAccount = filterAccount === 'all' || exp.accountId === filterAccount; return matchDate && matchAccount; }); }, [expenses, selectedDate, filterAccount]);
    const monthlyTotalIncomes = useMemo(() => filteredMonthlyIncomes.reduce((sum, i) => sum + i.amount, 0), [filteredMonthlyIncomes]);
    const monthlyTotalExpenses = useMemo(() => filteredMonthlyExpenses.reduce((sum, e) => sum + e.amount, 0), [filteredMonthlyExpenses]);
    const monthlyBalance = useMemo(() => monthlyTotalIncomes - monthlyTotalExpenses, [monthlyTotalIncomes, monthlyTotalExpenses]);
    const unifiedTransactions = useMemo(() => { const dateFilter = (t) => { const itemDate = t.date?.toDate(); if(!itemDate) return false; if (viewMode === 'yearly') { return itemDate.getFullYear() === selectedDate.getFullYear(); } return itemDate.getMonth() === selectedDate.getMonth() && itemDate.getFullYear() === selectedDate.getFullYear(); }; const accountFilter = (t) => { if(filterAccount === 'all') return true; return t.accountId === filterAccount || t.fromAccountId === filterAccount || t.toAccountId === filterAccount; }; const searchFilter = (t) => t.description?.toLowerCase().includes(searchTerm.toLowerCase()); const expensesWithAccount = expenses.filter(dateFilter).filter(accountFilter).filter(searchFilter).map(t => ({ ...t, type: 'expense' })); const incomesWithAccount = incomes.filter(dateFilter).filter(accountFilter).filter(searchFilter).map(t => ({ ...t, type: 'income' })); const transfersWithAccount = transfers.filter(dateFilter).filter(accountFilter).map(t => ({ ...t, type: 'transfer', description: `Transferência de ${accountsById[t.fromAccountId]?.name || 'N/A'} para ${accountsById[t.toAccountId]?.name || 'N/A'}` })); return [...expensesWithAccount, ...incomesWithAccount, ...transfersWithAccount] .sort((a,b) => (b.date?.toDate() || 0) - (a.date?.toDate() || 0)); }, [expenses, incomes, transfers, filterAccount, selectedDate, searchTerm, accountsById, viewMode]);
    const showToast = (message, type = 'success') => { setToast({ message, type }); };
    
    const handleSaveTransaction = async (data, isRecurring, oldAmount) => {
        const batch = writeBatch(db);
        const collName = formType === 'income' ? 'incomes' : 'expenses';
        const collRef = getCollectionRef(collName);
        const accountRef = doc(getCollectionRef('accounts'), data.accountId);
        const account = accounts.find(a => a.id === data.accountId);
        
        let newBalance = account.balance;
        
        if (itemToEdit) {
            if(itemToEdit.accountId !== data.accountId) {
                 const oldAccountRef = doc(getCollectionRef('accounts'), itemToEdit.accountId);
                 const oldAccount = accounts.find(a => a.id === itemToEdit.accountId);
                 batch.update(oldAccountRef, { balance: oldAccount.balance + (formType === 'income' ? -itemToEdit.amount : itemToEdit.amount) });
                 newBalance += (formType === 'income' ? data.amount : -data.amount);
            } else {
                 const diff = data.amount - (oldAmount || 0);
                 newBalance += (formType === 'income' ? diff : -diff);
            }
             batch.update(doc(collRef, itemToEdit.id), data);
        } else {
            newBalance += (formType === 'income' ? data.amount : -data.amount);
            batch.set(doc(collRef), data);
        }

        if (account) {
            batch.update(accountRef, { balance: newBalance });
        }
        await batch.commit();
        showToast('Transação salva!');
        setItemToEdit(null);
        setFormModalOpen(false);
    };
    
    const handleSaveTransfer = async (data) => {
        const batch = writeBatch(db);
        const fromAccountRef = doc(getCollectionRef('accounts'), data.fromAccountId);
        const toAccountRef = doc(getCollectionRef('accounts'), data.toAccountId);
        const fromAccount = accounts.find(a => a.id === data.fromAccountId);
        const toAccount = accounts.find(a => a.id === data.toAccountId);
        
        batch.update(fromAccountRef, { balance: fromAccount.balance - data.amount });
        batch.update(toAccountRef, { balance: toAccount.balance + data.amount });
        batch.set(doc(getCollectionRef('transfers')), { ...data, createdAt: serverTimestamp() });

        await batch.commit();
        showToast('Transferência realizada com sucesso!');
    };

    const handleDeleteTransaction = async (item) => {
        const batch = writeBatch(db);
        try {
            if (item.type === 'transfer') {
                const transferRef = doc(getCollectionRef('transfers'), item.id);
                batch.delete(transferRef);
    
                const fromAccountRef = doc(getCollectionRef('accounts'), item.fromAccountId);
                const toAccountRef = doc(getCollectionRef('accounts'), item.toAccountId);
                const fromAccount = accounts.find(a => a.id === item.fromAccountId);
                const toAccount = accounts.find(a => a.id === item.toAccountId);
        
                if (fromAccount && toAccount) {
                    batch.update(fromAccountRef, { balance: fromAccount.balance + item.amount });
                    batch.update(toAccountRef, { balance: toAccount.balance - item.amount });
                }
        
            } else { 
                const collName = item.type === 'income' ? 'incomes' : 'expenses';
                const collRef = getCollectionRef(collName);
                batch.delete(doc(collRef, item.id));
        
                if(item.accountId) {
                    const accountRef = doc(getCollectionRef('accounts'), item.accountId);
                    const account = accounts.find(a => a.id === item.accountId);
                    if(account) {
                        const newBalance = account.balance + (item.type === 'income' ? -item.amount : item.amount);
                        batch.update(accountRef, {balance: newBalance});
                    }
                }
            }

            await batch.commit();
            showToast('Transação removida!');
        } catch(error) {
            console.error("Falha ao remover transação:", error);
            showToast("Erro ao remover transação.", "error");
        }
    };

    const handleTogglePaid = async (item) => {
        const collRef = getCollectionRef('expenses');
        try {
            await updateDoc(doc(collRef, item.id), { isPaid: !item.isPaid });
        } catch (error) {
            console.error("Erro ao atualizar status de pagamento:", error);
            showToast("Falha ao atualizar o status.", "error");
        }
    };

    const handleCreateInstallments = async (numInstallments) => {
        if (!expenseForInstallment || !userId) return;
        const expensesCol = getCollectionRef('expenses');
        const batch = writeBatch(db);
        
        const originalDocRef = doc(expensesCol, expenseForInstallment.id);
        batch.update(originalDocRef, { 
            description: `${expenseForInstallment.description} (1/${numInstallments})`, 
            originalDescription: expenseForInstallment.description, 
            isParent: true 
        });

        const { amount, category, accountId, description: originalDescription } = expenseForInstallment;
        const originalDate = expenseForInstallment.date.toDate();
        
        for (let i = 1; i < numInstallments; i++) {
            const installmentDate = new Date(originalDate);
            installmentDate.setMonth(originalDate.getMonth() + i);
            const newDocRef = doc(expensesCol); 
            batch.set(newDocRef, { 
                description: `${originalDescription} (${i + 1}/${numInstallments})`, 
                originalDescription, 
                amount, 
                date: installmentDate, 
                category, 
                accountId, 
                parentId: expenseForInstallment.id, 
                createdAt: serverTimestamp(), 
                isPaid: false 
            });
        }
        await batch.commit();
        setExpenseForInstallment(null);
        showToast(`${numInstallments} parcelas criadas!`);
    };

    const handleSelectTransaction = (id) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const handleBatchDelete = async () => {
        if (selectedIds.size === 0) return;
        const batch = writeBatch(db);
        const accountAdjustments = {};

        for (const id of selectedIds) {
            const item = unifiedTransactions.find(t => t.id === id);
            if (!item) continue;
            
            if (item.type === 'transfer') {
                const transferRef = doc(getCollectionRef('transfers'), item.id);
                batch.delete(transferRef);
                if (item.fromAccountId) {
                    accountAdjustments[item.fromAccountId] = (accountAdjustments[item.fromAccountId] || 0) + item.amount;
                }
                if (item.toAccountId) {
                    accountAdjustments[item.toAccountId] = (accountAdjustments[item.toAccountId] || 0) - item.amount;
                }
            } else {
                const collName = item.type === 'income' ? 'incomes' : 'expenses';
                const itemRef = doc(getCollectionRef(collName), item.id);
                batch.delete(itemRef);
                if (item.accountId) {
                    const adjustment = item.type === 'income' ? -item.amount : item.amount;
                    accountAdjustments[item.accountId] = (accountAdjustments[item.accountId] || 0) + adjustment;
                }
            }
        }

        for (const accountId in accountAdjustments) {
            const accountRef = doc(getCollectionRef('accounts'), accountId);
            const account = accounts.find(a => a.id === accountId);
            if (account) {
                batch.update(accountRef, { balance: account.balance + accountAdjustments[accountId] });
            }
        }
        
        await batch.commit();
        showToast(`${selectedIds.size} transações removidas!`);
        setSelectedIds(new Set());
    };

    const handleBatchMarkPaid = async (isPaid) => {
        if (selectedIds.size === 0) return;
        const batch = writeBatch(db);
        let updatedCount = 0;
        for (const id of selectedIds) {
            const item = expenses.find(t => t.id === id); 
            if (item) {
                batch.update(doc(getCollectionRef('expenses'), id), { isPaid });
                updatedCount++;
            }
        }
        try {
            await batch.commit();
            if (updatedCount > 0) {
              showToast(`${updatedCount} transações atualizadas!`);
            }
            setSelectedIds(new Set());
        } catch(error) {
            console.error("Erro ao atualizar transações em massa:", error);
            showToast("Falha ao atualizar transações.", "error");
        }
    };

    const handleAddAccount = (name) => addDoc(getCollectionRef('accounts'), { name, balance: 0, createdAt: serverTimestamp() });
    const handleUpdateAccount = async (id, newName, oldName) => {
        await updateDoc(doc(getCollectionRef('accounts'), id), { name: newName });
    };
    const handleDeleteAccount = (id) => deleteDoc(doc(getCollectionRef('accounts'), id));
    const isAccountInUse = (id) => expenses.some(t => t.accountId === id) || incomes.some(t => t.accountId === id) || transfers.some(t => t.fromAccountId === id || t.toAccountId === id);

    const expenseCatHandlers = {
        add: (data) => addDoc(getCollectionRef('expenseCategories'), { ...data, createdAt: serverTimestamp() }),
        delete: (id) => deleteDoc(doc(getCollectionRef('expenseCategories'), id)),
        update: (id, newData, oldName) => {
            const batch = writeBatch(db);
            batch.update(doc(getCollectionRef('expenseCategories'), id), newData);
            if(newData.name !== oldName) {
                // Lógica para atualizar transações existentes...
            }
            batch.commit();
        },
        isInUse: (name) => expenses.some(e => e.category === name),
    };

    const incomeCatHandlers = {
        add: (data) => addDoc(getCollectionRef('incomeCategories'), { ...data, createdAt: serverTimestamp() }),
        delete: (id) => deleteDoc(doc(getCollectionRef('incomeCategories'), id)),
        update: (id, newData, oldName) => {
            const batch = writeBatch(db);
            batch.update(doc(getCollectionRef('incomeCategories'), id), newData);
            if(newData.name !== oldName) {
                // Lógica para atualizar transações existentes...
            }
            batch.commit();
        },
        isInUse: (name) => incomes.some(i => i.category === name),
    };
    const onAddTemplate = (type, data) => addDoc(getCollectionRef(`${type}Templates`), data)
    const onDeleteTemplate = (type, id) => deleteDoc(doc(getCollectionRef(`${type}Templates`), id));

    const openAddModal = (type) => { setFormType(type); setItemToEdit(null); setFormTemplate(null); setFormModalOpen(true); };
    const openEditModal = (item) => { setFormType(item.type); setItemToEdit(item); setFormTemplate(null); setFormModalOpen(true); };
    const openTemplateModal = () => { setTemplateModalOpen(true); };
    const handleUseTemplate = (template, type) => { setFormTemplate(template); setFormType(type); setTemplateModalOpen(false); setFormModalOpen(true); };
    const openInstallmentModal = (expense) => { setExpenseForInstallment(expense); setInstallmentModalOpen(true); };

    if (authLoading) {
        return (<div className="bg-gray-50 dark:bg-[#181818] min-h-screen flex justify-center items-center"><div className="flex justify-center items-center h-64 flex-col text-gray-500"><LoaderCircle className="animate-spin mb-4" size={48} /><p className="text-lg">Verificando autenticação...</p></div></div>);
    }
    
    if (!userId) {
        return <LoginPage theme={theme} toggleTheme={toggleTheme} />;
    }
    
    if (dataLoading) {
        return (<div className="bg-gray-50 dark:bg-[#181818] min-h-screen flex justify-center items-center"><div className="flex justify-center items-center h-64 flex-col text-gray-500"><LoaderCircle className="animate-spin mb-4" size={48} /><p className="text-lg">Carregando seus dados...</p></div></div>);
    }
    
    return (
        <div className="bg-gray-50 dark:bg-[#181818] text-gray-800 dark:text-[#E0E0E0] min-h-screen font-sans">
             <div className="container mx-auto p-4 md:p-8">
                <header className="mb-8 relative flex justify-between items-center">
                    <div className="flex-1"></div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 dark:text-[#E0E0E0] text-center flex-1">Controle <span className="text-teal-500">Financeiro</span></h1>
                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-full transition-colors" title="Mudar Tema">{theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}</button>
                        <Reminders onTogglePaid={handleTogglePaid} expenses={expenses} />
                        <button onClick={() => setSettingsModalOpen(true)} className="p-2 text-gray-500 dark:text-[#A0A0A0] hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-full" title="Configurações"><Settings size={24}/></button>
                        <button onClick={handleSignOut} className="p-2 text-gray-500 dark:text-[#A0A0A0] hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-[#2E2E2E] rounded-full transition-colors" title="Sair"><LogOut size={24}/></button>
                    </div>
                </header>

                <div className="bg-white dark:bg-[#121212] p-4 rounded-xl mb-6 shadow-lg flex flex-col gap-4">
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full items-center">
                        <div className="flex items-center gap-2 col-span-1 md:col-span-2 lg:col-span-1">
                           <DatePicker selectedDate={selectedDate} setSelectedDate={setSelectedDate} />
                           <button onClick={() => setViewMode(prev => prev === 'yearly' ? 'monthly' : 'yearly')} className={`p-2 bg-gray-200 dark:bg-[#2E2E2E] border border-gray-300 dark:border-[#3A3A3A] rounded-lg text-sm transition-colors ${viewMode === 'yearly' ? 'bg-teal-500 text-white' : ''}`} title="Alternar Visão Anual/Mensal"><CalendarClock size={16}/></button>
                        </div>
                        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} className="w-full bg-gray-200 dark:bg-[#2E2E2E] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-2 text-sm">
                            <option value="all">Todas as Contas</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <div className="relative w-full lg:col-span-2"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20}/><input type="text" placeholder="Buscar por descrição..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-gray-200 dark:bg-[#2E2E2E] border border-gray-300 dark:border-[#3A3A3A] rounded-lg p-2 text-sm pl-10"/></div>
                    </div>
                    {viewMode === 'monthly' && 
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-[#2E2E2E]">
                            <div className="text-center p-2 rounded-lg bg-green-100 dark:bg-green-800/50"><p className="text-sm text-gray-500 dark:text-[#A0A0A0]">Receitas</p><p className="text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">{monthlyTotalIncomes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                            <div className="text-center p-2 rounded-lg bg-red-100 dark:bg-red-800/50"><p className="text-sm text-gray-500 dark:text-[#A0A0A0]">Despesas</p><p className="text-xl lg:text-2xl font-bold text-red-600 dark:text-red-400">{monthlyTotalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                            <div className={`text-center p-2 rounded-lg ${monthlyBalance >= 0 ? 'bg-teal-100 dark:bg-teal-800/50' : 'bg-orange-100 dark:bg-orange-800/50'}`}><p className="text-sm text-gray-500 dark:text-[#A0A0A0]">Balanço</p><p className={`text-xl lg:text-2xl font-bold ${monthlyBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-orange-600 dark:text-orange-400'}`}>{monthlyBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                        </div>
                    }
                </div>
                
                <BulkActionsToolbar count={selectedIds.size} onClear={() => setSelectedIds(new Set())} onMarkPaid={handleBatchMarkPaid} onDelete={handleBatchDelete} />

                <main className="mt-6 pb-28">{viewMode === 'yearly' ? <AnnualSummary expenses={expenses} incomes={incomes} year={selectedDate.getFullYear()} /> : unifiedTransactions.length > 0 ? (<ul className="space-y-4">{unifiedTransactions.map(item => (<TransactionItem key={item.id} item={item} onEdit={() => openEditModal(item)} onDelete={() => handleDeleteTransaction(item)} onInstallment={() => openInstallmentModal(item)} onTogglePaid={() => handleTogglePaid(item)} type={item.type} accountName={accountsById[item.accountId]?.name || accountsById[item.fromAccountId]?.name } isSelected={selectedIds.has(item.id)} onSelect={handleSelectTransaction} />))}</ul>) : (<div className="text-center py-16 px-6 bg-white dark:bg-[#121212] rounded-xl"><FileText size={48} className="mx-auto text-gray-400" /><h3 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white">Nenhuma transação encontrada.</h3><p className="mt-2 text-gray-500 dark:text-[#A0A0A0]">Tente um filtro diferente ou adicione uma nova transação.</p></div>)}</main>

                <FabButton onAddExpense={() => openAddModal('expense')} onAddIncome={() => openAddModal('income')} onAddFromTemplate={openTemplateModal} onAddTransfer={() => setTransferModalOpen(true)} />
                
                {isFormModalOpen && <Modal isOpen={isFormModalOpen} onClose={() => setFormModalOpen(false)} title={`${itemToEdit ? 'Editar' : 'Adicionar'} ${formType === 'income' ? 'Receita' : 'Despesa'}`}><TransactionForm onSave={handleSaveTransaction} onClose={() => setFormModalOpen(false)} itemToEdit={itemToEdit} categories={formType === 'income' ? incomeCategories : expenseCategories} accounts={accounts} type={formType} template={formTemplate}/></Modal>}
                {isTransferModalOpen && <Modal isOpen={isTransferModalOpen} onClose={() => setTransferModalOpen(false)} title="Nova Transferência"><TransferForm onSave={handleSaveTransfer} onClose={() => setTransferModalOpen(false)} accounts={accounts} /></Modal>}
                {isInstallmentModalOpen && <InstallmentModal isOpen={isInstallmentModalOpen} onClose={() => setInstallmentModalOpen(false)} onConfirm={handleCreateInstallments} />}
                {isSettingsModalOpen && <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} accounts={accounts} expenseTemplates={expenseTemplates} incomeTemplates={incomeTemplates} onAddTemplate={onAddTemplate} onDeleteTemplate={onDeleteTemplate} onAddAccount={handleAddAccount} onUpdateAccount={handleUpdateAccount} onDeleteAccount={handleDeleteAccount} isAccountInUse={isAccountInUse} expenseCategories={expenseCategories} onAddExpenseCategory={expenseCatHandlers.add} onUpdateExpenseCategory={expenseCatHandlers.update} onDeleteExpenseCategory={expenseCatHandlers.delete} isExpenseCategoryInUse={expenseCatHandlers.isInUse} incomeCategories={incomeCategories} onAddIncomeCategory={incomeCatHandlers.add} onUpdateIncomeCategory={incomeCatHandlers.update} onDeleteIncomeCategory={incomeCatHandlers.delete} isIncomeCategoryInUse={incomeCatHandlers.isInUse} />}
                {isTemplateModalOpen && (<TemplateSelectionModal isOpen={isTemplateModalOpen} onClose={() => setTemplateModalOpen(false)} onSelect={handleUseTemplate} expenseTemplates={expenseTemplates} incomeTemplates={incomeTemplates} accountsById={accountsById} />)}
                {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
            </div>
        </div>
    );
}
