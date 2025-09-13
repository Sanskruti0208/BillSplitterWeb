/*(function () {

    const peopleTableBody = document.querySelector('#peopleTable tbody');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const settlementBtn = document.getElementById('settlementBtn');
    const saveBtn = document.getElementById('saveBtn');
    const shareBtn = document.getElementById('shareBtn');
    const billNameInput = document.getElementById('billName');
    const totalArea = document.getElementById('totalArea');
    const resultsDiv = document.getElementById('results');
    const qrDiv = document.getElementById('qr');
    const totalAmountInput = document.getElementById('totalAmount');
    const numPeopleInput = document.getElementById('numPeople');
    const fairShareArea = document.getElementById('fairShareArea');
    const historyList = document.getElementById('history');

    let people = [];
    let lastShareText = '';
    let fairShare = 0;

    function r(v) { return Math.round((v + Number.EPSILON) * 100) / 100 }

    function escapeHtml(s) {
        return (s + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderPeople() {
        peopleTableBody.innerHTML = '';
        people.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><input class="pname" data-i="${idx}" value="${escapeHtml(p.name)}" placeholder="Name" /></td>
                <td><input class="pamt" data-i="${idx}" type="number" step="0.01" value="${p.amount}" /></td>
                <td><button data-i="${idx}" class="remove">Remove</button></td>
            `.trim();
            peopleTableBody.appendChild(tr);
        });

        document.querySelectorAll('.pname').forEach(inp => inp.addEventListener('input', e => {
            people[+e.target.dataset.i].name = e.target.value;
        }));
        document.querySelectorAll('.pamt').forEach(inp => inp.addEventListener('input', e => {
            people[+e.target.dataset.i].amount = parseFloat(inp.value) || 0;
        }));
        document.querySelectorAll('.remove').forEach(btn => btn.addEventListener('click', e => {
            people.splice(+e.target.dataset.i, 1);
            renderPeople();
        }));
    }

    function addPerson(name = '', amount = 0) {
        people.push({ name: name || `Person ${people.length + 1}`, amount: Number(amount) || 0 });
        renderPeople();
    }

    function calculateFairShare() {
        const totalBill = parseFloat(totalAmountInput.value);
        const numPeople = parseInt(numPeopleInput.value);

        if (isNaN(totalBill) || isNaN(numPeople) || numPeople <= 0) {
            alert("Enter valid total bill and number of people");
            return;
        }

        fairShare = r(totalBill / numPeople);
        fairShareArea.innerHTML = `Fair share per person: ₹${fairShare}`;

        // Reset people rows
        people = [];
        for (let i = 0; i < numPeople; i++) addPerson('', 0);

        resultsDiv.innerHTML = '';
        lastShareText = '';
        totalArea.innerHTML = '';
    }

    function calculateSettlement() {
        resultsDiv.innerHTML = '';
        qrDiv.innerHTML = '';

        document.querySelectorAll('.pname').forEach(inp => { people[+inp.dataset.i].name = inp.value });
        document.querySelectorAll('.pamt').forEach(inp => { people[+inp.dataset.i].amount = parseFloat(inp.value) || 0 });

        const valid = people.filter(p => p.name.trim() !== '');
        if (valid.length < 2) {
            resultsDiv.innerHTML = '<div class="small">Add at least 2 people.</div>';
            return;
        }

        const totalBill = parseFloat(totalAmountInput.value);
        const totalPaid = r(valid.reduce((sum, p) => sum + (p.amount || 0), 0));
        const n = valid.length;

        if (totalPaid < totalBill) {
            resultsDiv.innerHTML = `<div class="small" style="color:red">⚠ Not enough money collected. Missing ₹${r(totalBill - totalPaid)}.</div>`;
            return;
        }
        if (totalPaid > totalBill) {
            resultsDiv.innerHTML = `<div class="small" style="color:red">⚠ Extra money collected. Extra ₹${r(totalPaid - totalBill)}.</div>`;
            return;
        }

        const balances = valid.map(p => ({ name: p.name, bal: r(Number(p.amount || 0) - fairShare) }));
        const creditors = balances.filter(b => b.bal > 0).map(b => ({ name: b.name, bal: b.bal }));
        const debtors = balances.filter(b => b.bal < 0).map(b => ({ name: b.name, owe: Math.abs(b.bal) }));

        creditors.sort((a, b) => b.bal - a.bal);
        debtors.sort((a, b) => b.owe - a.owe);

        const transactions = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const pay = Math.min(debtors[i].owe, creditors[j].bal);
            transactions.push({ from: debtors[i].name, to: creditors[j].name, amount: r(pay) });
            debtors[i].owe = r(debtors[i].owe - pay);
            creditors[j].bal = r(creditors[j].bal - pay);
            if (Math.abs(debtors[i].owe) < 0.01) i++;
            if (Math.abs(creditors[j].bal) < 0.01) j++;
        }

        totalArea.innerHTML = `<div class="note">Total Bill: ₹${r(totalBill)} • People: ${n} • Fair share: ₹${fairShare}</div>`;

        const out = document.createElement('div');
        if (transactions.length === 0) {
            out.innerHTML = '<div class="small">No transfers needed — everyone paid exactly the share.</div>';
        } else {
            const ul = document.createElement('ul');
            transactions.forEach(t => {
                const li = document.createElement('li');
                li.textContent = `${t.from} → ${t.to} : ₹${t.amount}`;
                ul.appendChild(li);
            });
            out.appendChild(ul);
        }
        resultsDiv.appendChild(out);

        lastShareText = generateShareText({
            name: billNameInput.value || 'Untitled bill',
            total: r(totalBill), avg: fairShare, participants: valid, transactions
        });
    }

    function generateShareText({ name, total, avg, participants, transactions }) {
        const when = new Date().toLocaleString();
        let s = `Bill: ${name}\nWhen: ${when}\nTotal: ₹${total}  |  Per-person: ₹${avg}\nParticipants:\n`;
        participants.forEach(p => s += ` - ${p.name}: ₹${r(p.amount)}\n`);
        s += '\nSettlement:\n';
        if (transactions.length === 0) s += 'No transfers needed.\n';
        else transactions.forEach(t => s += ` - ${t.from} pays ${t.to} ₹${t.amount}\n`);
        s += '\n(Generated by BillSplitter prototype)';
        return s;
    }

    function showShare(text = lastShareText) {
        if (!text) {
            alert('Click Settlement first');
            return;
        }

        navigator.clipboard.writeText(text).then(() => { alert('Bill summary copied to clipboard!'); });
        qrDiv.innerHTML = '';
        new QRCode(qrDiv, { text: text, width: 220, height: 220 });
    }

    // Init
    people = [];
    renderPeople();

    addPersonBtn.addEventListener('click', () => addPerson());
    calculateBtn.addEventListener('click', calculateFairShare);
    settlementBtn.addEventListener('click', calculateSettlement);

    saveBtn.addEventListener('click', () => {
        if (!lastShareText) {
            alert("Click Settlement first to generate the bill.");
            return;
        }
        const li = document.createElement('li');
        li.textContent = billNameInput.value || `Untitled bill`;

        const shareBtnSaved = document.createElement('button');
        shareBtnSaved.textContent = "Share";
        shareBtnSaved.addEventListener('click', () => showShare(lastShareText));

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener('click', () => li.remove());

        li.appendChild(shareBtnSaved);
        li.appendChild(deleteBtn);
        historyList.appendChild(li);

        alert("Bill saved!");
    });

    shareBtn.addEventListener('click', () => showShare());

})();
*/

(function () {
    const peopleTableBody = document.querySelector('#peopleTable tbody');
    const addPersonBtn = document.getElementById('addPersonBtn');
    const calculateBtn = document.getElementById('calculateBtn');
    const settlementBtn = document.getElementById('settlementBtn');
    const saveBtn = document.getElementById('saveBtn');
    const shareBtn = document.getElementById('shareBtn');
    const billNameInput = document.getElementById('billName');
    const totalArea = document.getElementById('totalArea');
    const resultsDiv = document.getElementById('results');
    const qrDiv = document.getElementById('qr');
    const totalAmountInput = document.getElementById('totalAmount');
    const numPeopleInput = document.getElementById('numPeople');
    const fairShareArea = document.getElementById('fairShareArea');
    const historyList = document.getElementById('history');

    let people = [];
    let lastShareText = '';
    let lastTransactions = [];        // <-- store latest transactions for saving
    let fairShare = 0;

    function r(v) { return Math.round((v + Number.EPSILON) * 100) / 100 }

    function escapeHtml(s) {
        return (s + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderPeople() {
        peopleTableBody.innerHTML = '';
        people.forEach((p, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${idx + 1}</td>
                <td><input class="pname" data-i="${idx}" value="${escapeHtml(p.name || '')}" placeholder="Name" /></td>
                <td><input class="pamt" data-i="${idx}" type="number" step="0.01" value="${p.amount ?? 0}" /></td>
                <td><button data-i="${idx}" class="remove">Remove</button></td>
            `.trim();
            peopleTableBody.appendChild(tr);
        });

        document.querySelectorAll('.pname').forEach(inp => inp.addEventListener('input', e => {
            people[+e.target.dataset.i].name = e.target.value;
        }));
        document.querySelectorAll('.pamt').forEach(inp => inp.addEventListener('input', e => {
            people[+e.target.dataset.i].amount = parseFloat(inp.value) || 0;
        }));
        document.querySelectorAll('.remove').forEach(btn => btn.addEventListener('click', e => {
            people.splice(+e.target.dataset.i, 1);
            renderPeople();
        }));
    }

    function addPerson(name = '', amount = 0) {
        people.push({ name: name || `Person ${people.length + 1}`, amount: Number(amount) || 0 });
        renderPeople();
    }

    function calculateFairShare() {
        const totalBill = parseFloat(totalAmountInput.value);
        const numPeople = parseInt(numPeopleInput.value);

        if (isNaN(totalBill) || isNaN(numPeople) || numPeople <= 0) {
            alert("Enter valid total bill and number of people");
            return;
        }

        fairShare = r(totalBill / numPeople);
        fairShareArea.innerHTML = `Fair share per person: ₹${fairShare}`;

        // Reset people rows
        people = [];
        for (let i = 0; i < numPeople; i++) addPerson('', 0);

        resultsDiv.innerHTML = '';
        lastShareText = '';
        lastTransactions = [];
        totalArea.innerHTML = '';
    }

    function calculateSettlement() {
        resultsDiv.innerHTML = '';
        qrDiv.innerHTML = '';

        // update people[] from inputs
        document.querySelectorAll('.pname').forEach(inp => { people[+inp.dataset.i].name = inp.value });
        document.querySelectorAll('.pamt').forEach(inp => { people[+inp.dataset.i].amount = parseFloat(inp.value) || 0 });

        const valid = people.filter(p => p.name && p.name.trim() !== '');
        if (valid.length < 2) {
            resultsDiv.innerHTML = '<div class="small">Add at least 2 people.</div>';
            return;
        }

        const totalBill = parseFloat(totalAmountInput.value);
        const totalPaid = r(valid.reduce((sum, p) => sum + (p.amount || 0), 0));
        const n = valid.length;

        if (totalPaid < totalBill) {
            resultsDiv.innerHTML = `<div class="small" style="color:red">⚠ Not enough money collected. Missing ₹${r(totalBill - totalPaid)}.</div>`;
            return;
        }
        if (totalPaid > totalBill) {
            resultsDiv.innerHTML = `<div class="small" style="color:red">⚠ Extra money collected. Extra ₹${r(totalPaid - totalBill)}.</div>`;
            return;
        }

        // compute balances
        const balances = valid.map(p => ({ name: p.name, bal: r(Number(p.amount || 0) - fairShare) }));
        const creditors = balances.filter(b => b.bal > 0).map(b => ({ name: b.name, bal: b.bal }));
        const debtors = balances.filter(b => b.bal < 0).map(b => ({ name: b.name, owe: Math.abs(b.bal) }));

        creditors.sort((a, b) => b.bal - a.bal);
        debtors.sort((a, b) => b.owe - a.owe);

        // greedy settlement
        const transactions = [];
        let i = 0, j = 0;
        while (i < debtors.length && j < creditors.length) {
            const pay = Math.min(debtors[i].owe, creditors[j].bal);
            transactions.push({ from: debtors[i].name, to: creditors[j].name, amount: r(pay) });
            debtors[i].owe = r(debtors[i].owe - pay);
            creditors[j].bal = r(creditors[j].bal - pay);
            if (Math.abs(debtors[i].owe) < 0.01) i++;
            if (Math.abs(creditors[j].bal) < 0.01) j++;
        }

        // show totals and transactions
        totalArea.innerHTML = `<div class="note">Total Bill: ₹${r(totalBill)} • People: ${n} • Fair share: ₹${fairShare}</div>`;

        const out = document.createElement('div');
        if (transactions.length === 0) {
            out.innerHTML = '<div class="small">No transfers needed — everyone paid exactly the share.</div>';
        } else {
            const ul = document.createElement('ul');
            transactions.forEach(t => {
                const li = document.createElement('li');
                li.textContent = `${t.from} → ${t.to} : ₹${t.amount}`;
                ul.appendChild(li);
            });
            out.appendChild(ul);
        }
        resultsDiv.appendChild(out);

        // store share text & transactions for saving/sharing
        lastTransactions = transactions;
        lastShareText = generateShareText({
            name: billNameInput.value || 'Untitled bill',
            total: r(totalBill), avg: fairShare, participants: valid, transactions
        });
    }

    function generateShareText({ name, total, avg, participants, transactions }) {
        const when = new Date().toLocaleString();
        let s = `Bill: ${name}\nWhen: ${when}\nTotal: ₹${total}  |  Per-person: ₹${avg}\nParticipants:\n`;
        participants.forEach(p => s += ` - ${p.name}: ₹${r(p.amount)}\n`);
        s += '\nSettlement:\n';
        if (!transactions || transactions.length === 0) s += 'No transfers needed.\n';
        else transactions.forEach(t => s += ` - ${t.from} pays ${t.to} ₹${t.amount}\n`);
        s += '\n(Generated by BillSplitter)';
        return s;
    }

    // --- API helpers ---
    async function saveBillToServer(bill) {
        try {
            const res = await fetch("/api/bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bill)
            });
            if (!res.ok) throw new Error('save failed');
            return await res.json();
        } catch (err) {
            console.error("Save failed:", err);
            throw err;
        }
    }

    async function loadBills() {
        try {
            const res = await fetch("/api/bills");
            if (!res.ok) throw new Error('load failed');
            const bills = await res.json();
            historyList.innerHTML = "";
            bills.forEach(b => {
                const li = document.createElement('li');
                li.innerHTML = `<div style="flex:1">
                    <strong>${escapeHtml(b.name)}</strong>
                    <div class="small">₹${b.total} • ${(b.participants || []).length} ppl • ${new Date(b.created_at).toLocaleString()}</div>
                    </div>`;
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';

                const actions = document.createElement('div');
                actions.style.display = 'flex';
                actions.style.gap = '6px';

                const viewBtn = document.createElement('button');
                viewBtn.textContent = 'View';
                viewBtn.className = 'small-btn';
                viewBtn.addEventListener('click', () => viewBill(b.id));

                const shareBtnSaved = document.createElement('button');
                shareBtnSaved.textContent = "Share";
                shareBtnSaved.className = 'small-btn';
                shareBtnSaved.addEventListener('click', () => {
                    const txt = generateShareText({
                        name: b.name,
                        total: b.total,
                        avg: b.fair_share,
                        participants: b.participants || [],
                        transactions: b.transactions || []
                    });
                    showShare(txt);
                });

                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Delete';
                deleteBtn.className = 'small-btn danger';
                deleteBtn.addEventListener('click', async () => {
                    if (!confirm('Delete this saved bill?')) return;
                    await fetch(`/api/bills/${b.id}`, { method: 'DELETE' });
                    await loadBills();
                });

                actions.appendChild(viewBtn);
                actions.appendChild(shareBtnSaved);
                actions.appendChild(deleteBtn);

                li.appendChild(actions);
                historyList.appendChild(li);
            });
        } catch (err) {
            console.error("Load failed:", err);
            historyList.innerHTML = '<li class="small muted">Could not load saved bills (server unreachable).</li>';
        }
    }

    async function viewBill(id) {
        try {
            const res = await fetch(`/api/bills/${id}`);
            if (!res.ok) throw new Error('not found');
            const b = await res.json();

            // populate UI
            billNameInput.value = b.name;
            totalAmountInput.value = parseFloat(b.total);
            numPeopleInput.value = (b.participants || []).length;
            fairShare = parseFloat(b.fair_share);
            fairShareArea.innerHTML = `Fair share per person: ₹${fairShare}`;

            // set people rows
            people = (b.participants || []).map(p => ({ name: p.name, amount: Number(p.amount) || 0 }));
            renderPeople();

            // show totals and settlement (transactions)
            totalArea.innerHTML = `<div class="note">Total Bill: ₹${r(b.total)} • People: ${people.length} • Fair share: ₹${fairShare}</div>`;
            resultsDiv.innerHTML = '';
            if (b.transactions && b.transactions.length) {
                const ul = document.createElement('ul');
                b.transactions.forEach(t => {
                    const li = document.createElement('li');
                    li.textContent = `${t.from} → ${t.to} : ₹${t.amount}`;
                    ul.appendChild(li);
                });
                resultsDiv.appendChild(ul);
            } else {
                resultsDiv.innerHTML = '<div class="small">No transfers needed — everyone paid exactly the share.</div>';
            }

            // store last share text / transactions for saving/sharing
            lastTransactions = b.transactions || [];
            lastShareText = generateShareText({
                name: b.name,
                total: b.total,
                avg: b.fair_share,
                participants: b.participants || [],
                transactions: b.transactions || []
            });
        } catch (err) {
            console.error('viewBill error:', err);
            alert('Could not load saved bill.');
        }
    }

    function showShare(text = lastShareText) {
        if (!text) {
            alert('Click Settlement first');
            return;
        }

        navigator.clipboard.writeText(text).then(() => { alert('Bill summary copied to clipboard!'); }).catch(() => {/* ignore */ });
        qrDiv.innerHTML = '';
        new QRCode(qrDiv, { text: text, width: 220, height: 220 });
    }

    // --- init & event wiring ---
    people = [];
    renderPeople();
    loadBills();

    addPersonBtn.addEventListener('click', () => addPerson());
    calculateBtn.addEventListener('click', calculateFairShare);
    settlementBtn.addEventListener('click', calculateSettlement);

    saveBtn.addEventListener('click', async () => {
        if (!lastShareText) {
            alert("Click Settlement first to generate the bill.");
            return;
        }
        const bill = {
            name: billNameInput.value || "Untitled bill",
            total: parseFloat(totalAmountInput.value) || 0,
            fair_share: fairShare,
            participants: people.map(p => ({ name: p.name, amount: p.amount })),
            transactions: lastTransactions || []
        };

        try {
            await saveBillToServer(bill);
            await loadBills();
            alert("Bill saved to server!");
        } catch (err) {
            alert("Could not save bill to server. See console.");
        }
    });

    shareBtn.addEventListener('click', () => showShare());

})();
