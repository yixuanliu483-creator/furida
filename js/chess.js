// 国际象棋 - 规则引擎纯手写（不依赖任何外部库/CDN），Furida 的点评走后端 DeepSeek

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

// ---------- 语音相关 ----------

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
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

// ---------- 棋盘规则引擎（纯手写，无外部依赖）----------

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const SLIDE_DIRS = {
    b: [[-1, -1], [-1, 1], [1, -1], [1, 1]],
    r: [[-1, 0], [1, 0], [0, -1], [0, 1]],
    q: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]
};
const KNIGHT_OFFSETS = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
const KING_OFFSETS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

function initBoard() {
    const b = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRow = ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'];
    for (let c = 0; c < 8; c++) {
        b[0][c] = { type: backRow[c], color: 'b' };
        b[1][c] = { type: 'p', color: 'b' };
        b[6][c] = { type: 'p', color: 'w' };
        b[7][c] = { type: backRow[c], color: 'w' };
    }
    return b;
}

function cloneBoard(b) {
    return b.map(row => row.map(cell => cell ? { ...cell } : null));
}

function onBoard(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function squareToAlgebraic(r, c) {
    return FILES[c] + (8 - r);
}

function isSquareAttacked(board, r, c, byColor) {
    const pawnRow = byColor === 'w' ? r + 1 : r - 1;
    for (const dc of [-1, 1]) {
        if (onBoard(pawnRow, c + dc)) {
            const p = board[pawnRow][c + dc];
            if (p && p.color === byColor && p.type === 'p') return true;
        }
    }
    for (const [dr, dc] of KNIGHT_OFFSETS) {
        const nr = r + dr, nc = c + dc;
        if (onBoard(nr, nc)) {
            const p = board[nr][nc];
            if (p && p.color === byColor && p.type === 'n') return true;
        }
    }
    for (const [dr, dc] of KING_OFFSETS) {
        const nr = r + dr, nc = c + dc;
        if (onBoard(nr, nc)) {
            const p = board[nr][nc];
            if (p && p.color === byColor && p.type === 'k') return true;
        }
    }
    for (const [dr, dc] of SLIDE_DIRS.q) {
        let nr = r + dr, nc = c + dc;
        while (onBoard(nr, nc)) {
            const p = board[nr][nc];
            if (p) {
                if (p.color === byColor) {
                    const isDiag = dr !== 0 && dc !== 0;
                    if (p.type === 'q' || (isDiag && p.type === 'b') || (!isDiag && p.type === 'r')) return true;
                }
                break;
            }
            nr += dr; nc += dc;
        }
    }
    return false;
}

function findKing(board, color) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const p = board[r][c];
            if (p && p.color === color && p.type === 'k') return { r, c };
        }
    }
    return null;
}

function isInCheck(board, color) {
    const kp = findKing(board, color);
    if (!kp) return false;
    return isSquareAttacked(board, kp.r, kp.c, color === 'w' ? 'b' : 'w');
}

function pseudoMovesForPiece(board, r, c) {
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;

    if (piece.type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;

        if (onBoard(r + dir, c) && !board[r + dir][c]) {
            moves.push({ fromR: r, fromC: c, toR: r + dir, toC: c, promotion: r + dir === promoRow, captured: false, piece: 'p' });
            if (r === startRow && !board[r + 2 * dir][c]) {
                moves.push({ fromR: r, fromC: c, toR: r + 2 * dir, toC: c, promotion: false, captured: false, piece: 'p' });
            }
        }
        for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (onBoard(nr, nc)) {
                const target = board[nr][nc];
                if (target && target.color !== color) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, promotion: nr === promoRow, captured: true, piece: 'p' });
                }
            }
        }
    } else if (piece.type === 'n' || piece.type === 'k') {
        const offsets = piece.type === 'n' ? KNIGHT_OFFSETS : KING_OFFSETS;
        for (const [dr, dc] of offsets) {
            const nr = r + dr, nc = c + dc;
            if (onBoard(nr, nc)) {
                const target = board[nr][nc];
                if (!target || target.color !== color) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: !!target, piece: piece.type });
                }
            }
        }
    } else {
        for (const [dr, dc] of SLIDE_DIRS[piece.type]) {
            let nr = r + dr, nc = c + dc;
            while (onBoard(nr, nc)) {
                const target = board[nr][nc];
                if (!target) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: false, piece: piece.type });
                } else {
                    if (target.color !== color) {
                        moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: true, piece: piece.type });
                    }
                    break;
                }
                nr += dr; nc += dc;
            }
        }
    }
    return moves;
}

function applyMove(board, move) {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.fromR][move.fromC];
    newBoard[move.toR][move.toC] = move.promotion ? { type: 'q', color: piece.color } : piece;
    newBoard[move.fromR][move.fromC] = null;
    return newBoard;
}

function generateLegalMoves(board, color) {
    const legal = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                for (const move of pseudoMovesForPiece(board, r, c)) {
                    const newBoard = applyMove(board, move);
                    if (!isInCheck(newBoard, color)) legal.push(move);
                }
            }
        }
    }
    return legal;
}

const PIECE_NAMES = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };

function describeMove(move, color) {
    const from = squareToAlgebraic(move.fromR, move.fromC);
    const to = squareToAlgebraic(move.toR, move.toC);
    const who = color === 'w' ? '玩家' : 'Furida';
    let desc = `${who}的${PIECE_NAMES[move.piece]}从${from}走到${to}`;
    if (move.captured) desc += '，吃掉了对方一个棋子';
    if (move.promotion) desc += '，兵升变成后';
    return desc;
}

// ---------- 游戏状态 ----------

let board = initBoard();
let turn = 'w'; // 玩家执白先走
let selectedSquare = null;
let legalTargets = [];

const UNICODE_PIECES = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
};

function renderBoard() {
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = squareToAlgebraic(r, c);
            const piece = board[r][c];
            const div = document.createElement('div');
            div.className = 'chess-square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');

            if (piece) {
                const symbol = piece.color === 'w' ? UNICODE_PIECES[piece.type.toUpperCase()] : UNICODE_PIECES[piece.type];
                div.textContent = symbol;
            }

            if (sq === selectedSquare) div.classList.add('selected');
            if (legalTargets.some(m => squareToAlgebraic(m.toR, m.toC) === sq)) {
                div.classList.add(piece ? 'legal-capture' : 'legal-move');
            }

            div.addEventListener('click', () => onSquareClick(r, c));
            boardEl.appendChild(div);
        }
    }
}

function onSquareClick(r, c) {
    if (turn !== 'w') return;

    const sq = squareToAlgebraic(r, c);
    const targetMove = legalTargets.find(m => squareToAlgebraic(m.toR, m.toC) === sq);

    if (selectedSquare && targetMove) {
        makePlayerMove(targetMove);
        selectedSquare = null;
        legalTargets = [];
        renderBoard();
        return;
    }

    const piece = board[r][c];
    if (piece && piece.color === 'w') {
        selectedSquare = sq;
        const allLegal = generateLegalMoves(board, 'w');
        legalTargets = allLegal.filter(m => m.fromR === r && m.fromC === c);
    } else {
        selectedSquare = null;
        legalTargets = [];
    }
    renderBoard();
}

async function makePlayerMove(move) {
    board = applyMove(board, move);
    turn = 'b';
    renderBoard();
    updateStatus();

    let context = describeMove(move, 'w');

    const overResult = checkGameOver();
    if (overResult) {
        context += '，' + overResult;
        await commentOn(context);
        return;
    }

    document.getElementById('chessStatus').textContent = 'Furida 思考中...';
    setTimeout(async () => {
        const aiMove = pickAIMove();
        if (aiMove) {
            board = applyMove(board, aiMove);
            turn = 'w';
            renderBoard();

            let aiContext = describeMove(aiMove, 'b');
            const aiOver = checkGameOver();
            if (aiOver) aiContext += '，' + aiOver;

            updateStatus();
            await commentOn(aiContext);
        }
    }, 400);
}

function checkGameOver() {
    // turn 已经切换到“即将走棋的一方”，检查这一方是否还有合法棋步
    const nextColor = turn;
    const nextLegal = generateLegalMoves(board, nextColor);
    if (nextLegal.length === 0) {
        if (isInCheck(board, nextColor)) {
            return nextColor === 'w' ? 'Furida 将死了玩家，Furida 获胜！' : '玩家将死了Furida，玩家获胜！';
        }
        return '双方陷入逼和，战平';
    }
    return null;
}

function updateStatus() {
    const statusEl = document.getElementById('chessStatus');
    const legal = generateLegalMoves(board, turn);
    if (legal.length === 0) {
        statusEl.textContent = isInCheck(board, turn) ? '游戏结束（将死）' : '游戏结束（逼和）';
    } else if (isInCheck(board, turn)) {
        statusEl.textContent = turn === 'w' ? '你被将军了！' : 'Furida 被将军了！';
    } else {
        statusEl.textContent = turn === 'w' ? '轮到你走了（执白）' : 'Furida 思考中...';
    }
}

async function commentOn(context) {
    try {
        const token = localStorage.getItem('token');
        const response = await apiFetch('/chess-comment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

// ---------- 中等难度 AI：Minimax + 简单材质评估 ----------

const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function evaluateBoard(b) {
    let score = 0;
    for (const row of b) {
        for (const cell of row) {
            if (!cell) continue;
            const val = PIECE_VALUES[cell.type];
            score += cell.color === 'b' ? val : -val;
        }
    }
    return score;
}

function minimax(b, color, depth, alpha, beta, maximizing) {
    const legal = generateLegalMoves(b, color);
    if (depth === 0 || legal.length === 0) {
        return evaluateBoard(b);
    }

    const nextColor = color === 'w' ? 'b' : 'w';
    if (maximizing) {
        let maxEval = -Infinity;
        for (const move of legal) {
            const newBoard = applyMove(b, move);
            const evalScore = minimax(newBoard, nextColor, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of legal) {
            const newBoard = applyMove(b, move);
            const evalScore = minimax(newBoard, nextColor, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function pickAIMove() {
    const moves = generateLegalMoves(board, 'b');
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
        const newBoard = applyMove(board, move);
        const score = minimax(newBoard, 'w', 2, -Infinity, Infinity, false) + Math.random() * 0.3;
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

function restartGame() {
    board = initBoard();
    turn = 'w';
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
