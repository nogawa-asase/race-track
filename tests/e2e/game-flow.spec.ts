import { expect, test, type Page } from '@playwright/test';

/**
 * 設定画面から、指定した対戦相手でスタートする(コース・強さ等は既定値のまま)
 */
async function startGame(page: Page, opponent: 'cpu' | 'human'): Promise<void> {
  await page.goto('./');
  await page.waitForSelector('.settings-screen');
  if (opponent === 'human') {
    await page.selectOption('select[name="opponent"]', 'human');
  }
  await page.click('.settings-screen button:has-text("スタート")');
}

/**
 * くじなど、一度きりのメッセージダイアログが出ていれば閉じる。
 * `startGame` 直後は、`loadTable`(実際の fetch)の完了を待つ必要があり
 * 開くまでに時間差があるため、一度だけ確認するのではなく少し待つ
 */
async function dismissMessageIfAny(
  page: Page,
  timeout = 3000
): Promise<boolean> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const dismissed = await page.evaluate(() => {
      const dialog = document.querySelector(
        '.message-dialog[open]'
      ) as HTMLDialogElement | null;
      if (!dialog) return false;
      const ok = Array.from(dialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'OK'
      );
      ok?.click();
      return true;
    });
    if (dismissed) return true;
    if (Date.now() > deadline) return false;
    await page.waitForTimeout(30);
  }
}

/**
 * 今の画面の状態を1回のブラウザ往復で読み取り、可能なら1つ操作(クリック)も
 * 行う。並列実行時のオーバーヘッドを抑えるため、判断とクリックをまとめて
 * 1回の `page.evaluate` で行う(Playwrightの個々のlocator呼び出しを積み重ねると、
 * 4ワーカー同時実行時に往復のレイテンシが積み上がりタイムアウトの原因になる)。
 *
 * スタート位置選びは常に中央(決定ボタンの既定のプレビュー)を選び、レース中は
 * 一番加速する候補を選ぶ(design.mdの方針どおり、行き止まりに素早く到達させて
 * 決着を早める)
 */
async function step(page: Page): Promise<{
  action: 'dialog' | 'start' | 'move' | 'cpu' | 'result' | 'none';
  signature: string;
}> {
  return page.evaluate(() => {
    const isVisible = (el: HTMLElement) => el.offsetParent !== null;
    const turnText =
      document.querySelector('.turn-indicator')?.textContent ?? '';
    const roundText =
      document.querySelector('.round-indicator')?.textContent ?? '';
    const signature = `${turnText}/${roundText}`;

    const resultScreen = document.querySelector(
      '.result-screen'
    ) as HTMLElement | null;
    if (resultScreen && !resultScreen.hidden) {
      return { action: 'result' as const, signature };
    }

    const dialog = document.querySelector(
      '.message-dialog[open]'
    ) as HTMLDialogElement | null;
    if (dialog) {
      const ok = Array.from(dialog.querySelectorAll('button')).find(
        (b) => b.textContent === 'OK'
      );
      ok?.click();
      return { action: 'dialog' as const, signature };
    }

    if (turnText.includes('CPU')) {
      // ControlPanel は、候補・スタート地点のボタンをUI上「選べる」状態で
      // 描画するかどうかを手番の持ち主(人かCPUか)では区別しない(CPUの手番でも
      // ボタン自体は有効に見える)。実際にクリックしてもGameController側で
      // 無視されるだけだが、クリックの最中にCPUの本当の手が適用されて
      // 再描画されるとボタンの位置がずれる恐れがあるため、手番表示の文言
      // (「CPU(色)が考え中…」)でCPUの手番と判定し、先に弾いておく
      return { action: 'cpu' as const, signature };
    }

    const startButton = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.start-position-pad button')
    ).find((b) => b.textContent === '決定' && !b.disabled && isVisible(b));
    if (startButton) {
      startButton.click();
      return { action: 'start' as const, signature };
    }

    // レース中の候補パッドは廃止(盤がズームされ直接タップできるため)。
    // 選べる候補の当たり判定(.board-candidate-hit)は isSelectable のもの
    // にしか描かれないので、これがあれば即座にタップできる。「一番
    // 加速する」候補を選ぶ方針は、行き先の座標(x+y)が一番大きいものを
    // 選ぶことで代用する(velocityを問わず、常に同じ向きに偏らせられる)
    const boardCandidates = Array.from(
      document.querySelectorAll<SVGCircleElement>('.board .board-candidate-hit')
    );
    if (boardCandidates.length > 0) {
      let best = boardCandidates[0];
      let bestScore = -Infinity;
      for (const el of boardCandidates) {
        const score = Number(el.dataset.pointX) + Number(el.dataset.pointY);
        if (score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
      best.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
        })
      );
      return { action: 'move' as const, signature };
    }

    return { action: 'none' as const, signature };
  });
}

/**
 * 手を確定する操作(スタート位置の決定・方向パッドの2回目のクリック)の後、
 * 画面が実際に更新される(手番・周回の表示が変わる、メッセージ・結果画面が
 * 出る)まで待つ。1手の適用後、次の描画までに移動アニメーション(260ms)を
 * 挟むため、これを待たずに次の操作を判断すると、まだ更新されていない
 * (直前の手番のままの)候補を読んで、同じ手をもう一度確定させてしまう
 */
async function waitForStateChange(
  page: Page,
  before: string,
  timeout = 5000
): Promise<void> {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const changed = await page.evaluate((prevSignature) => {
      const resultScreen = document.querySelector(
        '.result-screen'
      ) as HTMLElement | null;
      if (resultScreen && !resultScreen.hidden) return true;
      if (document.querySelector('.message-dialog[open]')) return true;
      const turnText =
        document.querySelector('.turn-indicator')?.textContent ?? '';
      const roundText =
        document.querySelector('.round-indicator')?.textContent ?? '';
      return `${turnText}/${roundText}` !== prevSignature;
    }, before);
    if (changed) return;
    await page.waitForTimeout(30);
  }
}

/** 決着(結果画面)がつくまで、人の手番が来るたびに操作し続ける */
async function playUntilFinished(page: Page, maxSteps = 300): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const { action, signature } = await step(page);
    if (action === 'result') return;
    if (action === 'start' || action === 'move') {
      await waitForStateChange(page, signature);
    } else if (action === 'cpu' || action === 'none') {
      await page.waitForTimeout(100);
    }
  }
  throw new Error('決着がつかないまま、ステップ上限に達しました');
}

/** CPUが「考え中」になるまで、人の手番があれば操作しながら待つ */
async function waitForCpuThinking(page: Page, maxSteps = 60): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    const visible = await page.locator('.thinking-indicator').isVisible();
    if (visible) return;
    const { action, signature } = await step(page);
    if (action === 'start' || action === 'move') {
      await waitForStateChange(page, signature);
    } else if (action === 'cpu' || action === 'none') {
      await page.waitForTimeout(100);
    }
  }
  throw new Error('CPUの「考え中」が始まらないまま、ステップ上限に達しました');
}

test.describe('ゲームの流れ(機能設計書「画面遷移」)', () => {
  test.setTimeout(90_000);

  test('CPU戦: 設定からスタート位置選び・レースを経て決着まで進められる', async ({
    page,
  }) => {
    // Given
    await startGame(page, 'cpu');
    await dismissMessageIfAny(page); // くじの結果

    // Then: レース画面(スタート位置選び)に進む
    await expect(page.locator('.race-screen')).toBeVisible();
    // 盤に START・GOAL の文字が表示されている
    await expect(page.locator('.board-line-label')).toHaveText([
      'START',
      'GOAL',
    ]);

    // When: 決着まで進める
    await playUntilFinished(page);

    // Then
    await expect(page.locator('.result-screen')).toBeVisible();
    await expect(page.locator('.result-screen .winner')).toContainText(
      'の勝ち'
    );
  });

  test('人同士: 設定で「人」を選び、両者分のスタート位置と手を指して決着まで進められる', async ({
    page,
  }) => {
    // Given: 人同士は、くじではなく赤鉛筆が先攻(メッセージが一度出る)
    await startGame(page, 'human');
    await dismissMessageIfAny(page);
    await expect(page.locator('.race-screen')).toBeVisible();

    // When: 両者の手を(このヘルパーは手番の持ち主を区別せず)指し続ける
    await playUntilFinished(page);

    // Then
    await expect(page.locator('.result-screen')).toBeVisible();
  });
});

test.describe('盤のカメラ(オートズーム)', () => {
  function boardCameraScale(page: Page): Promise<number | null> {
    return page.evaluate(() => {
      const g = document.querySelector('.board-camera');
      if (!g) return null;
      const transform = getComputedStyle(g).transform;
      const m = transform.match(/matrix\(([^)]+)\)/);
      return m ? Number(m[1].split(',')[0]) : null;
    });
  }

  test('PC(横並びレイアウト)では、レースが始まっても自動ではズームしない', async ({
    page,
  }) => {
    await startGame(page, 'cpu');
    await dismissMessageIfAny(page);
    await expect(page.locator('.race-screen')).toBeVisible();

    // Given: スタート位置選び中は全体表示(scale=1)のまま
    expect(await boardCameraScale(page)).toBe(1);

    // When: 両者がスタート位置を決め、レースが始まる
    await page.locator('.start-position-pad button:has-text("決定")').click();

    // Then: PC(このテストはDesktopの幅)では、オートズームの既定はオフ
    // なので、しばらく待っても全体表示のまま
    await page.waitForTimeout(2000);
    expect(await boardCameraScale(page)).toBe(1);

    // When: 「オートズーム」ボタンを押すと、手番の車に寄る
    await page.click('.panel-buttons button:has-text("オートズーム")');
    await expect
      .poll(() => boardCameraScale(page), { timeout: 2000 })
      .toBeGreaterThan(1);
  });
});

test.describe('ルール説明(PRD「6-2. ルール説明」)', () => {
  test.setTimeout(90_000);

  test('設定画面から開いて、内容を確認して閉じられる', async ({ page }) => {
    // Given
    await page.goto('./');
    await page.waitForSelector('.settings-screen');

    // When
    await page.click('.settings-screen button:has-text("ルール説明")');

    // Then
    await expect(page.locator('.rules-dialog[open]')).toBeVisible();
    await expect(page.locator('.rules-dialog')).toContainText('ゲームのルール');
    await expect(page.locator('.rules-dialog')).toContainText('行き止まり');

    // When: 閉じる
    await page.click('.rules-dialog button:has-text("閉じる")');

    // Then
    await expect(page.locator('.rules-dialog[open]')).toHaveCount(0);
  });

  test('レース画面から開けて、開いている間はCPUの手番が進まず、閉じると再開する', async ({
    page,
  }) => {
    // Given: CPUが「考え中」になるまで進める(先攻後攻はくじで決まるため、
    // 人の手番が先に来ることもある)
    await startGame(page, 'cpu');
    await dismissMessageIfAny(page);
    await waitForCpuThinking(page);

    // When: ルール説明を開く
    // (`pauseForRules` は、CPUの手番の「考え中」の待ちの前後2箇所でしか
    // 手番の進行を止められない実装のため、開いた時点ですでに「考え中」の
    // 待ちを終えかけている1手だけは、開いた直後に適用されることがある。
    // そのため「開いた瞬間から一切進まない」ではなく「それ以降は進まなくなる」
    // ことを確かめる)
    await page.click('.panel-buttons button:has-text("ルール説明")');
    await expect(page.locator('.rules-dialog[open]')).toBeVisible();

    // Then: 開いている間に起こりうる、たかだか1手ぶんの進行が収まるまで待つ
    await page.waitForTimeout(1200);
    const stateAfterFirstWait = `${await page.locator('.turn-indicator').textContent()}/${await page.locator('.round-indicator').textContent()}`;

    // さらに待っても、それ以上は進まない(CPUの手番が止まったまま)ことを確かめる
    await page.waitForTimeout(1200);
    const stateAfterSecondWait = `${await page.locator('.turn-indicator').textContent()}/${await page.locator('.round-indicator').textContent()}`;
    expect(stateAfterSecondWait).toBe(stateAfterFirstWait);

    // When: 閉じる
    await page.click('.rules-dialog button:has-text("閉じる")');

    // Then: 再開し、決着まで進められる
    await expect(page.locator('.rules-dialog[open]')).toHaveCount(0);
    await playUntilFinished(page);
    await expect(page.locator('.result-screen')).toBeVisible();
  });
});

test.describe('「設定に戻る」(機能設計書の状態遷移図)', () => {
  test('確認が出て、「いいえ」なら続行、「はい」なら設定画面に戻る', async ({
    page,
  }) => {
    // Given
    await startGame(page, 'cpu');
    await dismissMessageIfAny(page);
    await expect(page.locator('.race-screen')).toBeVisible();

    // When: 「設定に戻る」→「いいえ」
    await page.click('.panel-buttons button:has-text("設定に戻る")');
    await expect(page.locator('.confirm-dialog[open]')).toBeVisible();
    await page.click('.confirm-dialog button:has-text("いいえ")');

    // Then: レースを続けられる
    await expect(page.locator('.confirm-dialog[open]')).toHaveCount(0);
    await expect(page.locator('.race-screen')).toBeVisible();

    // When: 「設定に戻る」→「はい」
    await page.click('.panel-buttons button:has-text("設定に戻る")');
    await page.click('.confirm-dialog button:has-text("はい")');

    // Then: 設定画面に戻る(レース画面は隠れている)
    await expect(page.locator('.settings-screen')).toBeVisible();
    await expect(page.locator('.race-screen')).toBeHidden();
  });
});

test.describe('結果画面(機能設計書「結果画面」)', () => {
  test.setTimeout(90_000);

  test('「同じ設定でもう一度」で、確認なしにスタート位置選びに戻る', async ({
    page,
  }) => {
    // Given: 決着までプレイする
    await startGame(page, 'cpu');
    await dismissMessageIfAny(page);
    await playUntilFinished(page);
    await expect(page.locator('.result-screen')).toBeVisible();

    // When: 「同じ設定でもう一度」(結果画面からの「設定に戻る」と違い、確認は出ない)
    await page
      .locator('.result-screen button:has-text("同じ設定でもう一度")')
      .click();

    // Then: 確認は出ない。既定は「くじ」のため、新しいくじのメッセージが
    // 出たら閉じて、スタート位置選びに戻ることを確かめる
    await expect(page.locator('.confirm-dialog[open]')).toHaveCount(0);
    await expect
      .poll(async () => {
        await dismissMessageIfAny(page);
        return page.locator('.result-screen').isHidden();
      })
      .toBe(true);
    await expect(page.locator('.race-screen')).toBeVisible();
  });
});

test.describe('スタート位置選び(機能設計書「入力の操作」の盤への直接クリック・タップ)', () => {
  test('盤に置ける点が表示され、マウスのクリックで確定できる', async ({
    page,
  }) => {
    // Given
    await startGame(page, 'human');
    await dismissMessageIfAny(page);
    await expect(page.locator('.race-screen')).toBeVisible();

    // Then: 置ける点が、選べる候補と同じ見た目(●)で盤に表示される
    const points = page.locator('.board [data-point-x]');
    await expect(points.first()).toBeVisible();
    expect(await points.count()).toBeGreaterThan(0);

    // When: マウスで1回クリック
    const before = await page.locator('.turn-indicator').textContent();
    await points.first().click();

    // Then: プレビューを介さず、即座に確定して手番が変わる
    await expect(page.locator('.turn-indicator')).not.toHaveText(before ?? '');
  });

  test('タッチも1回のタップで確定する', async ({ page }) => {
    // Given: タッチの2段階確定は、同じ点への素早い2回タップがブラウザの
    // ダブルタップズームと衝突するため廃止し、マウスと同じ1回確定にした
    await startGame(page, 'human');
    await dismissMessageIfAny(page);
    await expect(page.locator('.race-screen')).toBeVisible();
    const point = page.locator('.board [data-point-x]').first();
    const before = await page.locator('.turn-indicator').textContent();

    // When: 1回のタップ(touch)
    await point.dispatchEvent('pointerup', { pointerType: 'touch' });

    // Then: プレビューを介さず、即座に確定して手番が変わる
    await expect(page.locator('.turn-indicator')).not.toHaveText(before ?? '');
  });
});
