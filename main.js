document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('puzzle-container');
    const orderListEl = document.getElementById('order-list');
    const stageEl = document.getElementById('stage');
    const movesEl = document.getElementById('moves');
    const scoreEl = document.getElementById('score');
    const highScoreEl = document.getElementById('high-score');
    
    const dialogOverlay = document.getElementById('dialog-overlay');
    const dialogTitle = document.getElementById('dialog-title');
    const dialogMessage = document.getElementById('dialog-message');
    const dialogButtons = document.getElementById('dialog-buttons');

    // ★ シャッフル用の要素を取得
    const shuffleBtn = document.getElementById('shuffle-btn');
    const shufflePointsEl = document.getElementById('shuffle-points');

    const baseMoves = 20;
    let remainingMoves = baseMoves;
    let isGameOver = false;

    let currentStage = 1;
    let currentScore = 0;
    let highScore = parseInt(localStorage.getItem('fruitsFarmHighScore')) || 0;

    let targetOrders = {};
    let harvested = {};
    
    let stageClearedTiles = 0;
    
    // ★ シャッフル管理用の変数
    let shufflePoints = 0;
    let tilesToNextShuffle = 0; // 次のシャッフルポイント獲得までのカウント（累計）

    const tileTypes = ['🍎', '🍇', '🍊', '🍓', '🍑'];
    const tileGenerator = () => {
        return tileTypes[Math.floor(Math.random() * tileTypes.length)];
    };

    const fruitColors = {
        '🍎': '#ffcdd2',
        '🍇': '#e1bee7',
        '🍊': '#ffe0b2',
        '🍓': '#ff8a80',
        '🍑': '#f8bbd0'
    };

    function applyTileColors() {
        const tiles = container.querySelectorAll('.tile');
        tiles.forEach(tile => {
            const fruit = tile.textContent;
            if (fruitColors[fruit]) {
                tile.style.backgroundColor = fruitColors[fruit];
            }
        });
    }

    function generateRandomOrders(stage) {
        const orderKindsCount = 3;
        const shuffledTypes = [...tileTypes].sort(() => 0.5 - Math.random());
        const selectedTypes = shuffledTypes.slice(0, orderKindsCount);

        const total = 45 + (stage - 1) * 3;
        const R = total - 30;

        let p1 = Math.floor(Math.random() * (R + 1));
        let p2 = Math.floor(Math.random() * (R + 1));
        if (p1 > p2) {
            const temp = p1; p1 = p2; p2 = temp;
        }

        const amount1 = 10 + p1;
        const amount2 = 10 + (p2 - p1);
        const amount3 = 10 + (R - p2);

        const amounts = [amount1, amount2, amount3];
        const newOrders = {};
        
        selectedTypes.forEach((fruit, index) => {
            newOrders[fruit] = amounts[index];
        });

        return newOrders;
    }

    function updateHighScore() {
        if (currentScore > highScore) {
            highScore = currentScore;
            localStorage.setItem('fruitsFarmHighScore', highScore);
        }
    }

    function updateUI() {
        stageEl.textContent = currentStage;
        movesEl.textContent = remainingMoves;
        scoreEl.textContent = currentScore;
        highScoreEl.textContent = highScore;
        
        // ★ シャッフルポイントとボタンの活性/非活性を更新
        shufflePointsEl.textContent = shufflePoints;
        shuffleBtn.disabled = (shufflePoints <= 0 || isGameOver);
        
        orderListEl.innerHTML = '';
        for (const [fruit, target] of Object.entries(targetOrders)) {
            const current = harvested[fruit] || 0;
            const li = document.createElement('li');
            const isCompleted = current >= target;
            li.style.color = isCompleted ? 'green' : '#333';
            li.textContent = `${fruit} ${current} / ${target} ${isCompleted ? ' ✔️' : ''}`;
            orderListEl.appendChild(li);
        }
    }

    function showDialog(title, message, titleColor, buttons) {
        dialogTitle.textContent = title;
        dialogTitle.style.color = titleColor;
        dialogMessage.textContent = message;
        dialogButtons.innerHTML = '';
        
        buttons.forEach(btnInfo => {
            const btn = document.createElement('button');
            btn.className = 'dialog-btn' + (btnInfo.secondary ? ' secondary' : '');
            btn.textContent = btnInfo.text;
            
            btn.addEventListener('click', () => {
                dialogOverlay.classList.remove('active');
                if (btnInfo.onClick) btnInfo.onClick();
            });
            dialogButtons.appendChild(btn);
        });
        
        dialogOverlay.classList.add('active');
    }

    function checkGameStatus() {
        const allCompleted = Object.keys(targetOrders).every(fruit => {
            return (harvested[fruit] || 0) >= targetOrders[fruit];
        });

        if (allCompleted) {
            const clearBonus = Math.floor((stageClearedTiles * 10) * (1 + remainingMoves / 10));
            currentScore += clearBonus;
            
            updateHighScore();
            updateUI();
            puzzle.setDisabled(true);
            
            showDialog(
                `ステージ${currentStage} クリア！`,
                `クリアボーナス +${clearBonus}pt`,
                '#2e7d32',
                [
                    {
                        text: `ステージ${currentStage + 1}へ`,
                        onClick: () => {
                            currentStage++;
                            startStage();
                        }
                    }
                ]
            );
            return true;
        }

        if (remainingMoves <= 0) {
            isGameOver = true;
            updateHighScore();
            updateUI();
            puzzle.setDisabled(true);
            
            showDialog(
                'ゲームオーバー',
                `最終スコア: ${currentScore} (到達: ステージ${currentStage})`,
                '#d32f2f',
                [
                    {
                        text: 'はじめからやり直す',
                        onClick: () => {
                            currentStage = 1;
                            currentScore = 0;
                            
                            // ★ ゲームオーバー時にシャッフル関連のカウントもリセットする
                            shufflePoints = 0;
                            tilesToNextShuffle = 0;
                            
                            startStage();
                        }
                    },
                    {
                        text: '終了',
                        secondary: true,
                        onClick: () => {}
                    }
                ]
            );
            return true;
        }

        return false;
    }

    const onMatchCallback = (type, count) => {
        if (isGameOver) return;

        if (targetOrders[type] !== undefined) {
            harvested[type] = (harvested[type] || 0) + count;
        }
        
        stageClearedTiles += count;

        // ★ シャッフルポイントの計算（累計50個ごとに1ポイント獲得）
        tilesToNextShuffle += count;
        if (tilesToNextShuffle >= 50) {
            const earnedPoints = Math.floor(tilesToNextShuffle / 50);
            shufflePoints += earnedPoints;
            tilesToNextShuffle %= 50; // 50で割った余りを次のカウントに持ち越す
        }

        const basePoint = count * 10;
        const comboBonus = count > 3 ? (count - 3) * 20 : 0; 
        currentScore += (basePoint + comboBonus);

        remainingMoves--;

        updateHighScore();
        updateUI();
        checkGameStatus();
    };

    const puzzle = new MatchPuzzle(
        container,
        6,
        6,
        tileGenerator,
        onMatchCallback
    );

    // ★ シャッフルボタンを押した時の処理
    shuffleBtn.addEventListener('click', () => {
        if (shufflePoints > 0 && !isGameOver) {
            shufflePoints--;       // ポイントを1消費
            updateUI();            // 画面の数字を更新
            puzzle.shuffleBoard(); // パズルクラスのシャッフルメソッドを実行
        }
    });

    const observer = new MutationObserver(() => {
        applyTileColors();
    });
    observer.observe(container, { childList: true, subtree: true });

    function startStage() {
        const currentStageMaxMoves = baseMoves + (currentStage - 1);
        remainingMoves = currentStageMaxMoves;
        stageClearedTiles = 0;
        isGameOver = false;
        
        targetOrders = generateRandomOrders(currentStage);
        harvested = {};
        for (const fruit of Object.keys(targetOrders)) {
            harvested[fruit] = 0;
        }

        puzzle.setDisabled(false);
        puzzle.init();
        updateUI();
    }

    startStage();
});
