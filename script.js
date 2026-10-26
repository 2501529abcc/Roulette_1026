(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('wheel');
  const ctx = canvas.getContext('2d');
  const button = $('spin');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let angle = 0, spinning = false, round = 0, history = [], balance = 2000, activeBet, chanceLost = false;
  const betTypes = [...document.querySelectorAll('input[name="bet-type"]')];
  const quickBets = [...document.querySelectorAll('[data-amount]')];
  const format = value => value.toLocaleString('ja-JP');
  const colors = { red:'#b94549', black:'#182721', green:'#287a58' };
  const colorNames = { red:'RED / レッド', black:'BLACK / ブラック', green:'GREEN / グリーン' };
  try {
    const stored = JSON.parse(localStorage.getItem('roulette-history') || '[]');
    if (Array.isArray(stored)) history = stored.filter(n => Roulette.numbers.includes(n)).slice(0,10);
  } catch { /* Storage is optional. */ }
  try {
    const stored = JSON.parse(localStorage.getItem('roulette-wallet-v2') || 'null');
    if (stored && Number.isSafeInteger(stored.balance) && stored.balance >= 0) {
      balance = stored.balance;
      chanceLost = stored.chanceLost === true;
    }
  } catch { /* Storage is optional. */ }
  function saveBalance() {
    try { localStorage.setItem('roulette-wallet-v2', JSON.stringify({balance, chanceLost})); } catch { /* Play without storage. */ }
  }
  function currentBet() {
    return {type:betTypes.find(input => input.checked)?.value, number:$('bet-number').value, amount:Number($('bet-amount').value)};
  }
  function betLabel(bet) {
    return bet.type === 'straight' ? `数字 ${bet.number}` : bet.type === 'red' ? '赤' : '黒';
  }
  function updateBet() {
    const bet=currentBet();
    $('loser-banner').hidden=spinning || balance!==0 || !chanceLost;
    $('last-chance').hidden=spinning || balance!==0 || chanceLost;
    $('chance-red').disabled=spinning || chanceLost || balance!==0;
    $('chance-black').disabled=spinning || chanceLost || balance!==0;
    $('balance').textContent=format(balance);
    $('bet-amount').max=String(balance);
    $('number-picker').hidden=bet.type !== 'straight';
    $('bet-controls').disabled=spinning || balance===0;
    $('reset').disabled=spinning;
    button.disabled=spinning || !Roulette.validBet(bet,balance);
    if(spinning) return;
    if(balance===0) {
      $('bet-preview').textContent=chanceLost?'ゲーム終了。「最初から」で再開できます。':'LAST CHANCE！上部で赤か黒を選ぶと、1,000コイン復活のチャンス。';
    } else if(!bet.type || (bet.type==='straight' && !bet.number)) {
      $('bet-preview').textContent=bet.type==='straight'?'賭ける数字を選んでください。':'赤・黒・数字1つから選んでください。';
    } else if(!Roulette.validBet(bet,balance)) {
      $('bet-preview').textContent='所持金以内の正の整数を入力してください。';
    } else {
      const multiplier=bet.type==='straight'?36:2;
      $('bet-preview').textContent=`${betLabel(bet)} に ${format(bet.amount)} → 的中時 ${format(bet.amount*multiplier)} コイン（元金込み）`;
    }
  }
  function saveHistory() {
    try { localStorage.setItem('roulette-history', JSON.stringify(history)); } catch { /* Play without storage. */ }
  }
  function renderHistory() {
    $('history').replaceChildren(...history.map((n, i) => {
      const li = document.createElement('li');
      li.textContent = n; li.className = Roulette.color(n);
      li.setAttribute('aria-label', `${i + 1}回前：${n}、${colorNames[Roulette.color(n)]}`);
      return li;
    }));
    $('empty-history').hidden = history.length > 0;
    $('clear').disabled = spinning || history.length === 0;
  }
  function draw(rotation) {
    const center = 500, step = Roulette.tau / 38;
    ctx.clearRect(0,0,1000,1000);
    const rim = ctx.createRadialGradient(350,260,40,500,500,493);
    rim.addColorStop(0,'#e5d3a5'); rim.addColorStop(.78,'#655339'); rim.addColorStop(.9,'#e0c58c'); rim.addColorStop(1,'#715d39');
    ctx.beginPath(); ctx.arc(center,center,490,0,Roulette.tau); ctx.fillStyle=rim; ctx.fill();
    ctx.beginPath(); ctx.arc(center,center,465,0,Roulette.tau); ctx.fillStyle='#152c25'; ctx.fill();
    ctx.save(); ctx.translate(center,center); ctx.rotate(rotation - Math.PI/2);
    Roulette.numbers.forEach((n,i) => {
      const start = i * step - step/2, end = start + step;
      ctx.beginPath(); ctx.arc(0,0,448,start,end); ctx.arc(0,0,333,end,start,true); ctx.closePath();
      ctx.fillStyle = colors[Roulette.color(n)]; ctx.fill();
      ctx.strokeStyle = '#d0bb8355'; ctx.lineWidth=2; ctx.stroke();
      ctx.save(); ctx.rotate(i*step); ctx.translate(411,0); ctx.rotate(Math.PI/2);
      ctx.font = 'bold 25px Georgia'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff5e4'; ctx.fillText(n,0,0); ctx.restore();
      ctx.beginPath(); ctx.arc(0,0,377,start,end); ctx.strokeStyle='#edda9f88'; ctx.lineWidth=2; ctx.stroke();
    });
    ctx.restore();
    const inside=ctx.createRadialGradient(430,380,30,500,500,330);
    inside.addColorStop(0,'#4d5e47'); inside.addColorStop(.68,'#2b4032'); inside.addColorStop(1,'#172d24');
    ctx.beginPath(); ctx.arc(center,center,330,0,Roulette.tau); ctx.fillStyle=inside; ctx.fill();
    [329,315,242,230,174].forEach((radius,i) => {ctx.beginPath();ctx.arc(center,center,radius,0,Roulette.tau);ctx.lineWidth=i===0?5:2;ctx.strokeStyle=i===0?'#bba272':'#c3ac6b44';ctx.stroke();});
    ctx.save(); ctx.translate(center,center); ctx.rotate(rotation);
    for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(175,0);ctx.lineTo(306,0);ctx.strokeStyle='#cfbc8633';ctx.lineWidth=2;ctx.stroke();}ctx.restore();
  }
  function finish(index, target) {
    angle=Roulette.normalize(target); draw(angle);
    $('ball-track').style.transform='rotate(0rad)';
    document.querySelector('.wheel-stage').classList.remove('spinning');
    const number=Roulette.numbers[index], color=Roulette.color(number);
    $('result-number').textContent=number;
    $('result-description').textContent=colorNames[color];
    $('result').dataset.color=color;
    $('result').classList.add('reveal');
    const returned=activeBet.chance ? (activeBet.type===color ? 1000 : 0) : Roulette.payout(activeBet,number);
    if(activeBet.chance && returned>0) chanceLost=false;
    balance+=returned; saveBalance();
    const net=returned-activeBet.amount;
    $('message').textContent=activeBet.chance
      ? (returned>0?'LAST CHANCE 成功！1,000コインで復活！':'LAST CHANCE 失敗。LOSER ― ゲーム終了。')
      : returned>0
      ? `的中！払戻し ${format(returned)} コイン（収支 +${format(net)}）`
      : `はずれ。${betLabel(activeBet)}：−${format(activeBet.amount)} コイン。${balance===0?'所持金が0になりました。':''}`;
    canvas.setAttribute('aria-label',`ルーレットの結果：${number}、${colorNames[color]}`);
    $('wheel-status').textContent='READY TO SPIN';
    $('spin-label').textContent='もう一度まわす';
    history.unshift(number); history=history.slice(0,10); saveHistory();
    spinning=false; renderHistory(); updateBet();
  }
  button.addEventListener('click', () => {
    if(spinning) return;
    const bet=currentBet();
    if(!Roulette.validBet(bet,balance)) { updateBet(); return; }
    let index;
    try { index=Roulette.randomIndex(); } catch { $('message').textContent='ブラウザを更新して、もう一度お試しください。'; return; }
    activeBet={...bet}; balance-=activeBet.amount; saveBalance();
    startSpin(index);
  });
  function startSpin(index) {
    spinning=true; updateBet(); $('clear').disabled=true;
    $('bet-preview').textContent=activeBet.chance ? `LAST CHANCE：${betLabel(activeBet)}で勝負！` : `${betLabel(activeBet)} に ${format(activeBet.amount)} コインをベット済み`;
    round++; $('round').textContent=`ROUND ${String(round).padStart(2,'0')}`;
    $('result').classList.remove('reveal'); $('result').dataset.color='idle';
    $('result-number').textContent='…'; $('result-description').textContent='SPINNING';
    $('message').textContent='白い玉の行方を見届けよう。';
    $('wheel-status').textContent='SPINNING'; $('spin-label').textContent='回転中…';
    document.querySelector('.wheel-stage').classList.add('spinning');
    const from=angle, target=Roulette.targetRotation(from,index), duration=reducedMotion.matches?350:6000;
    let started;
    function frame(now) {
      started ??= now;
      const progress=Math.min((now-started)/duration,1), eased=1-Math.pow(1-progress,4);
      const current=from+(target-from)*eased;
      draw(current);
      const ballAngle= -Roulette.tau*4*(1-Math.pow(1-progress,3));
      $('ball-track').style.transform=`rotate(${reducedMotion.matches?0:ballAngle}rad)`;
      if(progress<1) requestAnimationFrame(frame); else finish(index,target);
    }
    requestAnimationFrame(frame);
  }
  function playChance(type) {
    if(spinning || balance!==0 || chanceLost) return;
    let index;
    try {
      do { index=Roulette.randomIndex(); } while(Roulette.color(Roulette.numbers[index])==='green');
    } catch { $('message').textContent='ブラウザを更新して、もう一度お試しください。'; return; }
    chanceLost=true; saveBalance();
    activeBet={type,amount:0,chance:true};
    startSpin(index);
  }
  $('chance-red').addEventListener('click',()=>playChance('red'));
  $('chance-black').addEventListener('click',()=>playChance('black'));
  $('clear').addEventListener('click', () => { if(spinning) return; history=[]; saveHistory(); renderHistory(); });
  for(const number of ['0','00',...Array.from({length:36},(_,i)=>String(i+1))]) {
    const option=document.createElement('option'); option.value=number; option.textContent=number; $('bet-number').append(option);
  }
  betTypes.forEach(input=>input.addEventListener('change',updateBet));
  $('bet-number').addEventListener('change',updateBet);
  $('bet-amount').addEventListener('input',updateBet);
  quickBets.forEach(quick=>quick.addEventListener('click',()=>{
    if(spinning) return;
    const entered=Number($('bet-amount').value);
    const current=Number.isSafeInteger(entered) && entered>0 ? entered : 0;
    $('bet-amount').value=String(quick.dataset.amount==='all' ? balance : Math.min(current+Number(quick.dataset.amount),balance));
    updateBet();
  }));
  $('reset').addEventListener('click',()=>{
    if(spinning) return;
    balance=2000; round=0; history=[]; chanceLost=false; saveBalance(); saveHistory();
    betTypes.forEach(input=>{input.checked=false;});
    $('bet-number').value=''; $('bet-amount').value='0';
    $('round').textContent='ROUND 01'; $('result-number').textContent='?'; $('result-description').textContent='次は、どの数字？';
    $('result').dataset.color='idle'; $('message').textContent='2,000コインで新しいゲームを始めます。'; $('spin-label').textContent='スタート';
    renderHistory(); updateBet();
  });
  draw(angle); renderHistory(); updateBet();
})();
