import { evaluateCurrencyExpression } from '../currencyCalculator';
import { formatAmountInput, formatCalculatorOperand } from '../currencyInput';

describe('calculator operand formatting', () => {
  it('groups values using the selected currency punctuation', () => {
    expect(formatCalculatorOperand('1234,56', 'BRL')).toBe('1.234,56');
    expect(formatCalculatorOperand('1234.56', 'USD')).toBe('1,234.56');
    expect(formatAmountInput(10000, 'BRL')).toBe('10.000,00');
    expect(formatAmountInput(10000, 'USD')).toBe('10,000.00');
  });

  it('shows only entered decimal digits and leaves empty operands blank', () => {
    expect(formatCalculatorOperand('7,', 'BRL')).toBe('7,');
    expect(formatCalculatorOperand('7', 'BRL')).toBe('7');
    expect(formatCalculatorOperand('', 'BRL')).toBe('');
    expect(formatCalculatorOperand('7.', 'USD')).toBe('7.');
  });
});

describe('currency calculator', () => {
  it.each([
    { name: 'multiplication', operands: ['7,00', '5,60'], operators: ['×'], expected: 39.2, currency: 'BRL' as const },
    { name: 'addition', operands: ['50,00', '12,50'], operators: ['+'], expected: 62.5, currency: 'BRL' as const },
    { name: 'subtraction', operands: ['200,00', '35,00'], operators: ['−'], expected: 165, currency: 'BRL' as const },
    { name: 'division', operands: ['100,00', '4,00'], operators: ['÷'], expected: 25, currency: 'BRL' as const },
    { name: 'operator precedence', operands: ['2,00', '3,00', '5,00'], operators: ['+', '×'], expected: 17, currency: 'BRL' as const },
    { name: 'left-to-right precedence for equal operators', operands: ['10,00', '3,00', '2,00'], operators: ['−', '−'], expected: 5, currency: 'BRL' as const },
    { name: 'USD decimal entry', operands: ['7.00', '5.60'], operators: ['×'], expected: 39.2, currency: 'USD' as const },
  ])('evaluates $name', ({ operands, operators, expected, currency }) => {
    expect(evaluateCurrencyExpression(operands, operators as ('+' | '−' | '×' | '÷')[], currency)).toBe(expected);
  });

  it('rounds half-cent results away from zero only at the final result', () => {
    expect(evaluateCurrencyExpression(['0,01', '2,00'], ['÷'], 'BRL')).toBe(0.01);
    expect(evaluateCurrencyExpression(['0,01', '2,00', '0,01'], ['÷', '−'], 'BRL')).toBe(-0.01);
  });

  it('returns no result for division by zero or incomplete expressions', () => {
    expect(evaluateCurrencyExpression(['100,00', '0'], ['÷'], 'BRL')).toBeNull();
    expect(evaluateCurrencyExpression(['7,00', ''], ['×'], 'BRL')).toBeNull();
  });

  it('rejects operands with more than two decimal places', () => {
    expect(evaluateCurrencyExpression(['1,234'], [], 'BRL')).toBeNull();
  });

  it('limits the expression length and operand size', () => {
    expect(evaluateCurrencyExpression(['1', ...Array(13).fill('1')], Array(13).fill('+'), 'USD')).toBeNull();
    expect(evaluateCurrencyExpression(['1'.repeat(19)], [], 'USD')).toBeNull();
  });
});
