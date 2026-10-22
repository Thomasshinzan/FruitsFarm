/**
 * スリーマッチ（一筆書き）パズルのシステムを管理する独立クラス
 */
class MatchPuzzle {
    constructor(containerEl, cols = 6, rows = 6, tileGenerator, onMatchCallback, onShuffleCallback) {
        this.containerEl = containerEl;
        this.cols = cols;
        this.rows = rows;
        this.tileGenerator = tileGenerator;
        this.onMatchCallback = onMatchCallback;
        this.onShuffleCallback = onShuffleCallback;

        this.board = [];
        this.isDragging = false;
        this.selectedPath = [];
        this.enabled = true;

        this._initEvents();
    }

    init() {
        this.shuffleBoard();
    }

    // 盤面を新しくランダムに生成・シャッフルする
    shuffleBoard() {
        this.board = [];
        for (let r = 0; r < this.rows; r++) {
            let row = [];
            for (let c = 0; c < this.cols; c++) {
                row.push(this.tileGenerator());
            }
            this.board.push(row);
        }
        this.selectedPath = [];
        this.enabled = true;
        this.render();
    }

    render() {
        this.containerEl.innerHTML = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tileDiv = document.createElement('div');
                tileDiv.className = 'tile';
                tileDiv.dataset.row = r;
                tileDiv.dataset.col = c;
                tileDiv.textContent = this.board[r][c] || '';

                if (this.selectedPath.some(p => p.r === r && p.c === c)) {
                    tileDiv.classList.add('selected');
                }

                this.containerEl.appendChild(tileDiv);
            }
        }
    }

    _initEvents() {
        this.containerEl.addEventListener('pointerdown', e => {
            if (!this.enabled) return;
            const tile = e.target.closest('.tile');
            if (!tile) return;
            this.isDragging = true;
            this.selectedPath = [{ r: parseInt(tile.dataset.row), c: parseInt(tile.dataset.col) }];
            this.render();
        });

        this.containerEl.addEventListener('pointermove', e => {
            if (!this.isDragging || !this.enabled) return;
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const tile = target ? target.closest('.tile') : null;
            if (!tile) return;

            const r = parseInt(tile.dataset.row);
            const c = parseInt(tile.dataset.col);
            const last = this.selectedPath[this.selectedPath.length - 1];

            if (last && (last.r !== r || last.c !== c)) {
                const isAdjacent = Math.abs(last.r - r) <= 1 && Math.abs(last.c - c) <= 1;
                const typeMatches = this.board[r][c] === this.board[this.selectedPath[0].r][this.selectedPath[0].c];
                
                const index = this.selectedPath.findIndex(p => p.r === r && p.c === c);
                if (index !== -1) {
                    this.selectedPath = this.selectedPath.slice(0, index + 1);
                    this.render();
                    return;
                }

                if (isAdjacent && typeMatches) {
                    this.selectedPath.push({ r, c });
                    this.render();
                }
            }
        });

        window.addEventListener('pointerup', () => {
            if (!this.isDragging || !this.enabled) return;
            this.isDragging = false;
            this._processTurn();
        });
    }

    _processTurn() {
        if (this.selectedPath.length >= 3) {
            const type = this.board[this.selectedPath[0].r][this.selectedPath[0].c];
            const count = this.selectedPath.length;
            
            if (this.onMatchCallback) {
                this.onMatchCallback(type, count);
            }

            this.selectedPath.forEach(p => {
                this.board[p.r][p.c] = null;
            });

            this.fallAndRefill();
        }
        this.selectedPath = [];
        this.render();
    }

    fallAndRefill() {
        for (let c = 0; c < this.cols; c++) {
            let emptyRow = this.rows - 1;
            for (let r = this.rows - 1; r >= 0; r--) {
                if (this.board[r][c] !== null) {
                    this.board[emptyRow][c] = this.board[r][c];
                    if (emptyRow !== r) this.board[r][c] = null;
                    emptyRow--;
                }
            }
            for (let r = emptyRow; r >= 0; r--) {
                this.board[r][c] = this.tileGenerator();
            }
        }
    }

    setDisabled(disabled) {
        this.enabled = !disabled;
        if (disabled) {
            this.selectedPath = [];
            this.render();
        }
    }
}
