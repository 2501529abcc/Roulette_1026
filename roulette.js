/* American double-zero wheel, clockwise. */
const Roulette = (() => {
  const numbers = ['0','28','9','26','30','11','7','20','32','17','5','22','34','15','3','24','36','13','1','00','27','10','25','29','12','8','19','31','18','6','21','33','16','4','23','35','14','2'];
  const reds = new Set(['1','3','5','7','9','12','14','16','18','19','21','23','25','27','30','32','34','36']);
  const color = number => number === '0' || number === '00' ? 'green' : reds.has(number) ? 'red' : 'black';
  const tau = Math.PI * 2;
  const normalize = angle => ((angle % tau) + tau) % tau;
  function randomIndex() {
    const value = new Uint32Array(1);
    const limit = Math.floor(4294967296 / numbers.length) * numbers.length;
    do { crypto.getRandomValues(value); } while (value[0] >= limit);
    return value[0] % numbers.length;
  }
  function targetRotation(current, index) {
    const target = normalize(-index * tau / numbers.length);
    return current + 6 * tau + normalize(target - normalize(current));
  }
  function validBet(bet, balance) {
    return Number.isSafeInteger(bet.amount) && bet.amount > 0 && bet.amount <= balance
      && bet.amount <= Math.floor(Number.MAX_SAFE_INTEGER / 36)
      && (bet.type === 'red' || bet.type === 'black' || (bet.type === 'straight' && numbers.includes(bet.number)));
  }
  function payout(bet, number) {
    const won = bet.type === 'straight' ? bet.number === number : bet.type === color(number);
    return won ? bet.amount * (bet.type === 'straight' ? 36 : 2) : 0;
  }
  return { numbers, color, tau, normalize, randomIndex, targetRotation, validBet, payout };
})();
if (typeof module !== 'undefined') module.exports = Roulette;
