import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathNumber, parseMathLabel, sumLabel } from '../components/MathNumber';
import { DefenseController } from '../logic/controller';
import type { EnergyDefenseProblem } from '../../../shared/math/generators';
test.each([['1/4',0,1,4],['5/4',0,5,4],['2 1/4',2,1,4],['2 + 1/4',2,1,4],['2 1/4 (2,25)',2,1,4]])('parses %s without the equivalent helper',(text,whole,num,den)=>{
  expect(parseMathLabel(text)).toEqual({kind:'fraction',whole,num,den});
  const html=renderToStaticMarkup(<MathNumber value={text}/>);expect(html).not.toContain('(2,25)');
});
test('decimal stays a single primary representation',()=>{expect(parseMathLabel('2,25')).toEqual({kind:'decimal',text:'2,25'});expect(parseMathLabel('1,25 (5/4)')).toEqual({kind:'decimal',text:'1,25'});});
test('mixed number renders separate whole and vertically stacked numerator/denominator with a clear accessible label',()=>{
  const html=renderToStaticMarkup(<MathNumber value="2 1/4 (2,25)"/>);
  expect(html).toContain('2 và 1 phần 4');expect(html).not.toContain('21/4');expect(html).not.toContain('(2,25)');expect(html).toContain('height:2px');
});
test('sums keep rational values and standard mixed display',()=>{
  expect(sumLabel({num:9,den:4},'hard')).toBe('2 1/4');expect(sumLabel({num:5,den:4},'medium')).toBe('1,25');expect(sumLabel({num:3,den:10},'easy')).toBe('0,3');
});

test.each([
  [0,1,'0'],[4,2,'2'],[11,4,'2,75'],[3,10,'0,3'],[13,8,'1,625'],
  [1,10000,'0,0001'],[3,6,'0,5'],[1,3,'1/3'],[7,6,'7/6'],[-1,8,'-0,125'],
])('decimal preference preserves exact %s/%s without rounding',(num,den,label)=>{
  expect(sumLabel({num,den},'medium',['0,10','0,20'])).toBe(label);
});

test('representation follows primary operands and ignores equivalent labels in parentheses',()=>{
  expect(sumLabel({num:11,den:4},'medium',['1,50 (3/2)','1,25 (5/4)'])).toBe('2,75');
  expect(sumLabel({num:5,den:4},'medium',['1/2 (0,50)','0,75 (3/4)'])).toBe('5/4');
  expect(sumLabel({num:9,den:4},'hard',['1 1/2','3/4'])).toBe('2 1/4');
  expect(sumLabel({num:2,den:1},'hard',['1/2','1 1/2'])).toBe('2');
});

test('1,50 + 1,25 presents 2,75 while the controller still grades exact 11/4',()=>{
  const problem:EnergyDefenseProblem={id:'decimal-display',difficulty:'medium',targetDisplay:'2,75 (11/4)',targetFraction:{num:11,den:4},targetNumeric:2.75,
    availablePieces:[{id:'a',display:'1,50 (3/2)',fraction:{num:3,den:2},numericVal:1.5},{id:'b',display:'1,25 (5/4)',fraction:{num:5,den:4},numericVal:1.25}],
    explanation:'',questionType:'hundredths_fractions',validCombosCount:1};
  const c=new DefenseController({problem:()=>problem});c.start();c.toggle('a');
  expect(c.fire()).toBe(false);expect(c.getSnapshot().score).toBe(0);
  c.toggle('b');const sum=c.selectedSum();
  expect(sum).toEqual({num:11,den:4});
  const label=sumLabel(sum,'medium',problem.availablePieces.map(p=>p.display));
  const html=renderToStaticMarkup(<MathNumber value={label}/>);
  expect(html).toContain('2,75');expect(html).not.toContain('11/4');expect(label).not.toContain('(');
  expect(c.fire()).toBe(true);expect(c.getSnapshot().score).toBe(25);expect(c.getSnapshot().correct).toBe(1);
  expect(c.selectedSum()).toEqual(sum);expect(problem.targetFraction).toEqual({num:11,den:4});
});
test('integer, decimal and fractional operands retain the same exact value',()=>{
  const p:EnergyDefenseProblem={id:'mixed',difficulty:'hard',targetDisplay:'2 1/4 (2,25)',targetFraction:{num:9,den:4},targetNumeric:2.25,
    availablePieces:[{id:'a',display:'1',fraction:{num:1,den:1},numericVal:1},{id:'b',display:'0,5',fraction:{num:1,den:2},numericVal:.5},{id:'c',display:'3/4',fraction:{num:3,den:4},numericVal:.75}],
    explanation:'',questionType:'mixed_combo',validCombosCount:1};
  const c=new DefenseController({problem:()=>p});c.start();for(const id of ['a','b','c'])c.toggle(id);
  expect(c.selectedSum()).toEqual({num:9,den:4});expect(c.fire()).toBe(true);
});
test('decimal addition uses exact fractions instead of floating-point rounding for answers',()=>{
  const problem:EnergyDefenseProblem={id:'exact',difficulty:'medium',targetDisplay:'0,3',targetFraction:{num:3,den:10},targetNumeric:.3,
    availablePieces:[{id:'a',display:'0,1',fraction:{num:1,den:10},numericVal:.1},{id:'b',display:'1/5',fraction:{num:1,den:5},numericVal:.2}],
    explanation:'',questionType:'hundredths_fractions',validCombosCount:1};
  const c=new DefenseController({problem:()=>problem});c.start();c.toggle('a');c.toggle('b');expect(c.selectedSum()).toEqual({num:3,den:10});expect(c.fire()).toBe(true);
});
