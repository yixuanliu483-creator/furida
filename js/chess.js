// 国际象棋 - 规则引擎用 chess.js（本地跑，免费），Furida 的点评走后端 DeepSeek

const API_URLS = ['https://furida.de5.net', 'https://furida-ai.yixuanliu483.workers.dev'];

async function apiFetch(path, options) {
    let lastError;
    for (const base of API_URLS) {
        try {
            return await fetch(base + path, options);
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError;
}

function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ---------- 语音相关（跟 chat.js 逻辑一致）----------

function isVoiceEnabled() {
    return localStorage.getItem('voiceEnabled') === 'true';
}

function toggleVoice() {
    const enabled = !isVoiceEnabled();
    localStorage.setItem('voiceEnabled', enabled ? 'true' : 'false');
    const btn = document.getElementById('voiceToggleBtn');
    if (btn) btn.textContent = enabled ? '🔊 语音已开启' : '🔇 语音已关闭';
}

async function fetchTTSAudio(text) {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch('/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });
        const data = await response.json();
        return data.audio || null;
    } catch (error) {
        console.error('TTS 请求出错:', error);
        return null;
    }
}

function playAudioBase64(base64) {
    return new Promise((resolve) => {
        const audio = new Audio(`data:audio/mp3;base64,${base64}`);
        audio.onended = resolve;
        audio.onerror = resolve;
        audio.play().catch(() => resolve());
    });
}

async function playSentencesQueue(sentences) {
    if (!isVoiceEnabled() || !sentences || sentences.length === 0) return;
    const audioPromises = sentences.map(s => fetchTTSAudio(s));
    for (const promise of audioPromises) {
        const audioBase64 = await promise;
        if (audioBase64) await playAudioBase64(audioBase64);
    }
}

// ---------- 棋局状态 ----------

let game = new Chess();
let selectedSquare = null;
let legalTargets = [];
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const UNICODE_PIECES = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚', // black（小写，本身就是深色符号）
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'  // white
};

function squareName(row, col) {
    // row 0 = rank 8（顶部），col 0 = a 列
    return FILES[col] + (8 - row);
}

function renderBoard() {
    const board = game.board();
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const sq = squareName(row, col);
            const piece = board[row][col];
            const div = document.createElement('div');
            div.className = 'chess-square ' + ((row + col) % 2 === 0 ? 'light' : 'dark');
            div.dataset.square = sq;

            if (piece) {
                const symbol = piece.color === 'w' ? UNICODE_PIECES[piece.type.toUpperCase()] : UNICODE_PIECES[piece.type];
                div.textContent = symbol;
            }

            if (sq === selectedSquare) div.classList.add('selected');
            if (legalTargets.includes(sq)) {
                div.classList.add(piece ? 'legal-capture' : 'legal-move');
            }

            div.addEventListener('click', () => onSquareClick(sq));
            boardEl.appendChild(div);
        }
    }
}

function onSquareClick(sq) {
    if (game.turn() !== 'w' || game.isGameOver()) return;

    if (selectedSquare && legalTargets.includes(sq)) {
        makePlayerMove(selectedSquare, sq);
        selectedSquare = null;
        legalTargets = [];
        renderBoard();
        return;
    }

    const piece = game.get(sq);
    if (piece && piece.color === 'w') {
        selectedSquare = sq;
        legalTargets = game.moves({ square: sq, verbose: true }).map(m => m.to);
    } else {
        selectedSquare = null;
        legalTargets = [];
    }
    renderBoard();
}

async function makePlayerMove(from, to) {
    let moveResult;
    try {
        moveResult = game.move({ from, to, promotion: 'q' });
    } catch {
        return;
    }
    if (!moveResult) return;

    renderBoard();
    updateStatus();

    let context = `玩家走了 ${moveResult.san}`;
    if (moveResult.captured) context += `，吃掉了对方一个棋子`;

    if (game.isGameOver()) {
        context += describeGameOver();
        await commentOn(context);
        return;
    }

    document.getElementById('chessStatus').textContent = 'Furida 思考中...';
    setTimeout(async () => {
        const aiMove = pickAIMove();
        if (aiMove) {
            const aiResult = game.move(aiMove);
            renderBoard();
            updateStatus();

            let aiContext = `Furida（执黑）走了 ${aiResult.san}`;
            if (aiResult.captured) aiContext += `，吃掉了玩家一个棋子`;
            if (game.isGameOver()) aiContext += describeGameOver();

            await commentOn(aiContext);
        }
    }, 400);
}

function describeGameOver() {
    if (game.isCheckmate()) return game.turn() === 'w' ? '，将死了玩家，Furida 获胜！' : '，将死了Furida，玩家获胜！';
    if (game.isDraw()) return '，双方战平';
    if (game.isStalemate()) return '，形成逼和';
    return '';
}

async function commentOn(context) {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch('/chess-comment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ context })
        });
        const data = await response.json();
        if (data.comment) {
            const el = document.getElementById('furidaComment');
            el.textContent = '💬 ' + data.comment;
            el.style.display = 'block';
            playSentencesQueue(data.sentences && data.sentences.length ? data.sentences : [data.comment]);
        }
    } catch (error) {
        console.error('获取点评失败:', error);
    }
}

function updateStatus() {
    const statusEl = document.getElementById('chessStatus');
    if (game.isCheckmate()) {
        statusEl.textContent = game.turn() === 'w' ? 'Furida 获胜（将死）' : '你赢了（将死Furida）！';
    } else if (game.isDraw() || game.isStalemate()) {
        statusEl.textContent = '战平';
    } else if (game.isCheck()) {
        statusEl.textContent = game.turn() === 'w' ? '你被将军了！' : 'Furida 被将军了！';
    } else {
        statusEl.textContent = game.turn() === 'w' ? '轮到你走了（执白）' : 'Furida 思考中...';
    }
}

// ---------- 中等难度 AI：Minimax + 简单材质评估 ----------

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluateBoard() {
    let score = 0;
    const board = game.board();
    for (const row of board) {
        for (const cell of row) {
            if (!cell) continue;
            const val = PIECE_VALUES[cell.type];
            score += cell.color === 'b' ? val : -val;
        }
    }
    return score;
}

function minimax(depth, alpha, beta, maximizing) {
    if (depth === 0 || game.isGameOver()) {
        return evaluateBoard();
    }

    const moves = game.moves();
    if (maximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            game.move(move);
            const evalScore = minimax(depth - 1, alpha, beta, false);
            game.undo();
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            game.move(move);
            const evalScore = minimax(depth - 1, alpha, beta, true);
            game.undo();
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function pickAIMove() {
    const moves = game.moves();
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    // 中等难度：搜索深度2层，加一点随机性避免每次走法完全固定
    for (const move of moves) {
        game.move(move);
        const score = minimax(2, -Infinity, Infinity, false) + (Math.random() * 0.3);
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function restartGame() {
    game = new Chess();
    selectedSquare = null;
    legalTargets = [];
    document.getElementById('furidaComment').style.display = 'none';
    renderBoard();
    updateStatus();
}

document.addEventListener('DOMContentLoaded', () => {
    if (!checkAuth()) return;

    const voiceBtn = document.getElementById('voiceToggleBtn');
    if (voiceBtn) {
        voiceBtn.textContent = isVoiceEnabled() ? '🔊 语音已开启' : '🔇 语音已关闭';
    }

    renderBoard();
    updateStatus();
});
