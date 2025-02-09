
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];
const CATEGORIES = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Housing',
    'Utilities',
    'Other'
];

let expenses = [];
let exchangeRates = {};
let baseCurrency = 'USD';

const expenseForm = document.getElementById('expenseForm');
const expenseTableBody = document.getElementById('expenseTableBody');
const baseCurrencySelect = document.getElementById('baseCurrency');
const rateStatus = document.getElementById('rateStatus');
const categoryBreakdown = document.getElementById('categoryBreakdown');

function loadExpenses() {
    const savedExpenses = localStorage.getItem('expenses');
    expenses = savedExpenses ? JSON.parse(savedExpenses) : [];
    renderExpenses();
    updateChart();
}

function saveExpenses() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
}

async function fetchExchangeRates() {
    rateStatus.textContent = 'Loading rates...';
    try {
        const API_KEY = 'YOUR_API_KEY'; 
        const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`, {
            headers: {
                'Accept': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Failed to fetch exchange rates');
        const data = await response.json();
        exchangeRates = data.rates;
        rateStatus.textContent = 'Rates updated successfully';
        setTimeout(() => {
            rateStatus.textContent = '';
        }, 3000);
        renderExpenses();
        updateChart();
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
        rateStatus.textContent = 'Unable to load exchange rates. Using stored rates.';
        exchangeRates = CURRENCIES.reduce((acc, curr) => ({
            ...acc,
            [curr]: curr === baseCurrency ? 1 : 1
        }), {});
    }
}

function convertAmount(amount, fromCurrency) {
    if (fromCurrency === baseCurrency) return amount;
    if (!exchangeRates[fromCurrency]) return amount;
    return amount * (1 / exchangeRates[fromCurrency]);
}

function formatCurrency(amount, currency) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

function validateExpenseForm(amount, description) {
    if (amount <= 0) {
        alert('Amount must be greater than 0');
        return false;
    }
    if (description.trim().length < 3) {
        alert('Description must be at least 3 characters long');
        return false;
    }
    return true;
}

function addExpense(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.getElementById('currency').value;
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('expenseDate').value || new Date().toISOString().split('T')[0];

    if (!validateExpenseForm(amount, description)) {
        return;
    }

    const newExpense = {
        id: Date.now().toString(),
        amount,
        currency,
        description,
        category,
        date: new Date(date).toISOString()
    };

    expenses.push(newExpense);
    saveExpenses();
    renderExpenses();
    updateChart();
    expenseForm.reset();
}

function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    saveExpenses();
    renderExpenses();
    updateChart();
}

function renderExpenses() {
    expenseTableBody.innerHTML = '';
    expenses.forEach(expense => {
        const baseAmount = convertAmount(expense.amount, expense.currency);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(expense.date).toLocaleDateString()}</td>
            <td>${expense.description}</td>
            <td>${expense.category}</td>
            <td>
                ${formatCurrency(expense.amount, expense.currency)}
                ${expense.currency !== baseCurrency ? 
                    `<span class="text-gray-500">(${formatCurrency(baseAmount, baseCurrency)})</span>` : 
                    ''}
            </td>
            <td>
                <button onclick="deleteExpense('${expense.id}')" class="delete-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                </button>
            </td>
        `;
        expenseTableBody.appendChild(row);
    });
}

function updateChart() {
    const categoryTotals = {};
    let total = 0;

    expenses.forEach(expense => {
        const amount = convertAmount(expense.amount, expense.currency);
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + amount;
        total += amount;
    });

    categoryBreakdown.innerHTML = '';
    Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, amount]) => {
            const percentage = ((amount / total) * 100).toFixed(1);
            const div = document.createElement('div');
            div.className = 'category-item';
            div.innerHTML = `
                <div class="category-header">
                    <span>${category}</span>
                    <span>${formatCurrency(amount, baseCurrency)} (${percentage}%)</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
            `;
            categoryBreakdown.appendChild(div);
        });
}

expenseForm.addEventListener('submit', addExpense);
baseCurrencySelect.addEventListener('change', (e) => {
    baseCurrency = e.target.value;
    fetchExchangeRates();
});

loadExpenses();
fetchExchangeRates();