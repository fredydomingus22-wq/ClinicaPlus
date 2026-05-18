/**
 * Converte um número para a sua representação por extenso (Português de Angola)
 */
export function numberToWords(n: number): string {
  if (n === 0) return 'Zero Kwanzas';

  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function convertGroup(n: number): string {
    let res = '';
    if (n >= 100) {
      if (n === 100) return 'cem';
      res += hundreds[Math.floor(n / 100)];
      n %= 100;
      if (n > 0) res += ' e ';
    }
    if (n >= 20) {
      res += tens[Math.floor(n / 10)];
      n %= 10;
      if (n > 0) res += ' e ' + units[n];
    } else if (n >= 10) {
      res += teens[n - 10];
    } else if (n > 0) {
      res += units[n];
    }
    return res;
  }

  const integerPart = Math.floor(Math.abs(n));
  const decimalPart = Math.round((Math.abs(n) - integerPart) * 100);

  let result = '';
  
  if (integerPart > 0) {
    const millions = Math.floor(integerPart / 1000000);
    const thousands = Math.floor((integerPart % 1000000) / 1000);
    const remainder = integerPart % 1000;

    if (millions > 0) {
      result += convertGroup(millions) + (millions === 1 ? ' milhão' : ' milhões');
      if (thousands > 0 || remainder > 0) result += ' ';
    }
    if (thousands > 0) {
      if (thousands === 1) {
        result += 'mil';
      } else {
        result += convertGroup(thousands) + ' mil';
      }
      if (remainder > 0) result += ' ';
    }
    if (remainder > 0) {
      if (result !== '' && remainder < 100) result += ' e ';
      result += convertGroup(remainder);
    }
    
    result += integerPart === 1 ? ' Kwanza' : ' Kwanzas';
  }

  if (decimalPart > 0) {
    if (result !== '') result += ' e ';
    result += convertGroup(decimalPart) + (decimalPart === 1 ? ' Cêntimo' : ' Cêntimos');
  }

  return result.charAt(0).toUpperCase() + result.slice(1);
}
