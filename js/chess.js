// 国际象棋 - 完整规则引擎（王车易位、吃过路兵、升变选择、和棋细则），纯手写不依赖外部库/CDN

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

// ---------- 棋盘规则引擎 ----------

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

function initState() {
    return {
        board: initBoard(),
        turn: 'w',
        castling: { wK: true, wQ: true, bK: true, bQ: true },
        enPassant: null, // { r, c } 可被吃过路兵的目标格，或 null
        halfmoveClock: 0, // 距上次吃子/兵移动的半回合数，达到100（50回合）判和
        positionCounts: {} // 局面出现次数，用于三次重复判和
    };
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

function pseudoMovesForPiece(state, r, c) {
    const { board, castling, enPassant } = state;
    const piece = board[r][c];
    if (!piece) return [];
    const moves = [];
    const color = piece.color;
    const opp = color === 'w' ? 'b' : 'w';

    if (piece.type === 'p') {
        const dir = color === 'w' ? -1 : 1;
        const startRow = color === 'w' ? 6 : 1;
        const promoRow = color === 'w' ? 0 : 7;

        if (onBoard(r + dir, c) && !board[r + dir][c]) {
            moves.push({ fromR: r, fromC: c, toR: r + dir, toC: c, promotion: r + dir === promoRow, captured: false, piece: 'p' });
            if (r === startRow && !board[r + 2 * dir][c]) {
                moves.push({ fromR: r, fromC: c, toR: r + 2 * dir, toC: c, promotion: false, captured: false, piece: 'p', isDoubleStep: true });
            }
        }
        for (const dc of [-1, 1]) {
            const nr = r + dir, nc = c + dc;
            if (!onBoard(nr, nc)) continue;
            const target = board[nr][nc];
            if (target && target.color !== color) {
                moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, promotion: nr === promoRow, captured: true, piece: 'p' });
            } else if (!target && enPassant && enPassant.r === nr && enPassant.c === nc) {
                moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: true, piece: 'p', isEnPassant: true, capturedSquare: { r, c: nc } });
            }
        }
    } else if (piece.type === 'n') {
        for (const [dr, dc] of KNIGHT_OFFSETS) {
            const nr = r + dr, nc = c + dc;
            if (onBoard(nr, nc)) {
                const target = board[nr][nc];
                if (!target || target.color !== color) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: !!target, piece: 'n' });
                }
            }
        }
    } else if (piece.type === 'k') {
        for (const [dr, dc] of KING_OFFSETS) {
            const nr = r + dr, nc = c + dc;
            if (onBoard(nr, nc)) {
                const target = board[nr][nc];
                if (!target || target.color !== color) {
                    moves.push({ fromR: r, fromC: c, toR: nr, toC: nc, captured: !!target, piece: 'k' });
                }
            }
        }
        // 王车易位
        const homeRow = color === 'w' ? 7 : 0;
        const rights = color === 'w' ? { K: castling.wK, Q: castling.wQ } : { K: castling.bK, Q: castling.bQ };
        if (r === homeRow && c === 4 && !isSquareAttacked(board, homeRow, 4, opp)) {
            if (rights.K && !board[homeRow][5] && !board[homeRow][6] &&
                board[homeRow][7] && board[homeRow][7].type === 'r' && board[homeRow][7].color === color &&
                !isSquareAttacked(board, homeRow, 5, opp) && !isSquareAttacked(board, homeRow, 6, opp)) {
                moves.push({ fromR: homeRow, fromC: 4, toR: homeRow, toC: 6, piece: 'k', captured: false, isCastle: 'K' });
            }
            if (rights.Q && !board[homeRow][1] && !board[homeRow][2] && !board[homeRow][3] &&
                board[homeRow][0] && board[homeRow][0].type === 'r' && board[homeRow][0].color === color &&
                !isSquareAttacked(board, homeRow, 3, opp) && !isSquareAttacked(board, homeRow, 2, opp)) {
                moves.push({ fromR: homeRow, fromC: 4, toR: homeRow, toC: 2, piece: 'k', captured: false, isCastle: 'Q' });
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

function applyMoveToBoard(board, move, promoteTo) {
    const newBoard = cloneBoard(board);
    const piece = newBoard[move.fromR][move.fromC];

    if (move.isEnPassant) {
        newBoard[move.capturedSquare.r][move.capturedSquare.c] = null;
    }

    newBoard[move.toR][move.toC] = move.promotion ? { type: promoteTo || 'q', color: piece.color } : piece;
    newBoard[move.fromR][move.fromC] = null;

    if (move.isCastle === 'K') {
        const homeRow = move.fromR;
        newBoard[homeRow][5] = newBoard[homeRow][7];
        newBoard[homeRow][7] = null;
    } else if (move.isCastle === 'Q') {
        const homeRow = move.fromR;
        newBoard[homeRow][3] = newBoard[homeRow][0];
        newBoard[homeRow][0] = null;
    }

    return newBoard;
}

// 生成新的完整游戏状态（用于真正落子），会更新易位权、吃过路兵目标、半回合计数
function applyMove(state, move, promoteTo) {
    const newBoard = applyMoveToBoard(state.board, move, promoteTo);
    const color = state.board[move.fromR][move.fromC].color;

    const castling = { ...state.castling };
    if (move.piece === 'k') {
        if (color === 'w') { castling.wK = false; castling.wQ = false; }
        else { castling.bK = false; castling.bQ = false; }
    }
    if (move.fromR === 7 && move.fromC === 0) castling.wQ = false;
    if (move.fromR === 7 && move.fromC === 7) castling.wK = false;
    if (move.fromR === 0 && move.fromC === 0) castling.bQ = false;
    if (move.fromR === 0 && move.fromC === 7) castling.bK = false;
    // 车被吃掉也会取消对应易位权
    if (move.toR === 7 && move.toC === 0) castling.wQ = false;
    if (move.toR === 7 && move.toC === 7) castling.wK = false;
    if (move.toR === 0 && move.toC === 0) castling.bQ = false;
    if (move.toR === 0 && move.toC === 7) castling.bK = false;

    let enPassant = null;
    if (move.isDoubleStep) {
        const dir = color === 'w' ? -1 : 1;
        enPassant = { r: move.fromR + dir, c: move.fromC };
    }

    const halfmoveClock = (move.captured || move.piece === 'p') ? 0 : state.halfmoveClock + 1;

    const newState = {
        board: newBoard,
        turn: color === 'w' ? 'b' : 'w',
        castling,
        enPassant,
        halfmoveClock,
        positionCounts: state.positionCounts
    };
    return newState;
}

function generateLegalMoves(state, color) {
    const legal = [];
    const { board } = state;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.color === color) {
                for (const move of pseudoMovesForPiece(state, r, c)) {
                    const newBoard = applyMoveToBoard(board, move, 'q');
                    if (!isInCheck(newBoard, color)) legal.push(move);
                }
            }
        }
    }
    return legal;
}

function hasInsufficientMaterial(board) {
    const pieces = [];
    for (const row of board) {
        for (const cell of row) {
            if (cell && cell.type !== 'k') pieces.push(cell);
        }
    }
    if (pieces.length === 0) return true; // 只剩双王
    if (pieces.length === 1 && (pieces[0].type === 'n' || pieces[0].type === 'b')) return true; // 单马或单象
    return false;
}

const PIECE_NAMES = { p: '兵', n: '马', b: '象', r: '车', q: '后', k: '王' };

function describeMove(move, color) {
    const from = squareToAlgebraic(move.fromR, move.fromC);
    const to = squareToAlgebraic(move.toR, move.toC);
    const who = color === 'w' ? '玩家' : 'Furida';
    if (move.isCastle) {
        return `${who}${move.isCastle === 'K' ? '王翼' : '后翼'}易位`;
    }
    let desc = `${who}的${PIECE_NAMES[move.piece]}从${from}走到${to}`;
    if (move.isEnPassant) desc += '，吃过路兵';
    else if (move.captured) desc += '，吃掉了对方一个棋子';
    if (move.promotion) desc += '，兵升变';
    return desc;
}

// ---------- 游戏状态 ----------

let state = initState();
let selectedSquare = null;
let legalTargets = [];
let pendingPromotion = null; // 等待玩家选择升变棋子时暂存 {move}

const UNICODE_PIECES = {
    p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚',
    P: '♙', N: '♘', B: '♗', R: '♖', Q: '♕', K: '♔'
};

function renderBoard() {
    const boardEl = document.getElementById('chessBoard');
    boardEl.innerHTML = '';
    const { board } = state;

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
    if (state.turn !== 'w' || pendingPromotion) return;

    const sq = squareToAlgebraic(r, c);
    const targetMove = legalTargets.find(m => squareToAlgebraic(m.toR, m.toC) === sq);

    if (selectedSquare && targetMove) {
        selectedSquare = null;
        legalTargets = [];
        if (targetMove.promotion) {
            pendingPromotion = targetMove;
            renderBoard();
            showPromotionPicker();
        } else {
            makePlayerMove(targetMove, null);
            renderBoard();
        }
        return;
    }

    const piece = state.board[r][c];
    if (piece && piece.color === 'w') {
        selectedSquare = sq;
        const allLegal = generateLegalMoves(state, 'w');
        legalTargets = allLegal.filter(m => m.fromR === r && m.fromC === c);
    } else {
        selectedSquare = null;
        legalTargets = [];
    }
    renderBoard();
}

function showPromotionPicker() {
    const picker = document.getElementById('promotionPicker');
    if (picker) picker.style.display = 'flex';
}

function choosePromotion(pieceType) {
    const picker = document.getElementById('promotionPicker');
    if (picker) picker.style.display = 'none';
    if (pendingPromotion) {
        const move = pendingPromotion;
        pendingPromotion = null;
        makePlayerMove(move, pieceType);
        renderBoard();
    }
}

async function makePlayerMove(move, promoteTo) {
    state = applyMove(state, move, promoteTo || 'q');
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
            state = applyMove(state, aiMove, 'q');
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
    const nextColor = state.turn;
    const nextLegal = generateLegalMoves(state, nextColor);
    if (nextLegal.length === 0) {
        if (isInCheck(state.board, nextColor)) {
            return nextColor === 'w' ? 'Furida 将死了玩家，Furida 获胜！' : '玩家将死了Furida，玩家获胜！';
        }
        return '双方陷入逼和，战平';
    }
    if (state.halfmoveClock >= 100) return '50回合无吃子/无兵移动，判和';
    if (hasInsufficientMaterial(state.board)) return '双方子力不足以将死，判和';
    return null;
}

function updateStatus() {
    const statusEl = document.getElementById('chessStatus');
    const legal = generateLegalMoves(state, state.turn);
    if (legal.length === 0) {
        statusEl.textContent = isInCheck(state.board, state.turn) ? '游戏结束（将死）' : '游戏结束（逼和）';
    } else if (state.halfmoveClock >= 100 || hasInsufficientMaterial(state.board)) {
        statusEl.textContent = '游戏结束（和棋）';
    } else if (isInCheck(state.board, state.turn)) {
        statusEl.textContent = state.turn === 'w' ? '你被将军了！' : 'Furida 被将军了！';
    } else {
        statusEl.textContent = state.turn === 'w' ? '轮到你走了（执白）' : 'Furida 思考中...';
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

function minimax(s, color, depth, alpha, beta, maximizing) {
    const legal = generateLegalMoves(s, color);
    if (depth === 0 || legal.length === 0) {
        return evaluateBoard(s.board);
    }

    const nextColor = color === 'w' ? 'b' : 'w';
    if (maximizing) {
        let maxEval = -Infinity;
        for (const move of legal) {
            const newState = applyMove(s, move, 'q');
            const evalScore = minimax(newState, nextColor, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of legal) {
            const newState = applyMove(s, move, 'q');
            const evalScore = minimax(newState, nextColor, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function pickAIMove() {
    const moves = generateLegalMoves(state, 'b');
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestScore = -Infinity;

    for (const move of moves) {
        const newState = applyMove(state, move, 'q');
        const score = minimax(newState, 'w', 2, -Infinity, Infinity, false) + Math.random() * 0.3;
        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }
    return bestMove;
}

function restartGame() {
    state = initState();
    selectedSquare = null;
    legalTargets = [];
    pendingPromotion = null;
    const picker = document.getElementById('promotionPicker');
    if (picker) picker.style.display = 'none';
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
